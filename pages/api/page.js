import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, url } = req.query;

    if (!site || !url || url === 'undefined') {
        return res.status(400).json({ error: '缺少有效的 site 或 url 参数' });
    }

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) {
        return res.status(404).json({ error: '未找到该站点配置' });
    }

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': 'wikidot_token7=123456;'
        };

        const response = await fetch(url, { headers: fetchHeaders });
        
        // 专门拦截 404 死链，防止整个详情页崩溃白屏
        if (response.status === 404) {
            throw new Error(`404: 原站点中该页面不存在 (可能是死链或已被原作者删除)`);
        }
        if (!response.ok) {
            throw new Error(`HTTP 状态码异常: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);

        let title = $('#page-title').text().trim();
        if (!title) {
            title = $('title').text().trim();
            if (title.includes('-')) {
                title = title.split('-')[0].trim();
            }
        }
        if (!title || title.startsWith('http')) {
            const urlParts = url.split('/');
            title = decodeURIComponent(urlParts[urlParts.length - 1] || '未命名页面').replace(/-/g, ' ');
        }

        const contentHtml = $('#page-content').html() || '<p class="text-gray-400">无法提取到正文区域 (#page-content)。</p>';

        const tags = [];
        $('.page-tags a').each((i, el) => {
            const t = $(el).text().trim();
            if(t && !t.startsWith('_')) tags.push(t);
        });

        let creator = $('.printuser').last().text().trim() || $('#page-info a[href*="/user:info/"]').first().text().trim() || '未知';
        let lastUpdated = $('.odate').text().trim() || '未知';

        let pageId = null;
        const idMatch = html.match(/pageId\s*[:=]\s*['"]?(\d+)['"]?/i) || html.match(/page_id\s*[:=]\s*['"]?(\d+)['"]?/i);
        if (idMatch && idMatch[1]) {
            pageId = idMatch[1];
        }

        let sourceCode = '源码抓取失败：未能在原站网页中解析到 pageId。';
        let historyHtml = '<div class="text-gray-500">历史记录抓取失败：未能在原站网页中解析到 pageId。</div>';
        let discussionHtml = '<div class="text-gray-500 text-center">该页面暂无讨论数据。</div>';

        if (pageId) {
            const origin = new URL(url).origin;
            const ajaxUrl = `${origin}/ajax-module-connector.php`;
            
            // 核心修复点：增加了 Referer，模拟真实的同源请求，解决 not_ok 报错
            const ajaxHeaders = {
                ...fetchHeaders,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Referer': url 
            };

            const [srcRes, histRes, discRes] = await Promise.allSettled([
                fetch(ajaxUrl, {
                    method: 'POST',
                    headers: ajaxHeaders,
                    body: `page_id=${pageId}&moduleName=viewsource/ViewSourceModule&wikidot_token7=123456`
                }),
                fetch(ajaxUrl, {
                    method: 'POST',
                    headers: ajaxHeaders,
                    body: `page_id=${pageId}&moduleName=history/PageRevisionListModule&page=1&perpage=50&wikidot_token7=123456`
                }),
                (async () => {
                    let threadId = null;
                    const tMatch = html.match(/\/forum\/t-(\d+)/);
                    if (tMatch) threadId = tMatch[1];
                    if (!threadId) throw new Error('No thread ID');
                    return fetch(ajaxUrl, {
                        method: 'POST',
                        headers: ajaxHeaders,
                        body: `t=${threadId}&moduleName=forum/ForumViewThreadCommentsModule&pageNo=1&wikidot_token7=123456`
                    });
                })()
            ]);

            if (srcRes.status === 'fulfilled' && srcRes.value.ok) {
                try {
                    const data = await srcRes.value.json();
                    if (data.status === 'ok') {
                        const $src = cheerio.load(data.body);
                        let rawHtml = $src('.page-source').html() || data.body;
                        sourceCode = rawHtml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    } else {
                        sourceCode = `请求源码失败，原站返回: ${data.status}`;
                    }
                } catch(e) {}
            }

            if (histRes.status === 'fulfilled' && histRes.value.ok) {
                try {
                    const data = await histRes.value.json();
                    if (data.status === 'ok') {
                        historyHtml = data.body;
                    }
                } catch(e) {}
            }

            if (discRes.status === 'fulfilled' && discRes.value.ok) {
                try {
                    const data = await discRes.value.json();
                    if (data.status === 'ok') {
                        discussionHtml = data.body;
                    }
                } catch(e) {}
            }
        }

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteImg: wikiConfig.ImgURL,
            originalUrl: url,
            title: title,
            content: contentHtml,
            tags: tags,
            creator: creator,
            lastUpdated: lastUpdated,
            sourceCode: sourceCode,
            historyHtml: historyHtml,
            discussionHtml: discussionHtml
        });
    } catch (error) {
        res.status(500).json({ error: '详情页抓取失败', details: error.message });
    }
}
