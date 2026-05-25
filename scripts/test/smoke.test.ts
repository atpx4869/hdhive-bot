/**
 * 冒烟测试：覆盖本轮硬化里最容易回归的路径。
 * 不依赖任何测试框架，使用 Node 内置 node:test 运行：
 *
 *   pnpm dlx tsx --test scripts/test/smoke.test.ts
 *   # 或
 *   npx tsx --test scripts/test/smoke.test.ts
 *
 * 测试会：
 *  1. 把 DATABASE_PATH 切到临时文件，确保不污染真实库。
 *  2. 把 .env 必填项注入 process.env，让 src/config/env.ts 能加载。
 *  3. 显式断言各服务/仓储的行为。
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---- 必须在 import 任何业务模块之前注入环境 ----
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hdhive-smoke-'));
const dbPath = path.join(tmpDir, 'bot.db');
const envPath = path.join(tmpDir, '.env');
// 写一个干净的 .env，让 writeEnvDefaultApiKey 有目标文件可写
fs.writeFileSync(envPath, 'DEFAULT_API_KEY=cold_start_key\n', 'utf8');

process.env.TELEGRAM_BOT_TOKEN = 'test:token';
process.env.BOT_USERNAME = 'test_bot';
process.env.DEFAULT_API_KEY = 'cold_start_key';
process.env.TMDB_API_KEY = 'tmdb_test';
process.env.BOT_ADMIN_IDS = '12345, abc, 67890,   ,99999';  // 混合：合法/非法/空白
process.env.DATABASE_PATH = dbPath;

// writeEnvDefaultApiKey 用 process.cwd() 拼 .env 路径，临时把 cwd 切到 tmpDir
const originalCwd = process.cwd();
process.chdir(tmpDir);

// 动态 import 业务模块（必须在 env 写好之后）
const { env } = await import('../../src/config/env.js');
const { apiKeyConfigService } = await import('../../src/services/api-key-config.service.js');
const { sessionService } = await import('../../src/services/session.service.js');
const { botUserService } = await import('../../src/services/bot-user.service.js');
const { botUserRepository, closeDb } = await import('../../src/repositories/bot-user.repository.js');
const { authService } = await import('../../src/services/auth.service.js');

after(() => {
  try { closeDb(); } catch { /* ignore */ }
  process.chdir(originalCwd);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ---------- env.ts ----------
test('env: BOT_ADMIN_IDS 只保留纯数字条目', () => {
  assert.deepEqual(env.BOT_ADMIN_IDS, ['12345', '67890', '99999']);
});

// ---------- api-key-config.service ----------
test('apiKeyConfig: setPrimaryApiKeys 空值返回 { ok: false, reason: "empty" }', () => {
  const r1 = apiKeyConfigService.setPrimaryApiKeys('');
  assert.deepEqual(r1, { ok: false, reason: 'empty' });

  const r2 = apiKeyConfigService.setPrimaryApiKeys('   ,  ,\n');
  assert.deepEqual(r2, { ok: false, reason: 'empty' });
});

test('apiKeyConfig: setPrimaryApiKeys 正常写入并同步首把到 .env', () => {
  const r = apiKeyConfigService.setPrimaryApiKeys('key_a,key_b,key_c');
  assert.equal(r.ok, true);
  assert.deepEqual((r as { ok: true; keys: string[] }).keys, ['key_a', 'key_b', 'key_c']);

  // .env 中 DEFAULT_API_KEY 应被替换为首把
  const envContent = fs.readFileSync(envPath, 'utf8');
  assert.match(envContent, /^DEFAULT_API_KEY=key_a$/m);

  const state = apiKeyConfigService.getRotationState();
  assert.deepEqual(state.primaryKeys, ['key_a', 'key_b', 'key_c']);
});

test('apiKeyConfig: setActiveKeyByIndex 不会改写 .env（关键回归点）', () => {
  // 先把 .env 写为已知值
  fs.writeFileSync(envPath, 'DEFAULT_API_KEY=key_a\n', 'utf8');

  const before = fs.readFileSync(envPath, 'utf8');
  const selected = apiKeyConfigService.setActiveKeyByIndex(2);  // key_c
  assert.equal(selected, 'key_c');

  const after = fs.readFileSync(envPath, 'utf8');
  assert.equal(after, before, '切换 Active 不应该回写 .env');

  // 但 sqlite 中的 active 应已切换
  const state = apiKeyConfigService.getRotationState();
  assert.equal(state.activeKey, 'key_c');
});

