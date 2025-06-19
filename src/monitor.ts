import { Hono } from 'hono'
import { Bot } from 'grammy'

// 定义环境变量类型
interface Env {
  BOT_TOKEN: string
  DB: D1Database
}

// RSS帖子接口类型
interface RSSPost {
  id: string
  title: string
  description: string
  pubDate: string
  category: string
  creator: string
}

// 用户信息接口
interface User {
  id: number
  chat_id: number
  username?: string
  first_name?: string
  last_name?: string
  max_sub: number
  is_active: number
}

// 关键词订阅接口
interface KeywordSub {
  id: number
  user_id: number
  keywords_count: number
  keyword1: string
  keyword2?: string
  keyword3?: string
  is_active: number
}

// 创建监控应用实例
const monitor = new Hono<{ Bindings: Env }>()

// 解析RSS XML数据
function parseRSSXML(xmlText: string): RSSPost[] {
  try {
    const posts: RSSPost[] = []
    
    // 使用正则表达式提取RSS项目
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    const items = xmlText.match(itemRegex) || []
    
    items.forEach((item, index) => {
      // 提取各个字段
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/)
      const linkMatch = item.match(/<link>(.*?)<\/link>/)
      const descriptionMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/)
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
      const categoryMatch = item.match(/<category><!\[CDATA\[(.*?)\]\]><\/category>/) || item.match(/<category>(.*?)<\/category>/)
      const creatorMatch = item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/) || item.match(/<dc:creator>(.*?)<\/dc:creator>/)
      
      // 从链接中提取ID
      const link = linkMatch ? linkMatch[1] : ''
      const idMatch = link.match(/post-(\d+)-/)
      
      const post: RSSPost = {
        id: idMatch ? idMatch[1] : `item-${index}`,
        title: titleMatch ? titleMatch[1].trim() : '无标题',
        description: descriptionMatch ? descriptionMatch[1].trim() : '',
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
        category: categoryMatch ? categoryMatch[1].trim() : '未分类',
        creator: creatorMatch ? creatorMatch[1].trim() : '未知作者'
      }
      
      posts.push(post)
    })
    
    return posts
  } catch (error) {
    console.error('解析RSS失败:', error)
    return []
  }
}

// 获取RSS数据
async function fetchRSSData(): Promise<RSSPost[]> {
  try {
    const response = await fetch('https://rss.nodeseek.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.nodeseek.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} - ${response.statusText}`)
    }
    
    const xmlText = await response.text()
    return parseRSSXML(xmlText)
  } catch (error) {
    console.error('获取RSS数据失败:', error)
    return []
  }
}

// 获取所有活跃用户
async function getActiveUsers(db: D1Database): Promise<User[]> {
  try {
    const result = await db.prepare('SELECT * FROM users WHERE is_active = 1').all()
    return result.results as unknown as User[]
  } catch (error) {
    console.error('获取用户失败:', error)
    return []
  }
}

// 获取用户的关键词订阅
async function getUserKeywords(db: D1Database, userId: number): Promise<KeywordSub[]> {
  try {
    const result = await db.prepare('SELECT * FROM keywords_sub WHERE user_id = ? AND is_active = 1')
      .bind(userId)
      .all()
    return result.results as unknown as KeywordSub[]
  } catch (error) {
    console.error('获取用户关键词失败:', error)
    return []
  }
}

// 检查是否已经发送过通知
async function isAlreadySent(db: D1Database, chatId: number, postId: string): Promise<boolean> {
  try {
    const result = await db.prepare('SELECT id FROM push_logs WHERE chat_id = ? AND post_id = ?')
      .bind(chatId, parseInt(postId))
      .first()
    return !!result
  } catch (error) {
    console.error('检查发送记录失败:', error)
    return false
  }
}

// 记录推送日志
async function logPush(db: D1Database, userId: number, chatId: number, postId: string, subId: number, status: number, errorMessage?: string): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO push_logs (user_id, chat_id, post_id, sub_id, push_status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, chatId, parseInt(postId), subId, status, errorMessage || null).run()
  } catch (error) {
    console.error('记录推送日志失败:', error)
  }
}

// 关键词匹配函数
function matchKeywords(post: RSSPost, keywords: KeywordSub): boolean {
  const searchText = `${post.title} ${post.description} ${post.category} ${post.creator}`.toLowerCase()
  
  const keyword1 = keywords.keyword1?.toLowerCase()
  const keyword2 = keywords.keyword2?.toLowerCase()
  const keyword3 = keywords.keyword3?.toLowerCase()
  
  // 检查第一个关键词（必须匹配）
  if (!keyword1 || !searchText.includes(keyword1)) {
    return false
  }
  
  // 如果只有一个关键词，直接返回true
  if (keywords.keywords_count === 1) {
    return true
  }
  
  // 检查第二个关键词
  if (keywords.keywords_count === 2) {
    return keyword2 ? searchText.includes(keyword2) : false
  }
  
  // 检查第三个关键词
  if (keywords.keywords_count === 3) {
    return keyword2 && keyword3 ? 
      searchText.includes(keyword2) && searchText.includes(keyword3) : false
  }
  
  return false
}

