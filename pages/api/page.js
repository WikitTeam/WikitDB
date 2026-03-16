import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, url } = req.query;

    if (!site || !url || url === 'undefined') {
        return res.status(400).json({ error: '缺少有效的 site 或 url 参数' });
    }

    const cleanUrl = url.split('|')[0].split('#')[0].trim();
    const secureUrl = cleanUrl.replace(/^http:\/\//i, 'https://');

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

        const response = await fetch(secureUrl, { 
            headers: fetchHeaders,
            cache: 'no-store'
        });
        
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
            const urlParts = secureUrl.split('/');
            title = decodeURIComponent(urlParts[urlParts.length - 1] || '未命名页面').replace(/-/g, ' ');
        }

        const tags = [];
        $('.page-tags a').each((i, el) => {
            const t = $(el).text().trim();
            if(t && !t.startsWith('_')) tags.push(t);
        });

        let creatorName = '未知';
        let creatorAvatar = null;
        const printusers = $('.printuser');
        if (printusers.length > 0) {
            const lastUser = printusers.last();
            creatorName = lastUser.text().trim();
            creatorAvatar = lastUser.find('img').attr('src');
        }
        if (!creatorName || creatorName === '未知') {
            creatorName = $('#page-info a[href*="/user:info/"]').first().text().trim() || '未知';
        }
        if (creatorAvatar && !creatorAvatar.startsWith('http')) {
            creatorAvatar = `https://www.wikidot.com${creatorAvatar.startsWith('/') ? '' : '/'}${creatorAvatar}`;
        }

        let rating = $('.rate-points').first().text().trim() || 'N/A';
        let lastUpdated = $('#page-info .odate').last().text().trim() || $('.odate').last().text().trim() || '未知';

        let pageId = null;
        const idMatch = html.match(/pageId\s*[:=]\s*['"]?(\d+)['"]?/i) || html.match(/page_id\s*[:=]\s*['"]?(\d+)['"]?/i);
        if (idMatch && idMatch[1]) {
            pageId = idMatch[1];
        }

        let sourceCode = '源码抓取失败：未能在原站网页中解析到 pageId。';
        let historyHtml = '<div class="text-gray-500">历史记录抓取失败：未能在原站网页中解析到 pageId。</div>';

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
