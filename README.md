# HDHive Telegram Bot

一个基于 **HDHive Open API** 的 Telegram 资源搜索机器人。  
支持：

- 白名单用户访问
- 资源搜索
- 候选影视选择（电影 / 剧集）
- 115 网盘资源优先展示
- 阿里云盘资源折叠统计
- 私聊内直接解锁资源
- 管理员查看账号与额度
- 管理员维护白名单用户
- Inline Mode 候选影视选择

---

## 1. 功能概览

### 普通白名单用户
- `/start`
- `/help`
- 直接发送关键词搜索
- `/search 关键词`（兼容保留）
- 查看候选影视
- 查看 115 资源列表
- 私聊中点击序号按钮直接解锁
- 使用 inline mode 搜索

### 管理员
拥有普通用户全部能力，另外还可以：

- `/me` 查看账号状态
- `/quota` 查看额度信息
- `/user_add <telegram_user_id>` 添加白名单用户
- `/user_del <telegram_user_id>` 删除白名单用户
- `/user_list` 查看白名单用户列表

---

## 2. 项目特点

- **极简权限模型**：管理员 / 白名单用户
- **115 优先展示**：主列表默认只展示 115 网盘资源
- **阿里云盘折叠**：默认不占主列表分页，但用户可手动展开查看阿里云盘资源
- **不做过度去重**：保留不同用户上传的不同版本资源
- **阶段化加载提示**：搜索、拉取资源、识别网盘时有明确提示
- **代理支持**：本地开发可走代理，VPS 可直连
- **启动预检**：Telegram / TMDB / HDHive 连通性检查

---

## 3. 命令说明

### 所有白名单用户可用

| 命令 | 说明 |
|---|---|
| `/start` | 显示欢迎页 |
| `/help` | 显示帮助与示例 |
| `/search 关键词` | 搜索资源（兼容命令形式） |
| `/ping` | 健康检查 |

### 仅管理员可用

| 命令 | 说明 |
|---|---|
| `/me` | 查看 HDHive 账号状态 |
| `/quota` | 查看额度信息 |
| `/user_add <telegram_user_id>` | 添加白名单用户 |
| `/user_del <telegram_user_id>` | 删除白名单用户 |
| `/user_list` | 查看白名单 |
| `/set_forward_bot @example_bot` | 设置转存 Bot 用户名 |
| `/show_forward_bot` | 查看当前转存 Bot |
| `/set_api_mode auto|manual` | 切换 API Key 策略模式 |
| `/set_active_api_key 1` | 手动切换当前 Active Key |

---

## 4. Telegram 命令菜单

程序启动后会自动调用 Telegram 的 `setMyCommands` 注册命令菜单。  
也就是在 Telegram 输入框左侧点击 `/` 时，会直接看到可用命令。

### 普通用户默认看到
- `/start`
- `/help`
- `/search`
- `/ping`

### 管理员额外看到
- `/me`
- `/quota`
- `/user_add`
- `/user_del`
- `/user_list`

管理员命令会按 `BOT_ADMIN_IDS` 逐个用户单独注册，不会暴露给普通白名单用户。

如果你修改了命令定义，重启 bot 后即可刷新：

```bash
npm run dev
```

或：

```bash
pm2 restart hdhive-bot
```

---

## 5. 交互流程

### 搜索流程
1. 用户直接发送关键词（也支持 `/search 关键词`）
2. Bot 先搜索 TMDB 候选影视
3. 用户从候选中选择 **电影 / 剧集**
4. Bot 拉取 HDHive 资源列表
5. Bot 优先展示 **115 网盘资源**
6. 如果存在阿里云盘资源，用户可点击按钮切换查看
7. 用户点击资源序号按钮直接解锁

### 解锁流程
- 仅允许 **私聊中解锁**
- 点击序号按钮后直接解锁
- 成功时返回：
  - 资源链接
  - 访问码 / 提取码（如有）
- 如果已配置转存 Bot，会额外显示 `打开转存Bot` 按钮

### Inline Mode
可在任意聊天中使用：

```text
@Bot 关键词
```

Inline 模式会先返回 **TMDB 候选影视条目**。  
用户选择具体电影 / 剧集后，可在当前聊天中**原地展开资源列表**，并继续分页、切换查看阿里云盘资源、直接解锁。

---

## 6. 本地开发

### 6.1 安装依赖

```bash
npm install
```

### 6.2 复制配置

```bash
cp .env.example .env
```

### 6.3 编辑 `.env`

