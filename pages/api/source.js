import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, page } = req.query;

    if (!site || !page) {
        return res.status(400).json({ error: '缺少有效的 site 或 page 参数' });
    }

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) {
        return res.status(404).json({ error: '未找到该站点配置' });
    }

    let rawPage = page.split('|')[0].split('#')[0].trim().toLowerCase();
    const pageName = rawPage.replace(/\/$/, '').split('/').pop();
    const baseUrl = wikiConfig.URL.replace(/\/$/, '');
    const secureUrl = `${baseUrl}/${pageName}`;

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };

        const htmlResponse = await fetch(secureUrl, { headers: fetchHeaders, cache: 'no-store' });
        if (!htmlResponse.ok) {
            throw new Error(`HTTP 状态码异常: ${htmlResponse.status}`);
        }
        
        const html = await htmlResponse.text();
        const idMatch = html.match(/pageId\s*[:=]\s*['"]?(\d+)['"]?/i) || html.match(/page_id\s*[:=]\s*['"]?(\d+)['"]?/i);
        const pageId = idMatch ? idMatch[1] : null;

        if (!pageId) {
            throw new Error('未能在原站网页中解析到 pageId。');
        }

        const origin = new URL(secureUrl).origin;
        const ajaxUrl = `${origin}/ajax-module-connector.php`;
        
        const ajaxHeaders = {
            'User-Agent': fetchHeaders['User-Agent'],
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': 'wikidot_token7=123456;'
        };

        const srcRes = await fetch(ajaxUrl, {
            method: 'POST',
            headers: ajaxHeaders,
            body: `page_id=${pageId}&moduleName=viewsource/ViewSourceModule&wikidot_token7=123456`,
            cache: 'no-store'
        });

        if (!srcRes.ok) {
            throw new Error('请求源码网络错误。');
        }

        const data = await srcRes.json();
        
        if (data.status !== 'ok') {
            throw new Error(`请求源码失败，原站返回: ${data.status}`);
        }

        const $src = cheerio.load(data.body);
        let rawHtml = $src('.page-source').html() || data.body || '';
        rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n');
        const sourceCode = rawHtml.replace(/^(?:[ \t\u00a0\u3000]|&nbsp;)+/gm, '').trim();

        res.status(200).json({ sourceCode });
    } catch (error) {
        res.status(500).json({ error: '源码抓取失败', details: error.message });
    }
}