// 发送Telegram消息
async function sendTelegramMessage(botToken: string, chatId: number, post: RSSPost, matchedKeywords: string[]): Promise<boolean> {
  try {
    const bot = new Bot(botToken)
    
    const message = `🔔 *关键词匹配提醒*\n\n` +
      `📋 **标题:** ${post.title}\n\n` +
      `📝 **描述:** ${post.description.substring(0, 300)}${post.description.length > 300 ? '...' : ''}\n\n` +
      `🏷️ **分类:** ${post.category}\n` +
      `👤 **作者:** ${post.creator}\n` +
      `📅 **发布时间:** ${post.pubDate}\n\n` +
      `🎯 **匹配关键词:** ${matchedKeywords.join(', ')}\n\n` +
      `📎 **帖子ID:** ${post.id}`
    
    await bot.api.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    } as any)
    
    return true
  } catch (error) {
    console.error('发送Telegram消息失败:', error)
    return false
  }
}

// 主监控函数
async function monitorRSS(env: Env): Promise<{ success: boolean; message: string; stats: any }> {
  try {
    console.log('开始RSS监控...')
    
    // 获取RSS数据
    const posts = await fetchRSSData()
    if (posts.length === 0) {
      return { success: false, message: '未获取到RSS数据', stats: {} }
    }
    
    // 获取所有活跃用户
    const users = await getActiveUsers(env.DB)
    if (users.length === 0) {
      return { success: true, message: '没有活跃用户', stats: { posts: posts.length } }
    }
    
    let totalNotifications = 0
    let successfulNotifications = 0
    let failedNotifications = 0
    
    // 遍历每个用户
    for (const user of users) {
      try {
        // 获取用户的关键词订阅
        const keywordSubs = await getUserKeywords(env.DB, user.id)
        
        if (keywordSubs.length === 0) {
          continue
        }
        
        // 遍历每个帖子
        for (const post of posts) {
          // 检查是否已经发送过通知
          if (await isAlreadySent(env.DB, user.chat_id, post.id)) {
            continue
          }
          
          // 检查关键词匹配
          for (const keywords of keywordSubs) {
            if (matchKeywords(post, keywords)) {
              totalNotifications++
              
              // 发送Telegram消息
              const matchedKeywordsList = [
                keywords.keyword1,
                keywords.keyword2,
                keywords.keyword3
              ].filter(Boolean) as string[]
              
              const sent = await sendTelegramMessage(env.BOT_TOKEN, user.chat_id, post, matchedKeywordsList)
              
              if (sent) {
                successfulNotifications++
                await logPush(env.DB, user.id, user.chat_id, post.id, keywords.id, 1)
              } else {
                failedNotifications++
                await logPush(env.DB, user.id, user.chat_id, post.id, keywords.id, 0, '发送失败')
              }
              
              // 每个帖子对每个用户只发送一次，即使匹配多个关键词
              break
            }
          }
        }
      } catch (error) {
        console.error(`处理用户 ${user.chat_id} 时出错:`, error)
      }
    }
    
    const stats = {
      posts: posts.length,
      users: users.length,
      totalNotifications,
      successfulNotifications,
      failedNotifications
    }
    
    return {
      success: true,
      message: `监控完成，发送了 ${successfulNotifications} 条通知`,
      stats
    }
    
  } catch (error) {
    console.error('RSS监控失败:', error)
    return {
      success: false,
      message: `监控失败: ${error}`,
      stats: {}
    }
  }
}

// HTTP触发监控
monitor.post('/check', async (c) => {
  const result = await monitorRSS(c.env)
  return c.json(result)
})

// 手动触发监控（GET请求）
monitor.get('/check', async (c) => {
  const result = await monitorRSS(c.env)
  return c.json(result)
})

// 监控状态检查
monitor.get('/status', (c) => {
  return c.json({
    service: 'RSS Monitor Service',
    status: 'running',
    version: '1.0.0',
    endpoints: [
      'POST /monitor/check - 手动触发监控',
      'GET /monitor/check - 手动触发监控（GET方式）',
      'GET /monitor/status - 服务状态'
    ],
    timestamp: new Date().toISOString()
  })
})

// 定时任务处理函数（供Cron触发使用）
export async function handleScheduled(env: Env): Promise<void> {
  console.log('定时任务触发RSS监控...')
  const result = await monitorRSS(env)
  console.log('定时任务完成:', result)
}

export default monitor 