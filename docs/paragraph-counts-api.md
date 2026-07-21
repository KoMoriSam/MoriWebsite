# Paragraph Counts Batch API (Cloudflare Worker)

本方案用于实现“进入页面几乎瞬时显示全量段评数”。

## 1. 你需要做什么

1. 在 Cloudflare 新建一个 Worker。
2. 把 workers/paragraph-counts-worker.js 的代码粘进去。
3. 在 Worker 的环境变量里配置以下值：

- GITHUB_TOKEN: GitHub Personal Access Token（建议只读、专用）
- ALLOWED_ORIGIN: 你的站点域名，例如 https://komorisam.github.io
- ARTICLE_REPO_OWNER: KoMoriSam
- ARTICLE_REPO_NAME: theWake
- ARTICLE_CATEGORY_ID: DIC_kwDOTElB584C_2-9
- NOVEL_REPO_OWNER: KoMoriSam
- NOVEL_REPO_NAME: theHorizon
- NOVEL_CATEGORY_ID: DIC_kwDOOWZUk84C_2_D
- MAX_PAGES: 20（可选）

`ALLOWED_ORIGIN` 配置要点：

- 不要带尾部 `/`，例如使用 `https://komorisam.github.io`。
- 需要多个来源时可用逗号分隔，例如：
  `https://komorisam.github.io,http://localhost:5173`

### GITHUB_TOKEN 权限要求（重点）

如果你使用 Fine-grained PAT，请确保至少包含：

- Repository permissions -> Discussions: Read-only
- Metadata: Read-only（通常默认）

如果权限不足，接口会返回 500，错误内容常见为：

- GitHub GraphQL 请求失败：403
- Resource not accessible by personal access token

建议：

- 使用专用 token，不要复用日常 token。
- 修改权限后，重新在 Worker Secrets 中更新 GITHUB_TOKEN。

4. 部署后拿到 Worker URL，例如：

- https://paragraph-counts.xxx.workers.dev

5. 在前端环境变量中配置：

- COMMENT_COUNTS_API=https://paragraph-counts.xxx.workers.dev

6. 重新构建部署前端。

## 2. 接口约定

请求：POST /

body:
{
"sourceType": "article",
"paragraphIds": ["uuid-page-1", "uuid-page-3"]
}

响应：
{
"sourceType": "article",
"counts": {
"uuid-page-1": 3,
"uuid-page-3": 0
},
"cachedAt": 1750000000000
}

健康检查（GET /）：
{
"ok": true,
"service": "paragraph-counts-api",
"message": "Use POST with sourceType and paragraphIds."
}

## 3. 费用与成本

通常情况下，个人站点可做到接近 0 成本：

1. Cloudflare Worker

- 免费档一般可覆盖中小流量。
- 超出免费额度后才产生费用。

2. GitHub API

- 调用本身通常不直接收费，但有速率限制。
- Worker 里做缓存（当前默认 5 分钟）可显著降低调用频率。

3. 可能产生费用的场景

- 高并发访问导致 Worker 请求量超出免费额度。
- 你后续接入 KV/Durable Objects/Redis 并超出免费额度。

## 4. 安全建议

1. 不要把 GITHUB_TOKEN 放在前端。
2. Worker 限制 ALLOWED_ORIGIN 为你的站点域名。
3. Token 建议使用最小权限、专用账号或专用 token。

## 5. 当前前端行为

当 COMMENT_COUNTS_API 已配置且可用时：

- 页面会优先一次批量拉取段评计数并更新显示。
- 失败时才回退到 giscus metadata 模式。

## 6. 快速排错

1. 浏览器直接打开 Worker URL：

- 现在会返回健康检查 JSON（GET）。

2. 用 POST 测试：

```powershell
$body = @{ sourceType = "article"; paragraphIds = @("demo-1") } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://你的-worker.workers.dev/" -ContentType "application/json" -Body $body
```

3. 如果 POST 返回 500 且 message 包含 403：

- 优先检查 GITHUB_TOKEN 权限是否包含 Discussions: Read-only。
- 确认 token 没过期、没有被撤销。
- 若报错包含 "Please make sure your request has a User-Agent header"，请确认 Worker 代码已包含 `User-Agent` 请求头并已重新部署。
