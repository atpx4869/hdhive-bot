# HDHive Official API Doc Snapshot

> Source: https://hdhive.com/manager/api-docs
> Captured after login on 2026-05-05.

## Overview

HDHive OpenAPI 面向个人脚本、内部工具和第三方应用，提供资源查询、资源解锁、分享管理、用户信息和用量查询能力。

新版 OpenAPI 使用统一平台凭证：

- 个人 API Key：用户自己创建，适合个人脚本和自用自动化。
- OpenAPI 应用：管理员创建，适合第三方应用或合作方系统。
- 用户授权 Token：用户通过第三方应用授权后获得，代表具体用户执行业务操作。

### Basic Info

- 业务接口 Base URL：`/api/open`
- 用户授权接口 Base URL：`/api/public/openapi/oauth`
- 用户授权页：`/openapi/authorize`
- 认证方式：`X-API-Key` 必填，业务接口可附加 `Authorization: Bearer <token>`
- 响应格式：JSON
- 权限模型：应用 scope + 用户授权 scope + 用户身份共同决定可访问范围

## Interface Overview

### 用户授权接口

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/public/openapi/oauth/authorize` | 站内登录 Cookie | 授权页预览信息 |
| POST | `/api/public/openapi/oauth/authorize` | 站内登录 Cookie | 用户确认授权并生成授权码 |
| POST | `/api/public/openapi/oauth/token` | `X-API-Key` 应用 Secret | 授权码或刷新令牌换取用户 Token |
| POST | `/api/public/openapi/oauth/revoke` | `X-API-Key` 应用 Secret | 撤销刷新令牌 |

### 业务接口

| Scope | Method | Path | Description |
| --- | --- | --- | --- |
| meta | GET | `/api/open/ping` | 健康检查 |
| meta | GET | `/api/open/quota` | 查询当前凭证配额状态 |
| meta | GET | `/api/open/usage` | 查询历史用量 |
| meta | GET | `/api/open/usage/today` | 查询今日用量 |
| query | GET | `/api/open/resources/:type/:tmdb_id` | 根据 TMDB ID 获取资源列表 |
| query | GET | `/api/open/shares/:slug` | 获取分享详情 |
| query | POST | `/api/open/check/resource` | 检查资源链接类型 |
| unlock | POST | `/api/open/resources/unlock` | 解锁资源 |
| write | GET | `/api/open/shares` | 获取我的分享列表 |
| write | POST | `/api/open/shares` | 创建分享 |
| write | PATCH | `/api/open/shares/:slug` | 更新分享 |
| write | DELETE | `/api/open/shares/:slug` | 删除分享 |
| vip | GET | `/api/open/me` | 获取当前用户信息 |
| vip | POST | `/api/open/checkin` | 每日签到 |
| vip | GET | `/api/open/vip/weekly-free-quota` | 获取长期 Premium 每周免费解锁状态 |

## Key Business Endpoints

### GET `/api/open/ping`

验证 API Key 是否有效。

成功响应字段：
- `data.message`
- `data.api_key_id`
- `data.name`

### GET `/api/open/quota`

查询当前 API Key 的配额状态。

响应字段：
- `data.daily_reset`
- `data.endpoint_limit`
- `data.endpoint_remaining`

### GET `/api/open/usage`

查询历史用量。

请求参数：
- `start_date` (query)
- `end_date` (query)

响应字段：
- `data.daily_stats`
- `data.endpoint_stats`
- `data.summary`

### GET `/api/open/resources/:type/:tmdb_id`

根据媒体类型和 TMDB ID 获取资源列表。

请求参数：
- `type`：`movie` or `tv`
- `tmdb_id`

响应字段：
- `data[].slug`
- `data[].title`
- `data[].pan_type`
- `data[].share_size`
- `data[].video_resolution`
- `data[].source`
- `data[].subtitle_language`
- `data[].subtitle_type`
- `data[].unlock_points`
- `data[].is_unlocked`
- `data[].user`
- `meta.total`

### POST `/api/open/resources/unlock`

代表当前用户解锁资源并获取链接。

Body:
- `slug`

成功响应字段：
- `data.url`
- `data.access_code`
- `data.full_url`
- `data.already_owned`

错误响应：
- 400 / 400 参数无效
- 403 / `OPENAPI_USER_REQUIRED` 缺少用户身份
- 404 / 404 资源不存在
- 402 / `INSUFFICIENT_POINTS` 积分不足
- 429 / `RATE_LIMIT_EXCEEDED`

官方强调：
- unlock 接口保留用户阶梯风控
- 第三方应用触发时，处罚对象是当前授权用户，不是整个应用

### GET `/api/open/me`

获取当前用户信息。

官方要求：
- 需要 `vip` scope
- 并要求当前用户满足 Premium 条件

响应字段：
- `data.id`
- `data.nickname`
- `data.username`
- `data.email`
- `data.avatar_url`
- `data.is_vip`
- `data.user_meta`

### GET `/api/open/vip/weekly-free-quota`

获取当前用户长期 Premium 每周免费解锁状态。

响应字段：
- `is_forever_vip`
- `limit`
- `used`
- `remaining`
- `unlimited`
- `bonus_quota`
- `bonus_quota_max`

### GET `/api/open/shares/:slug`

获取指定分享详情。

官方明确说明：
- 该接口不返回资源下载链接和访问码
- 需要调用 unlock 接口解锁后获取

## Important Notes

1. 新版 OpenAPI 明确引入了 `scope` + 用户授权 Token 模型。
2. 部分业务接口（示例中包括 `resources/:type/:tmdb_id`、`unlock`）官方示例都带了：
   - `X-API-Key`
   - `Authorization: Bearer user-access-token`
3. 官方接口总览明确列出：
   - `/api/open/resources/:type/:tmdb_id` 属于 `query` scope
   - `/api/open/resources/unlock` 属于 `unlock` scope
   - `/api/open/me` 属于 `vip` scope
4. `share_size` 是 `string | null`
5. `/api/open/resources/:type/:tmdb_id` 的官方文档现在明确包含 `data[].pan_type`
6. `unlock` 的错误口径里新增了 `OPENAPI_USER_REQUIRED`
