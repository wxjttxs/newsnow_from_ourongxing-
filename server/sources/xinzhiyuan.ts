import { defineSource } from "#/utils/source"
import type { NewsItem } from "@shared/types"
import { load } from "cheerio"

// 新智元数据源实现
// 方案优先级：
// 1. RSSHub ershicimi 路由（专门针对新智元）
// 2. 直接爬取新智元官网 aiera.com.cn
// 3. RSSHub 其他备用实例
const xinzhiyuan = defineSource(async () => {
  // 方案1：尝试 RSSHub 的 ershicimi 路由（专门针对新智元）
  const RSSHubInstances = [
    "https://rsshub.rssforever.com",
    "https://rsshub.pseudoyu.com",
    "https://rsshub.app",
  ]
  
  // 优先使用专门的新智元路由
  const routes = [
    "/wechat/ershicimi/5c85596ae4b02e8332d783ca", // 专门的新智元路由
    "/wechat/mp/5c85596ae4b02e8332d783ca", // 备用路由
  ]
  
  for (const route of routes) {
    for (const base of RSSHubInstances) {
      try {
        const url = new URL(route, base)
        url.searchParams.set("format", "json")
        url.searchParams.set("sorted", "false")
        url.searchParams.set("limit", "20")
        
        const data = await myFetch(url.toString(), {
          timeout: 10000,
        }) as any
        
        if (data?.items && data.items.length > 0) {
          return data.items.map((item: any) => ({
            title: item.title,
            url: item.url,
            id: item.id ?? item.url,
            pubDate: item.date_published,
          })) as NewsItem[]
        }
      } catch (e) {
        // 尝试下一个实例
        continue
      }
    }
  }
  
  // 方案2：如果 RSSHub 都失败，尝试直接爬取新智元官网
  try {
    const baseURL = "https://aiera.com.cn"
    const response = await myFetch(baseURL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://aiera.com.cn/",
      },
      timeout: 15000,
    }) as any
    
    const $ = load(response)
    const news: NewsItem[] = []
    
    // 尝试多种选择器匹配新智元网站结构
    const selectors = [
      "article a",
      ".article-item a",
      ".post-item a",
      ".entry-title a",
      "h2 a",
      "h3 a",
      ".title a",
    ]
    
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $a = $(el)
        const href = $a.attr("href")
        const title = $a.text().trim()
        
        if (href && title && title.length > 5) {
          // 过滤掉非文章链接
          if (!href.includes("/tag/") && 
              !href.includes("/author/") && 
              !href.includes("/category/") &&
              !href.includes("/page/") &&
              !href.startsWith("#") &&
              !news.find(n => n.id === href)) {
            const articleUrl = href.startsWith("http") ? href : `${baseURL}${href}`
            const $parent = $a.closest("article, .post, .entry, .item")
            const summary = $parent.find(".excerpt, .summary, .description, p").first().text().trim()
            const time = $parent.find(".time, .date, time").text().trim() || 
                         $parent.find("time").attr("datetime")
            
            news.push({
              url: articleUrl,
              title,
              id: href,
              extra: {
                hover: summary,
                date: time,
              },
            })
          }
        }
      })
      
      // 如果找到足够的内容就停止
      if (news.length >= 10) break
    }
    
    if (news.length > 0) {
      return news.slice(0, 20)
    }
  } catch (e) {
    // 爬取网站失败，继续尝试其他方案
  }
  
  // 如果所有方案都失败，抛出错误
  throw new Error("Failed to fetch 新智元 content from all available sources")
})

export default xinzhiyuan