示例（本地开发）：

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
BOT_USERNAME=jzrm_115_SerchBot
DEFAULT_API_KEY=your_hdhive_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
BOT_ADMIN_IDS=7944617802
DATABASE_PATH=./data/bot.db
OUTBOUND_PROXY_URL=http://127.0.0.1:7890
FORWARD_BOT_USERNAME=@example_bot
```

### 6.4 启动

```bash
npm run dev
```

### 6.5 本地检查

私聊 bot 后测试：

```text
/ping
/start
/help
/search 仙逆
仙逆
```

---

## 7. 环境变量说明

| 变量 | 说明 |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token（来自 @BotFather） |
| `BOT_USERNAME` | Bot 用户名，不带 `@` |
| `DEFAULT_API_KEY` | HDHive Premium API Key |
| `TMDB_API_KEY` | TMDB API Key |
| `BOT_ADMIN_IDS` | 管理员 Telegram User ID，多个用逗号分隔 |
| `DATABASE_PATH` | SQLite 文件路径，默认 `./data/bot.db` |
| `OUTBOUND_PROXY_URL` | 可选代理地址。本地需要代理时填写，VPS 通常留空 |
| `FORWARD_BOT_USERNAME` | 可选，默认转存 Bot 用户名，例如 `@example_bot` |

> 获取自己的 Telegram User ID：可私聊 `@userinfobot`

---

## 8. 启动预检

程序启动时会自动检查：

1. Telegram Bot API
2. TMDB API
3. HDHive
4. grammY 自身 `getMe`

如果其中任意一项失败，程序会直接退出并打印错误日志，方便排查。

---

## 9. BotFather 配置

建议检查以下设置：

### 9.1 Inline Mode
开启：

- `/setinline`

### 9.2 Privacy Mode
如果希望在群聊中更自然地接收命令，可检查：

- `/setprivacy`

> 当前主要推荐私聊使用，群聊里更适合用 inline mode。

---

## 10. VPS 部署（PM2）

### 10.1 安装 Node.js

推荐 Node 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 10.2 安装 PM2

```bash
sudo npm install -g pm2
```

### 10.3 上传项目

例如上传到：

```bash
/opt/hdhive-bot
```

### 10.4 安装依赖

```bash
cd /opt/hdhive-bot
npm install
```

### 10.5 生产环境 `.env`

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
BOT_USERNAME=jzrm_115_SerchBot
DEFAULT_API_KEY=your_hdhive_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
BOT_ADMIN_IDS=7944617802
DATABASE_PATH=./data/bot.db
OUTBOUND_PROXY_URL=
FORWARD_BOT_USERNAME=@example_bot
```

### 10.6 先直接运行一次

```bash
npm run start
```

确认日志正常后，按 `Ctrl + C` 停止。

### 10.7 使用 PM2 启动

```bash
bash scripts/deploy.sh
```

脚本会自动完成：

- 检查 `.env`
- `git fetch origin main`
- 如果发现远端有更新，提示是否 `git pull`
- `npm install`
- `npx tsc --noEmit`
- 删除旧的 `hdhive-bot` 进程（如存在）
- 重新 `pm2 start ecosystem.config.cjs`
- `pm2 save`

如果是第一次设置 PM2 开机自启，还需要执行：

```bash
pm2 startup
pm2 save
```

### 10.8 查看日志

```bash
pm2 logs hdhive-bot
```

---

## 11. Docker 部署（可选）

项目已包含：

- `Dockerfile`
- `docker-compose.yml`

启动方式：

```bash
docker compose up -d --build
docker compose logs -f
```

---

## 12. 数据持久化

当前使用 SQLite：

```text
./data/bot.db
```

主要保存：
- 白名单用户数据

注意：
- 不要删除 `data/bot.db`
- Docker 部署时要确保 `./data` 已挂载 volume

---

## 13. 常见问题排查

### 13.1 `/ping` 没反应
优先检查：

1. `TELEGRAM_BOT_TOKEN` 是否正确
2. `BOT_USERNAME` 是否填写真实用户名（不是显示名称）
3. 是否私聊了正确的 bot
4. 日志里是否出现 `[Update]`
5. 本地是否需要配置代理

### 13.2 启动卡住或退出
查看日志：

```bash
pm2 logs hdhive-bot --lines 100
```

重点看：
- Telegram 预检是否成功
- grammY `getMe` 是否成功
- 是否存在代理超时

### 13.3 搜索无结果
可能原因：
- TMDB 没找到候选影视
- HDHive 当前没有资源
- 当前候选下没有可展示的 115 资源

### 13.4 会话已过期
当前 session 支持滑动续期，但仍可能因长时间不操作过期。  
此时直接重新发送：

```text
/search 关键词
```

### 13.5 解锁失败
常见原因：
- 积分不足
- 资源已失效
- 非私聊场景尝试解锁
- HDHive 接口暂时异常

---

## 14. 更新部署

### PM2

```bash
cd /opt/hdhive-bot
bash scripts/deploy.sh
```

推荐后续也统一使用 `deploy.sh`，因为它已经内置了更新逻辑。  
也就是说，无论是**首次部署**还是**后续更新**，都可以执行：

```bash
bash scripts/deploy.sh
```

它会自动完成：

- `git fetch origin main`
- 检查是否有新提交
- 如有更新，询问是否执行 `git pull`
- `npm install`
- `npx tsc --noEmit`
- 删除旧进程并重新创建 PM2 进程
- `pm2 save`

### 兼容入口

`update.sh` 仍然保留，但现在只是 `deploy.sh` 的别名：

```bash
bash scripts/update.sh
```

### Docker

```bash
docker compose down
docker compose up -d --build
```

---

## 15. 当前设计取舍

### 已采用
- 白名单用户模型
- 管理员固定配置
- 私聊直接解锁
- 115 主列表优先展示
- 阿里云盘默认折叠，可手动展开查看
- 转存 Bot 支持 `.env` 默认值 + 管理员运行时设置
- API Key 支持 `auto/manual` 两种模式，并可在 TG 面板切换 Active Key
- 不做资源强行去重

### 暂不做
- 115 一键转存
- 复杂权限模型
- 用户级 115 账号绑定
- 复杂缓存系统

---

## 16. 技术栈

- Node.js
- TypeScript
- grammY
- Axios
- better-sqlite3
- PM2 / Docker

---

## 17. License

当前项目未单独声明 License，如需开源请补充。
