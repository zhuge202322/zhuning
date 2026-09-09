# SEO 与 AI SEO VPS 部署

## 必需环境变量

在 VPS 的进程管理器、`.env.local` 或安全的 secret 管理器中设置：

```dotenv
DATABASE_URL="file:./prisma/dev.db"
ADMIN_JWT_SECRET="使用至少 32 字符的随机值"
ANALYTICS_IP_SECRET="使用另一个随机值"
SITE_URL="https://你的正式域名"
```

`ADMIN_JWT_SECRET` 同时用于管理员 session 和 AI API Key 加密。部署后不要随意修改，否则已经保存的 AI API Key 将无法解密。需要轮换该 secret 时，先在后台重新输入并保存 API Key。

## AI SEO 配置

默认接口和模型如下，均可在后台“AI SEO 优化”中修改：

```dotenv
AI_API_ENDPOINT="https://zjapi.com/v1/chat/completions"
AI_MODEL="gpt-5.6-sol"
AI_API_KEY=""
```

推荐保持 `AI_API_KEY` 为空，部署后登录 `/admin/ai-seo` 输入 Key。Key 会使用 AES-256-GCM 加密后存入 SQLite；后台接口只返回是否已配置和末四位提示，不返回明文。

真实 API Key 不得提交到 GitHub。曾经在聊天、日志或截图中公开过的 Key 应在中转平台作废并重新生成。

## 更新数据库与构建

```bash
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm run build
pnpm run start
```

SQLite 数据库和 `public/uploads` 必须放在持久化磁盘，并纳入服务器备份。不要在多个 Node 实例之间同时写同一个 SQLite 文件；当前架构适合单实例 VPS。

## 上线检查

1. 在“网站设置 > 全局 SEO”填写正式站点 URL、默认标题、描述、关键词和分享图。
2. 打开 `/robots.txt`，确认 Sitemap 和 Host 使用正式域名。
3. 打开 `/sitemap.xml`，确认公开产品 URL 可访问，且没有后台、账户和询盘 URL。
4. 在 `/admin/ai-seo` 保存 API 配置，刷新页面确认只显示 Key 末四位。
5. 先选择一个测试产品生成草稿，人工审核后保存，再检查产品页源代码中的 title、description、canonical、Open Graph 和 Product JSON-LD。
6. 批量生成一次最多 20 条，已有 SEO 默认跳过；需要重做时才启用覆盖。

## 搜索引擎提交

网站上线并确认正式域名后，将 `https://你的正式域名/sitemap.xml` 提交到 Google Search Console 和 Bing Webmaster Tools。不要提交开发地址、IP 地址或带筛选参数的产品列表 URL。
