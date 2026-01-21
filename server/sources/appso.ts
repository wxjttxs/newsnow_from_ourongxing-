import type { NewsItem } from "@shared/types"
import { load } from "cheerio"

export default defineSource(async () => {
  const baseURL = "https://www.ifanr.com"
  const url = `${baseURL}/app`
  const response = await myFetch(url) as any
  const $ = load(response)
  const news: NewsItem[] = []

  // 查找文章列表 - ifanr 网站的文章列表选择器
  const $items = $(".article-item, .js-article-item, .c-article-item, article")

  $items.each((_, el) => {
    const $el = $(el)
    const $titleLink = $el.find("h3 a, .js-title-link, .article-link").first()
    const href = $titleLink.attr("href") || $el.find("a").first().attr("href")
    const title = $titleLink.text().trim() || $el.find("h3, .title").text().trim()

    // 获取摘要
    const summary = $el.find(".article-summary, .desc, p").first().text().trim()

    // 获取时间
    const time = $el.find("time, .time, .date").attr("datetime") ||
                 $el.find("time, .time, .date").text().trim()

    // 获取作者
    const author = $el.find(".author, .article-author").text().trim()

    if (href && title) {
      const articleUrl = href.startsWith("http") ? href : `${baseURL}${href}`
      news.push({
        url: articleUrl,
        title,
        id: href,
        extra: {
          hover: summary,
          date: time,
          info: author ? `作者: ${author}` : undefined,
        },
      })
    }
  })

  // 如果上面的选择器没有找到内容，尝试另一种结构
  if (news.length === 0) {
    const $articles = $(".post, .entry, .content-list li")
    $articles.each((_, el) => {
      const $el = $(el)
      const $link = $el.find("a[href*='/app/'], a[href*='/article/']").first() || $el.find("a").first()
      const href = $link.attr("href")
      const title = $el.find(".post-title, .entry-title, h2, h3").text().trim()

      if (href && title) {
        const articleUrl = href.startsWith("http") ? href : `${baseURL}${href}`
        news.push({
          url: articleUrl,
          title,
          id: href,
        })
      }
    })
  }

  return news.slice(0, 20)
})
