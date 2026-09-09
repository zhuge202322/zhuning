# SEO 与 AI SEO 管理设计

## 目标

为 Muxcor Crimson Drop Luxury 商城补齐可部署到 VPS 的 SEO 基础设施，并在中文后台增加 AI SEO 优化功能。前台继续使用英文内容；后台管理员可以为产品、产品类目、文章和静态页面生成、审核、修改和保存 SEO 内容。

本功能不自动把 AI 输出直接发布到公开站点。AI 结果先作为可编辑草稿返回，管理员确认后才写入 SQLite。

## 已确认约束

- AI 服务使用 OpenAI 兼容的 Chat Completions 接口。
- 默认接口为用户提供的中转地址，模型为用户提供的模型；具体 API key 不写入源码、Git 历史、前端代码或普通日志。
- API key 在后台可设置和修改，并且只能由服务端读取。
- 配置持久化在 SQLite，API key 加密保存。
- 前台和 SEO 输出为英文，后台界面为中文。
- 当前项目保留 SQLite、Next.js App Router、Prisma 和现有管理员鉴权体系。

## 方案

### AI 配置

新增单行 `AiProviderConfig` 表，字段包括：

- `id`、`endpoint`、`model`
- `encryptedApiKey`、`keyHint`
- `enabled`、`createdAt`、`updatedAt`

API key 使用 `ADMIN_JWT_SECRET` 派生 AES-256-GCM 加密密钥，密文携带随机 nonce 和 authentication tag。数据库只保存加密值和末四位提示信息。若 `ADMIN_JWT_SECRET` 缺失，AI 配置保存和调用均拒绝，避免降级为明文存储。

后台 GET 接口只返回 endpoint、model、enabled、是否已配置和 keyHint，不返回明文 key。PUT 接口允许管理员替换 key；空 key 表示保留现有 key，明确的清除操作才会删除配置。endpoint 只允许 HTTPS URL，模型和请求参数有长度限制。

可选环境变量 `AI_API_ENDPOINT`、`AI_MODEL`、`AI_API_KEY` 只作为首次初始化或 VPS 运维兜底，不在页面中展示，也不覆盖数据库中已有配置。代码和示例环境文件中不放真实 key。

### SEO 数据

新增通用 `SeoMeta` 表，以 `targetType + targetKey` 唯一定位 SEO 内容：

- `targetType`: `SITE`、`PAGE`、`PRODUCT`、`CATEGORY`、`POST`
- `targetKey`: 页面 key、产品 slug、类目 slug 或文章 slug
- `title`、`description`、`keywords`
- `canonicalUrl`、`ogImage`
- `robots`、`createdAt`、`updatedAt`

这样不需要把 SEO 字段重复添加到产品、分类和文章表，同时支持以后增加新的内容类型。后台的普通 SEO 编辑和 AI 生成结果都通过同一套校验与保存接口写入。

全局站点设置继续复用 `SiteSetting`，增加 SEO 组：站点标题、默认描述、关键词、站点 URL、默认分享图和 Twitter/X 账号。站点 URL 优先使用后台配置，其次使用 `SITE_URL`，开发环境最后回退到当前请求 origin。

### AI 生成流程

1. 管理员在“AI SEO 优化”页面选择内容类型和目标对象。
2. 服务端读取对象的英文名称、分类、材质、描述、已有图片和业务信息，并限制输入长度。
3. 服务端构造带明确边界的英文 SEO 指令，要求 AI 只返回固定 JSON：`title`、`description`、`keywords`、`ogImage`。
4. 调用配置的 OpenAI 兼容 endpoint，设置超时和响应大小上限。
5. 服务端解析普通 JSON 或 JSON fenced block，校验字段类型、长度和媒体 URL；不符合格式时返回可理解的错误。
6. 后台显示“原内容 / AI 草稿”对照编辑区，管理员可以修改并保存。
7. 批量生成由后台显式触发，单批最多 20 项，逐项处理并返回成功、失败和跳过结果；已有 SEO 内容默认跳过，管理员选择覆盖后才生成。

