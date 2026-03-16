import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site } = req.query;

    if (!site) return res.status(400).json({ error: '缺少 site 参数' });

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) return res.status(404).json({ error: '未找到该站点配置' });

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        const baseUrl = wikiConfig.URL.replace(/\/$/, '');
        let links = [];
        let seen = new Set();
        let pageTitle = "全站页面索引";

        // 核心升级：优先使用 Wikit GraphQL 接口拉取全站链接
        try {
            let currentPage = 1;
            let hasNextPage = true;

            // 自动翻页逻辑，确保能拉取到站点下的所有页面
            while (hasNextPage) {
                const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `query { articles(wiki: ["${site}"], page: ${currentPage}, pageSize: 500) { nodes { title url page } pageInfo { hasNextPage } } }`
                    }),
                    cache: 'no-store'
                });

                if (gqlRes.ok) {
                    const gqlJson = await gqlRes.json();
                    const articlesData = gqlJson.data?.articles;
                    
                    if (articlesData && articlesData.nodes) {
                        articlesData.nodes.forEach(node => {
                            // 优先使用 GraphQL 返回的完整 url，如果没有则用 page 拼接
                            const fullHref = node.url || `${baseUrl}/${node.page}`;
                            const text = node.title || node.page;
                            
                            // 依然执行严格的清洗过滤
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
        } catch (e) {
            // GraphQL 请求异常时静默处理，自动进入下方的原生兜底
        }

        // 兜底逻辑 1：如果 GraphQL 没抓到数据（可能 Wikit 还没收录该站），调用原站 list-all-pages
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

        // 兜底逻辑 2：如果连索引页都没有，暴力提取首页所有 A 标签
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

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteUrl: wikiConfig.URL,
            pageTitle: links.length > 0 ? (seen.size > 50 ? "Wikit API 全站索引" : pageTitle) : pageTitle,
            links: links
        });
    } catch (error) {
        res.status(500).json({ error: '全站页面抓取失败', details: error.message });
    }
}
