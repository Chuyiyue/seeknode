import { Hono } from 'hono'
import { Bot, webhookCallback } from 'grammy'
import rss from './rss'


// 创建 Hono 应用
const app = new Hono<{
  Bindings: {
    BOT_TOKEN: string
    DB: D1Database // D1数据库绑定
  }
}>()

// 创建 Bot 实例的函数
function createBot(token: string) {
  const bot = new Bot(token)

  // 处理 /start 命令
  bot.command('start', (ctx) => {
    return ctx.reply('欢迎使用我的机器人！🤖\n\n发送任何消息，我会回复你。')
  })

  // 处理 /help 命令
  bot.command('help', (ctx) => {
    return ctx.reply('可用命令：\n/start - 开始使用\n/help - 显示帮助\n/info - 显示信息')
  })

  // 处理 /info 命令
  bot.command('info', (ctx) => {
    const user = ctx.from
    const chatId = ctx.chat.id
    return ctx.reply(`用户信息：\n用户ID: ${user?.id}\n用户名: ${user?.username || '未设置'}\n聊天ID: ${chatId}`)
  })

  // 处理普通文本消息
  bot.on('message:text', (ctx) => {
    const userMessage = ctx.message.text
    // 跳过命令消息，避免重复处理
    if (userMessage.startsWith('/')) {
      return
    }
    return ctx.reply(`你说：${userMessage}\n\n我收到了你的消息！ 👍`)
  })

  // 处理图片消息
  bot.on('message:photo', (ctx) => {
    return ctx.reply('我收到了一张图片！📸')
  })

  return bot
}

// 挂载RSS路由
app.route('/rss', rss)

// 健康检查端点
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Telegram Bot is running!' })
})

// 调试端点
app.get('/debug', (c) => {
  const botToken = c.env.BOT_TOKEN
  return c.json({
    bot_token_configured: !!botToken,
    bot_token_prefix: botToken ? botToken.substring(0, 10) + '...' : 'not set',
    timestamp: new Date().toISOString()
  })
})

// Telegram Bot webhook 端点
app.post('/webhook', async (c) => {
  try {
    const botToken = c.env.BOT_TOKEN
    
    if (!botToken) {
      console.error('BOT_TOKEN not configured')
      return c.json({ error: 'BOT_TOKEN not configured' }, 500)
    }

    // 创建 Bot 实例
    const bot = createBot(botToken)

    // 使用 webhookCallback 处理请求
    const callback = webhookCallback(bot, 'hono')
    return await callback(c)
    
  } catch (error) {
    console.error('Bot error:', error)
    return c.json({ error: 'Internal server error', details: String(error) }, 500)
  }
})

export default app