产品详情页使用产品 SEO 内容；类目页使用类目 SEO 内容；文章和静态页面使用相应目标记录；缺少自定义值时使用安全的站点默认值和现有正文内容生成 fallback metadata。

### 公开 SEO 输出

- 根布局使用动态 `generateMetadata` 输出站点标题、描述、metadataBase、Open Graph 和 Twitter Card。
- 产品详情页输出动态 title、description、canonical、Open Graph 图片和 Product JSON-LD。
- 产品列表/类目页输出类目相关 title、description、canonical；筛选和分页 URL 默认使用 `noindex,follow`，避免重复内容。
- 文章和静态页面输出对应 SEO 记录。
- 新增 `app/robots.ts` 和 `app/sitemap.ts`，只列出公开页面、产品、类目和文章；不列出后台、账号、询盘和筛选分页 URL。
- JSON-LD 使用序列化数据，不把用户输入拼成 HTML，避免脚本注入。

## 接口边界

新增后台接口：

- `GET/PUT /api/admin/ai-seo/config`：读取脱敏配置、保存配置。
- `POST /api/admin/ai-seo/generate`：生成单条或最多 20 条 SEO 草稿，不自动保存。
- `GET/PUT /api/admin/seo`：读取和保存已审核的 SEO 内容。

所有接口先通过现有 `requireAdmin`，统一使用 JSON 错误响应和输入校验。AI endpoint 请求失败、超时、非 2xx、余额/限流错误和模型返回非法 JSON 都不写入数据库，并向后台返回不包含 key 的诊断信息。

## 后台界面

新增“AI SEO 优化”菜单和页面：

- 配置面板：接口地址、模型、API key、启用开关、保存结果。
- 内容选择器：产品、类目、文章、静态页面。
- SEO 编辑器：标题、描述、关键词、分享图、canonical、robots。
- “生成 SEO 草稿”“保存 SEO”“批量生成”按钮。
- 显示字符长度、生成状态、错误信息和最后更新时间。
- API key 输入框使用 password 类型，已配置时显示脱敏提示，不回填旧值。

## 安全与失败处理

- API key 只存在服务端请求和加密数据库字段中，禁止进入 React props、浏览器响应、URL、异常堆栈和日志。
- 外部 endpoint 必须为 HTTPS；请求使用固定 header 和 JSON body，不支持由管理员输入任意 header。
- 产品描述等内容视为不可信输入，放入明确的数据区块，不允许其改变系统指令。
- 生成接口限制单次数量、输入总长度、响应长度和超时时间，避免费用失控和长请求占用 VPS。
- AI 生成失败不影响网站现有 SEO；保存失败保留编辑器草稿，不覆盖旧记录。
- 前台 URL 和 metadata 中不输出管理员路径、内部数据库 ID 或 API 配置。

## 测试与验收

新增单元测试覆盖：

- AI 配置校验、加密/解密、错误 secret 和 key 脱敏。
- AI 响应 JSON 解析、长度限制、非法字段和媒体 URL 校验。
- SEO fallback、canonical、robots 和 sitemap URL 生成。

验证流程包括：

- TypeScript 检查和生产构建。
- 访问首页、产品页、类目页、产品详情页，检查 `<title>`、description、canonical、OG 和 JSON-LD。
- 在后台保存配置，确认重新加载后 key 仍显示为已配置但无法读出。
- 生成草稿、修改并保存，确认前台 metadata 更新。
- 批量生成失败项可单独重试，旧 SEO 内容不会被意外覆盖。

## 不在本次范围

- 不接入支付、物流或自动发布工作流。
- 不把 API key 上传到第三方以外的服务。
- 不将 AI 生成任务做成后台队列或定时任务；后续如果产品数量继续大幅增加，再引入持久化任务队列。
