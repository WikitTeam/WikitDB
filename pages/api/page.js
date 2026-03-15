import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, url } = req.query;

    if (!site || !url) {
        return res.status(400).json({ error: '缺少 site 或 url 参数' });
    }

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);

    if (!wikiConfig) {
        return res.status(404).json({ error: '未找到该站点配置' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP 状态码异常: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);

        // 提取标题，去掉 "- Wikidot" 等后缀
        let title = $('title').text();
        if (title.includes('-')) {
            title = title.split('-')[0].trim();
        }

        // 提取 Wikidot 标准正文内容
        const contentHtml = $('#page-content').html() || '<p class="text-gray-400">无法提取到正文区域 (#page-content)。</p>';

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteImg: wikiConfig.ImgURL,
            originalUrl: url,
            title: title,
            content: contentHtml
        });
    } catch (error) {
        res.status(500).json({ error: '详情页抓取失败', details: error.message });
    }
}
