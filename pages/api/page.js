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
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        const response = await fetch(url, { headers: fetchHeaders });
        
        if (!response.ok) {
            throw new Error(`HTTP 状态码异常: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);

        let title = $('title').text();
        if (title.includes('-')) {
            title = title.split('-')[0].trim();
        }

        const contentHtml = $('#page-content').html() || '<p class="text-gray-400">无法提取到正文区域 (#page-content)。</p>';

        const tags = [];
        $('.page-tags a').each((i, el) => {
            tags.push($(el).text().trim());
        });

        const creator = $('#page-info .printuser').last().text().trim() || '未知';
        const lastUpdated = $('#page-info .odate').text().trim() || '未知';

        // --- 开始通过底层 AJAX 提取真实源码和历史记录 ---
        let pageId = null;
        const pageIdMatch = html.match(/WIKIDOT\.page\.listeners\.pageId\s*=\s*(\d+)/) || html.match(/pageId\s*=\s*(\d+)/);
        if (pageIdMatch) {
            pageId = pageIdMatch[1];
        }

        let sourceCode = '无法在页面中提取到 pageId，源码抓取失败';
        let historyHtml = '<div class="text-red-400">无法在页面中提取到 pageId，历史记录抓取失败</div>';

        if (pageId) {
            const origin = new URL(url).origin;
            const ajaxUrl = `${origin}/ajax-module-connector.php`;
            
            // 伪造 Cookie 绕过原站防跨站保护
            const ajaxHeaders = {
                ...fetchHeaders,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': 'wikidot_token7=123456;'
            };

            // 1. 抓取真实源码 (Wikitext)
            try {
                const srcRes = await fetch(ajaxUrl, {
                    method: 'POST',
                    headers: ajaxHeaders,
                    body: `page_id=${pageId}&moduleName=viewsource/ViewSourceModule&wikidot_token7=123456`
                });
                const srcData = await srcRes.json();
                if (srcData.status === 'ok') {
                    const $src = cheerio.load(srcData.body);
                    sourceCode = $src.text().trim() || srcData.body;
                }
            } catch (e) {
                sourceCode = `请求源码模块失败: ${e.message}`;
            }

            // 2. 抓取修改历史 (History Module)
            try {
                const histRes = await fetch(ajaxUrl, {
                    method: 'POST',
                    headers: ajaxHeaders,
                    body: `page_id=${pageId}&moduleName=history/PageRevisionListModule&page=1&perpage=50&wikidot_token7=123456`
                });
                const histData = await histRes.json();
                if (histData.status === 'ok') {
                    historyHtml = histData.body;
                }
            } catch (e) {
                historyHtml = `<div class="text-red-400">请求历史记录模块失败: ${e.message}</div>`;
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
            historyHtml: historyHtml
        });
    } catch (error) {
        res.status(500).json({ error: '详情页抓取失败', details: error.message });
    }
}
