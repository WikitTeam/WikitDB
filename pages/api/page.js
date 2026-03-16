import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, page } = req.query;

    if (!site || !page) return res.status(400).json({ error: '缺少 site 或 page 参数' });

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) return res.status(404).json({ error: '未找到该站点配置' });

    const baseUrl = wikiConfig.URL.replace(/\/$/, '');
    const pageUrl = `${baseUrl}/${page}`;

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': 'wikidot_token7=123456;' // 必须携带 token 才能触发 Ajax
        };

        const pageRes = await fetch(pageUrl, { headers: fetchHeaders });
        if (!pageRes.ok) throw new Error('目标页面获取失败');

        const pageHtml = await pageRes.text();
        const $ = cheerio.load(pageHtml);

        const title = $('#page-title').text().trim() || page;
        const contentHtml = $('#page-content').html() || '<div class="text-gray-500">无法提取页面内容</div>';

        // 获取底层页面 ID，这是调用后续模块的关键
        const pageIdMatch = pageHtml.match(/WIKIDOT\.page\.id\s*=\s*(\d+)/);
        const pageId = pageIdMatch ? pageIdMatch[1] : null;

        let history = [];
        let ratingTable = [];
        let authorAvatar = '';
        let authorName = '';

        if (pageId) {
            // 并发向 Wikidot 请求历史记录模块和评分表模块
            const [historyRes, rateRes] = await Promise.allSettled([
                fetch(`${baseUrl}/ajax-module-connector.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Cookie': 'wikidot_token7=123456;' },
                    body: `page_id=${pageId}&moduleName=history%2FPageRevisionListModule&page=1&perpage=100&options=%7B%22all%22%3Atrue%7D&wikidot_token7=123456`
                }),
                fetch(`${baseUrl}/ajax-module-connector.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Cookie': 'wikidot_token7=123456;' },
                    body: `page_id=${pageId}&moduleName=pagerate%2FWhoRatedPageModule&wikidot_token7=123456`
                })
            ]);

            // 解析历史记录及作者信息
            if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
                const historyJson = await historyRes.value.json();
                if (historyJson.status === 'ok' && historyJson.body) {
                    const $hist = cheerio.load(historyJson.body);
                    $hist('table.page-history tr').each((i, el) => {
                        if (i === 0) return;
                        const tds = $hist(el).find('td');
                        if (tds.length >= 6) {
                            const rev = tds.eq(0).text().trim();
                            const userNode = tds.eq(4).find('.printuser');
                            const user = userNode.text().trim();
                            const date = tds.eq(5).text().trim();
                            const comments = tds.eq(6).text().trim();
                            history.push({ rev, user, date, comments });
                        }
                    });

                    if (history.length > 0) {
                        const creatorRow = $hist('table.page-history tr').last();
                        const creatorPrintuser = creatorRow.find('td').eq(4).find('.printuser');
                        authorName = creatorPrintuser.text().trim();
                        const imgTag = creatorPrintuser.find('img').attr('src');
                        if (imgTag) {
                            authorAvatar = imgTag.startsWith('http') ? imgTag : `https://www.wikidot.com${imgTag}`;
                        } else if (authorName) {
                            const accountStr = authorName.toLowerCase().replace(/_/g, '-').replace(/ /g, '-');
                            authorAvatar = `https://www.wikidot.com/avatar.php?account=${accountStr}`;
                        }
                    }
                }
            }

            // 解析评分表数据
            if (rateRes.status === 'fulfilled' && rateRes.value.ok) {
                const rateJson = await rateRes.value.json();
                if (rateJson.status === 'ok' && rateJson.body) {
                    const $rate = cheerio.load(rateJson.body);
                    
                    $rate('.printuser').each((i, el) => {
                        const user = $rate(el).text().trim();
                        
                        // Wikidot 的评分模块 DOM 结构：用户名旁边会有文本表示评分
                        let vote = '+1';
                        const parentHtml = $rate(el).parent().text() || '';
                        if (parentHtml.includes('-')) vote = '-1';
                        else if (parentHtml.includes('+')) vote = '+1';

                        const imgTag = $rate(el).find('img').attr('src');
                        let avatar = '';
                        if (imgTag) {
                            avatar = imgTag.startsWith('http') ? imgTag : `https://www.wikidot.com${imgTag}`;
                        } else {
                            const accountStr = user.toLowerCase().replace(/_/g, '-').replace(/ /g, '-');
                            avatar = `https://www.wikidot.com/avatar.php?account=${accountStr}`;
                        }

                        ratingTable.push({ user, avatar, vote });
                    });
                    
                    // 去重，防止 DOM 解析引发的重复数据
                    ratingTable = ratingTable.filter((v, i, a) => a.findIndex(t => (t.user === v.user)) === i);
                }
            }
        }

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json({
            siteName: wikiConfig.NAME,
            pageUrl,
            title,
            contentHtml,
            authorName,
            authorAvatar,
            history,
            ratingTable
        });

    } catch (error) {
        res.status(500).json({ error: '获取页面详情失败', details: error.message });
    }
}
