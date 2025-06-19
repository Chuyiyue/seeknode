# Hono Telegram Bot on Cloudflare Workers

一个基于 Hono 和 Grammy 构建的 Telegram Bot，部署在 Cloudflare Workers 上。

## 功能

- 🤖 响应 `/start`, `/help`, `/info` 命令
- 💬 自动回复文本消息
- 📸 识别并回应图片消息
- ⚡ 基于 Webhook 的实时响应
- 🌐 部署在 Cloudflare Workers，全球加速

## 快速开始

### 1. 创建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按照提示设置机器人名称和用户名
4. 保存获得的 Bot Token

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

编辑 `wrangler.jsonc` 文件，取消注释并配置：

```jsonc
{
  "vars": {
    "BOT_TOKEN": "your-telegram-bot-token-here"
  }
}
```

或者使用 Cloudflare Dashboard 设置环境变量。

### 4. 本地开发

```bash
pnpm dev
```

### 5. 部署到 Cloudflare Workers

```bash
pnpm deploy
```

### 6. 设置 Webhook

部署成功后，需要设置 Telegram Webhook：

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-worker-url.your-subdomain.workers.dev/webhook"}'
```

将 `<YOUR_BOT_TOKEN>` 替换为你的 Bot Token，`your-worker-url.your-subdomain.workers.dev` 替换为你的 Worker URL。

## Bot 命令

- `/start` - 开始使用机器人
- `/help` - 显示可用命令
- `/info` - 显示用户信息

## 项目结构

```
hono-cf/
├── src/
│   └── index.ts          # Bot 主要逻辑
├── package.json          # 依赖配置
├── wrangler.jsonc        # Cloudflare Workers 配置
└── tsconfig.json         # TypeScript 配置
```

## 自定义功能

你可以在 `src/index.ts` 中添加更多 Bot 功能：

```typescript
// 添加新命令
bot.command('weather', (ctx) => {
  ctx.reply('今天天气不错！ ☀️')
})

// 处理特定文本
bot.hears('你好', (ctx) => {
  ctx.reply('你好！很高兴见到你！')
})
```

## 技术栈

- [Hono](https://hono.dev/) - 轻量级 Web 框架
- [Grammy](https://grammy.dev/) - Telegram Bot 框架
- [Cloudflare Workers](https://workers.cloudflare.com/) - 无服务器计算平台
- TypeScript - 类型安全的 JavaScript
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
