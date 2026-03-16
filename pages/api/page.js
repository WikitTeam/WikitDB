import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, url } = req.query;

    if (!site || !url || url === 'undefined') {
        return res.status(400).json({ error: '缺少有效的 site 或 url 参数' });
    }

    const cleanUrl = url.split('|')[0].split('#')[0].trim();
    const secureUrl = cleanUrl.replace(/^http:\/\//i, 'https://');
    const pageName = cleanUrl.split('/').pop().toLowerCase();

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) {
        return res.status(404).json({ error: '未找到该站点配置' });
    }

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        // 1. 并发请求 GraphQL 和 原站 HTML
        const [gqlResponse, htmlResponse] = await Promise.allSettled([
            fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query { article(wiki: "${site}", page: "${pageName}") { title rating author tags created_at lastmod } }`
                }),
                cache: 'no-store'
            }),
            fetch(secureUrl, { 
                headers: fetchHeaders,
                cache: 'no-store'
            })
        ]);

        // 2. 解析 GraphQL 数据
        let gqlData = null;
        if (gqlResponse.status === 'fulfilled' && gqlResponse.value.ok) {
            try {
                const gqlJson = await gqlResponse.value.json();
                if (gqlJson.data && gqlJson.data.article) {
                    gqlData = gqlJson.data.article;
                }
            } catch (e) {}
        }

        // 3. 解析原站 HTML 数据与校验
        if (htmlResponse.status === 'fulfilled' && htmlResponse.value.status === 404) {
            throw new Error(`404: 原站点中该页面不存在 (可能是死链或已被原作者删除)`);
        }
        if (htmlResponse.status === 'rejected' || !htmlResponse.value.ok) {
            throw new Error(`HTTP 状态码异常: ${htmlResponse.value?.status || '网络请求失败'}`);
        }
        
        const html = await htmlResponse.value.text();
        const $ = cheerio.load(html);

        // 4. 数据合并与覆盖：优先使用 GraphQL，DOM 提取作为兜底
        let title = gqlData?.title;
        if (!title) {
            title = $('#page-title').text().trim() || $('title').text().trim() || decodeURIComponent(pageName).replace(/-/g, ' ');
            if (title.includes(' - ')) title = title.split(' - ')[0].trim();
        }

        let tags = gqlData?.tags;
        if (!tags || tags.length === 0) {
            tags = [];
            $('.page-tags a').each((i, el) => {
                const t = $(el).text().trim();
                if(t && !t.startsWith('_')) tags.push(t);
            });
        }

        let creatorName = gqlData?.author || $('.printuser').last().text().trim() || $('#page-info a[href*="/user:info/"]').first().text().trim() || '未知';
        
        let rating = 'N/A';
        if (gqlData && gqlData.rating !== undefined) {
            rating = gqlData.rating > 0 ? `+${gqlData.rating}` : gqlData.rating.toString();
        } else {
            rating = $('.rate-points').first().text().trim() || 'N/A';
        }

        let lastUpdated = gqlData?.lastmod;
        if (!lastUpdated) {
            lastUpdated = $('#page-info .odate').last().text().trim() || $('.odate').last().text().trim() || '未知';
        } else {
            // 将 GraphQL 的 ISO 时间格式化为可读字符串
            lastUpdated = new Date(lastUpdated).toLocaleString('zh-CN', { hour12: false });
        }

        // 5. 提取单独需要 DOM 的数据：头像与 pageId
        let creatorAvatar = null;
        const printusers = $('.printuser');
        if (printusers.length > 0) {
            creatorAvatar = printusers.last().find('img').attr('src');
        }
        if (creatorAvatar && !creatorAvatar.startsWith('http')) {
            creatorAvatar = `https://www.wikidot.com${creatorAvatar.startsWith('/') ? '' : '/'}${creatorAvatar}`;
        }

        let pageId = null;
        const idMatch = html.match(/pageId\s*[:=]\s*['"]?(\d+)['"]?/i) || html.match(/page_id\s*[:=]\s*['"]?(\d+)['"]?/i);
        if (idMatch && idMatch[1]) {
            pageId = idMatch[1];
        }

        let sourceCode = '源码抓取失败：未能在原站网页中解析到 pageId。';
        let historyHtml = '<div class="text-gray-500">历史记录抓取失败：未能在原站网页中解析到 pageId。</div>';

        // 6. 底层 AJAX 抓取源码和历史
        if (pageId) {
            const origin = new URL(secureUrl).origin;
            const ajaxUrl = `${origin}/ajax-module-connector.php`;
            
            const ajaxHeaders = {
                'User-Agent': fetchHeaders['User-Agent'],
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': origin,
                'Referer': secureUrl,
                'Cookie': 'wikidot_token7=123456;'
            };

            const [srcRes, histRes] = await Promise.allSettled([
                fetch(ajaxUrl, {
                    method: 'POST',
                    headers: ajaxHeaders,
                    body: `page_id=${pageId}&moduleName=viewsource/ViewSourceModule&wikidot_token7=123456`,
                    cache: 'no-store'
                }),
                fetch(ajaxUrl, {
                    method: 'POST',
                    headers: ajaxHeaders,
                    body: `page_id=${pageId}&moduleName=history/PageRevisionListModule&page=1&perpage=50&wikidot_token7=123456`,
                    cache: 'no-store'
                })
            ]);

            if (srcRes.status === 'fulfilled' && srcRes.value.ok) {
                try {
                    const data = await srcRes.value.json();
                    if (data.status === 'ok') {
                        const $src = cheerio.load(data.body);
                        let rawHtml = $src('.page-source').html() || data.body;
                        rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n');
                        sourceCode = rawHtml.replace(/&lt;/g, '<')
                                            .replace(/&gt;/g, '>')
                                            .replace(/&amp;/g, '&')
                                            .replace(/&quot;/g, '"')
                                            .trim();
                    } else {
                        sourceCode = `请求源码失败，原站返回: ${data.status}`;
                    }
                } catch(e) {
                    sourceCode = `解析源码数据异常: ${e.message}`;
                }
            } else {
                sourceCode = `请求源码网络错误，可能被原站拦截`;
            }

            if (histRes.status === 'fulfilled' && histRes.value.ok) {
                try {
                    const data = await histRes.value.json();
                    if (data.status === 'ok') {
                        historyHtml = data.body;
                    } else {
                        historyHtml = `<div class="text-gray-500">请求历史记录失败，原站返回: ${data.status}</div>`;
                    }
                } catch(e) {
                    historyHtml = `<div class="text-red-400">解析历史数据异常: ${e.message}</div>`;
                }
            } else {
                historyHtml = `<div class="text-gray-500">请求历史记录网络错误，可能被原站拦截</div>`;
            }
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteImg: wikiConfig.ImgURL,
            originalUrl: secureUrl,
            title: title,
            tags: tags,
            creatorName: creatorName,
            creatorAvatar: creatorAvatar,
            rating: rating,
            lastUpdated: lastUpdated,
            sourceCode: sourceCode,
            historyHtml: historyHtml
        });
    } catch (error) {
        res.status(500).json({ error: '详情页抓取失败', details: error.message });
    }
}
