import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site } = req.query;

    if (!site) {
        return res.status(400).json({ error: '缺少 site 参数' });
    }

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);

    if (!wikiConfig) {
        return res.status(404).json({ error: '未找到该站点配置' });
    }

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        // 直接抓取站点的 sitemap.xml 以获取全站页面，避免 Vercel 爬虫超时
        const sitemapUrl = `${wikiConfig.URL.replace(/\/$/, '')}/sitemap.xml`;
        const response = await fetch(sitemapUrl, { headers: fetchHeaders });
        
        let links = [];
        let pageTitle = "全站页面索引";

        if (response.ok) {
            const xml = await response.text();
            const $ = cheerio.load(xml, { xmlMode: true });

            $('url loc').each((i, el) => {
                const href = $(el).text().trim();
                // 过滤掉系统页面和管理页面，只保留正式文档
                if (href && !href.includes('/system:') && !href.includes('/admin:')) {
                    // 从 URL 中逆向提取并格式化标题
                    const parts = href.split('/');
                    let rawTitle = parts[parts.length - 1] || parts[parts.length - 2];
                    let title = decodeURIComponent(rawTitle).replace(/-/g, ' ');

                    links.push({
                        text: title || href,
                        href: href
                    });
                }
            });
        } else {
            // 如果站点未开启 sitemap，作为备用方案回退到抓取首页所有链接
            const fallbackRes = await fetch(wikiConfig.URL, { headers: fetchHeaders });
            const html = await fallbackRes.text();
            const $ = cheerio.load(html);
            pageTitle = $('title').text();
            
            $('#page-content a').each((i, el) => {
                const text = $(el).text().trim();
                const href = $(el).attr('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    links.push({
                        text: text || href,
                        href: href.startsWith('http') ? href : `${wikiConfig.URL.replace(/\/$/, '')}${href.startsWith('/') ? href : '/' + href}`
                    });
                }
            });
        }

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteUrl: wikiConfig.URL,
            pageTitle: pageTitle,
            links: links
        });
    } catch (error) {
        res.status(500).json({ error: '全站页面抓取失败', details: error.message });
    }
}