test('apiKeyConfig: addPrimaryKey 追加（非首把）不改 .env', () => {
  fs.writeFileSync(envPath, 'DEFAULT_API_KEY=key_a\n', 'utf8');
  const before = fs.readFileSync(envPath, 'utf8');

  const r = apiKeyConfigService.addPrimaryKey('key_d');
  assert.ok(r);
  assert.equal(r!.totalCount, 4);

  const after = fs.readFileSync(envPath, 'utf8');
  assert.equal(after, before, '追加非首把不应回写 .env');
});

test('apiKeyConfig: deletePrimaryKeyByIndex 删除非首把不改 .env', () => {
  fs.writeFileSync(envPath, 'DEFAULT_API_KEY=key_a\n', 'utf8');
  const before = fs.readFileSync(envPath, 'utf8');

  const r = apiKeyConfigService.deletePrimaryKeyByIndex(1);  // 删 key_b
  assert.ok(r);
  assert.equal(r!.deletedKey, 'key_b');

  const after = fs.readFileSync(envPath, 'utf8');
  assert.equal(after, before, '删除非首把不应回写 .env');
});

test('apiKeyConfig: deletePrimaryKeyByIndex 删除首把会改 .env 为新首把', () => {
  // 当前列表大概是 [key_a, key_c, key_d]
  fs.writeFileSync(envPath, 'DEFAULT_API_KEY=key_a\n', 'utf8');
  const r = apiKeyConfigService.deletePrimaryKeyByIndex(0);
  assert.ok(r);
  assert.equal(r!.deletedKey, 'key_a');

  const envContent = fs.readFileSync(envPath, 'utf8');
  assert.doesNotMatch(envContent, /DEFAULT_API_KEY=key_a/);
  // 新首把（key_c 或者 key_d，取决于剩下顺序）应被写入
  const state = apiKeyConfigService.getRotationState();
  assert.match(envContent, new RegExp(`^DEFAULT_API_KEY=${state.primaryKeys[0]}$`, 'm'));
});

// ---------- session.service ----------
test('sessionService: 跨用户读取 session 返回 null', () => {
  const sid = sessionService.createCandidateSession({
    telegramUserId: '12345',
    query: 'fight club',
    candidates: [],
  });

  // 同一 user 读取 ok
  const ok = sessionService.getCandidateSession(sid, '12345');
  assert.ok(ok);

  // 其他 user 读取应返回 null
  const denied = sessionService.getCandidateSession(sid, '99999');
  assert.equal(denied, null);

  // 不传 ownerUserId 时保持向后兼容，应能拿到
  const compat = sessionService.getCandidateSession(sid);
  assert.ok(compat);
});

// ---------- bot-user / auth ----------
test('botUserService: addUser 捕获 username/firstName/lastName 并写库', () => {
  const r = botUserService.addUser({
    telegramUserId: '777',
    username: 'alice',
    firstName: 'Alice',
    lastName: 'Wong',
  });
  assert.equal(r.success, true);

  const u = botUserRepository.findByTelegramUserId('777');
  assert.ok(u);
  assert.equal(u!.username, 'alice');
  assert.equal(u!.firstName, 'Alice');
  assert.equal(u!.lastName, 'Wong');
});

test('botUserService: touchMetadata 字段不变时返回 false 不写库', () => {
  const changed1 = botUserService.touchMetadata('777', {
    username: 'alice',
    firstName: 'Alice',
    lastName: 'Wong',
  });
  assert.equal(changed1, false, '相同字段不应触发 UPDATE');

  const changed2 = botUserService.touchMetadata('777', {
    username: 'alice_new',
  });
  assert.equal(changed2, true, '变化字段应触发 UPDATE');

  const u = botUserRepository.findByTelegramUserId('777');
  assert.equal(u!.username, 'alice_new');
  assert.equal(u!.firstName, 'Alice', '未提供的字段应保持原值');
});

test('auth.service: BOT_ADMIN_IDS 命中的是 ADMIN，未命中但有白名单是 USER，否则 null', () => {
  assert.deepEqual(authService.resolveIdentity('12345'), {
    telegramUserId: '12345',
    role: 'ADMIN',
  });

  assert.deepEqual(authService.resolveIdentity('777'), {
    telegramUserId: '777',
    role: 'USER',
  });

  assert.equal(authService.resolveIdentity('00000'), null);
});

test('botUserService: removeUser 物理删除', () => {
  const r = botUserService.removeUser('777');
  assert.equal(r.success, true);
  assert.equal(botUserRepository.findByTelegramUserId('777'), null);
});

before(() => {
  // 简单的开始提示
  console.log('---- hdhive-bot smoke test ----');
  console.log('tmp dir =', tmpDir);
});
