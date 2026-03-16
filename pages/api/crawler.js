import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

// 内存缓存，用于瞬间返回已抓取过的站点索引
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 缓存有效期 1 小时

export default async function handler(req, res) {
    const { site } = req.query;

    if (!site) return res.status(400).json({ error: '缺少 site 参数' });

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) return res.status(404).json({ error: '未找到该站点配置' });

    // 检查缓存是否命中
    if (cache.has(site)) {
        const cachedData = cache.get(site);
        if (Date.now() - cachedData.timestamp < CACHE_TTL) {
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
            return res.status(200).json(cachedData.data);
        }
    }

    let actualWikiName = '';
    try {
        const urlObj = new URL(wikiConfig.URL);
        actualWikiName = urlObj.hostname.replace(/^www\./i, '').split('.')[0];
    } catch (e) {
        actualWikiName = wikiConfig.URL.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('.')[0];
    }

    const baseUrl = wikiConfig.URL.replace(/\/$/, '');

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        let links = [];
        let seen = new Set();
        let pageTitle = "全站页面索引";

        try {
            // 根据 Kakushi 的建议，将安全上限调整为 100
            const pageSize = 100;
            let currentPage = 1;
            let hasNextPage = true;

            while (hasNextPage) {
                const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `query { articles(wiki: ["${actualWikiName}"], page: ${currentPage}, pageSize: ${pageSize}) { nodes { title url page } pageInfo { hasNextPage } } }`
                    }),
                    cache: 'no-store'
                });

                if (gqlRes.ok) {
                    const gqlJson = await gqlRes.json();
                    const articlesData = gqlJson.data?.articles;
                    
                    if (articlesData && articlesData.nodes && articlesData.nodes.length > 0) {
                        articlesData.nodes.forEach(node => {
                            const fullHref = node.url || `${baseUrl}/${node.page}`;
                            const text = node.title || node.page;
                            
                            if (fullHref.startsWith(baseUrl) && !fullHref.includes('/system:') && !fullHref.includes('/admin:') && !fullHref.includes('/component:') && !fullHref.includes('user:info')) {
                                if (!seen.has(fullHref)) {
                                    seen.add(fullHref);
                                    links.push({ text: text, href: fullHref });
                                }
                            }
                        });
                        hasNextPage = articlesData.pageInfo?.hasNextPage || false;
                        currentPage++;
                    } else {
                        hasNextPage = false;
                    }
                } else {
                    hasNextPage = false;
                }
            }
        } catch (e) {}

        if (links.length === 0) {
            try {
                const listAllUrl = `${baseUrl}/system:list-all-pages`;
                const listRes = await fetch(listAllUrl, { headers: fetchHeaders });
                
                if (listRes.ok) {
                    const listHtml = await listRes.text();
                    const $list = cheerio.load(listHtml);
                    
                    $list('#page-content a').each((i, el) => {
                        const href = $list(el).attr('href');
                        const text = $list(el).text().trim();
                        
                        if (href && text && !href.startsWith('javascript:') && !href.startsWith('#')) {
                            const fullHref = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
                            
                            if (fullHref.startsWith(baseUrl) && !href.includes('/system:') && !href.includes('/admin:') && !href.includes('/component:') && !href.includes('user:info')) {
                                if (!seen.has(fullHref)) {
                                    seen.add(fullHref);
                                    links.push({ text: text, href: fullHref });
                                }
                            }
                        }
                    });
                }
            } catch (e) {}
        }

        if (links.length === 0) {
            try {
                const homeRes = await fetch(baseUrl, { headers: fetchHeaders });
                const homeHtml = await homeRes.text();
                const $home = cheerio.load(homeHtml);
                pageTitle = $home('title').text().trim() || "首页数据抓取";
                if (pageTitle.includes(' - ')) pageTitle = pageTitle.split(' - ')[0].trim();

                $home('#page-content a, #nav-side a, #top-bar a').each((i, el) => {
                    const href = $home(el).attr('href');
                    const text = $home(el).text().trim();
                    
                    if (href && text && !href.startsWith('javascript:') && !href.startsWith('#')) {
                        const fullHref = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
                        
                        if (fullHref.startsWith(baseUrl) && !href.includes('/system:') && !href.includes('/admin:') && !href.includes('user:info')) {
                            if (!seen.has(fullHref)) {
                                seen.add(fullHref);
                                links.push({ text: text, href: fullHref });
                            }
                        }
                    }
                });
            } catch (e) {}
        }

        const responseData = {
            siteName: wikiConfig.NAME,
            siteUrl: wikiConfig.URL,
            pageTitle: links.length > 0 ? (seen.size > 20 ? "Wikit API 全站索引" : pageTitle) : pageTitle,
            links: links
        };

        // 写入内存缓存
        cache.set(site, {
            timestamp: Date.now(),
            data: responseData
        });

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: '全站页面抓取失败', details: error.message });
    }
}
