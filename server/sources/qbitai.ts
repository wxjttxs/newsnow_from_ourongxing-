import type { NewsItem } from "@shared/types"
import { load } from "cheerio"

export default defineSource(async () => {
  const baseURL = "https://www.qbitai.com"
  // 使用编码后的 URL 访问资讯分类页面
  const url = `${baseURL}/category/%e8%b5%84%e8%ae%af`
  const response = await myFetch(url, {
    headers: {
      "Referer": "https://www.qbitai.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  }) as any
  const $ = load(response)
  const news: NewsItem[] = []

  // 量子位网站结构：文章标题在 h3 或 h4 标签中，包含在链接中
  // 查找所有包含链接的 h3 和 h4 标签
  $("h3 a, h2 a, h4 a").each((_, el) => {
    const $a = $(el)
    const href = $a.attr("href")
    const title = $a.text().trim()
    
    // 查找父容器中的元信息
    const $parent = $a.closest("article, .post, .entry, .item, li, div")
    const summary = $parent.find(".summary, .excerpt, .description, .intro, p").first().text().trim()
    const time = $parent.find(".time, .date, .meta-date, .pub-time, time").text().trim() || 
                 $parent.find("time").attr("datetime") ||
                 $a.closest("div").next().find(".time, .date").text().trim()

    if (href && title && title.length > 5) {
      // 过滤掉导航链接等非文章链接
      if (!href.includes("/tag/") && !href.includes("/author/") && !href.includes("/category/")) {
        const articleUrl = href.startsWith("http") ? href : `${baseURL}${href}`
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

  // 如果上面的方法没找到足够的内容，尝试查找文章列表容器
  if (news.length < 5) {
    $(".post-list, .article-list, .entry-list, ul li, .content article").each((_, el) => {
      const $el = $(el)
      const $link = $el.find("h3 a, h2 a, a").first()
      const href = $link.attr("href")
      const title = $link.text().trim() || $el.find("h3, h2").text().trim()
      const summary = $el.find("p, .excerpt, .summary").first().text().trim()
      const time = $el.find(".time, .date, time").text().trim() || $el.find("time").attr("datetime")

      if (href && title && title.length > 5 && !news.find(n => n.id === href)) {
        if (!href.includes("/tag/") && !href.includes("/author/") && !href.includes("/category/")) {
          const articleUrl = href.startsWith("http") ? href : `${baseURL}${href}`
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
  }

  // 去重并限制数量
  const uniqueNews = Array.from(new Map(news.map(item => [item.id, item])).values())
  return uniqueNews.slice(0, 20)
})
