# OpenPrompt Studio 部署

## 服务器部署（启用 GPT-5.6 Luna）

要求：Node.js 20 或更高版本。

1. 解压源码包并进入项目目录。
2. 复制 `.env.example` 为 `.env`。
3. 在 `.env` 中填写 `OPENAI_API_KEY`，保留 `OPENAI_MODEL=gpt-5.6-luna`。
4. 运行：

   ```bash
   npm install
   npm run start:prod
   ```

服务默认监听 `39011` 端口，也可通过 `.env` 中的 `PORT` 修改。Express 会同时提供前端页面和 `/api/visual-recipe`，OpenAI API 密钥只保存在服务器端。

## 静态部署

将部署包中的 `dist` 目录发布到 Nginx、Cloudflare Pages、GitHub Pages 或其他静态托管服务即可。静态部署没有服务端 API，因此“生成视觉配方”会自动使用本地备用配方；提示词库的 255 条内容仍然完整可用。

## Nginx 反向代理示例

```nginx
location / {
    proxy_pass http://127.0.0.1:39011;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
