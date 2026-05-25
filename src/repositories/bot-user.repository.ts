import Database from 'better-sqlite3';
import { env } from '../config/env.js';
import type { BotUser, AddBotUserInput } from '../types/bot.js';
import fs from 'fs';
import path from 'path';

function getDb(): Database.Database {
  const dbPath = env.DATABASE_PATH;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);

  // 注：保留 enabled 列以兼容旧库，但代码不再依赖它（白名单 = 行存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS bot_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id TEXT NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  return db;
}

const db = getDb();

export function closeDb(): void {
  try {
    db.close();
  } catch {
    // 关闭过程中的错误吞掉即可
  }
}

function rowToUser(row: Record<string, unknown>): BotUser {
  return {
    id: row.id as number,
    telegramUserId: row.telegram_user_id as string,
    username: row.username as string | null,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const botUserRepository = {
  findByTelegramUserId(telegramUserId: string): BotUser | null {
    const row = db
      .prepare('SELECT * FROM bot_users WHERE telegram_user_id = ?')
      .get(telegramUserId) as Record<string, unknown> | undefined;
    return row ? rowToUser(row) : null;
  },

  listUsers(): BotUser[] {
    const rows = db
      .prepare('SELECT * FROM bot_users ORDER BY created_at DESC')
      .all() as Record<string, unknown>[];
    return rows.map(rowToUser);
  },

  create(input: AddBotUserInput): BotUser {
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO bot_users (telegram_user_id, username, first_name, last_name, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(
      input.telegramUserId,
      input.username ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      now,
      now,
    );
    const row = db
      .prepare('SELECT * FROM bot_users WHERE id = ?')
      .get(info.lastInsertRowid) as Record<string, unknown>;
    return rowToUser(row);
  },

  delete(telegramUserId: string): boolean {
    const info = db
      .prepare('DELETE FROM bot_users WHERE telegram_user_id = ?')
      .run(telegramUserId);
    return info.changes > 0;
  },

  /**
   * 更新已存在用户的 Telegram 资料（username / first_name / last_name）。
   * 仅当字段非空且与库内不同时才会写入，避免每条消息都打数据库。
   * 返回是否真正写入了一行。
   */
  updateMetadata(telegramUserId: string, fields: {
    username?: string | null | undefined;
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
  }): boolean {
    const current = this.findByTelegramUserId(telegramUserId);
    if (!current) return false;

    const nextUsername = fields.username ?? current.username;
    const nextFirstName = fields.firstName ?? current.firstName;
    const nextLastName = fields.lastName ?? current.lastName;

    if (
      nextUsername === current.username &&
      nextFirstName === current.firstName &&
      nextLastName === current.lastName
    ) {
      return false;
    }

    const now = new Date().toISOString();
    const info = db
      .prepare(`
        UPDATE bot_users
        SET username = ?, first_name = ?, last_name = ?, updated_at = ?
        WHERE telegram_user_id = ?
      `)
      .run(nextUsername, nextFirstName, nextLastName, now, telegramUserId);
    return info.changes > 0;
  },

  getSetting(key: string): string | null {
    const row = db
      .prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?')
      .get(key) as { setting_value?: string | null } | undefined;
    return row?.setting_value ?? null;
  },

  setSetting(key: string, value: string): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO app_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = excluded.updated_at
    `).run(key, value, now);
  },
};
