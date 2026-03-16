const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    try {
        const sites = config.SUPPORT_WIKI.map(wikiConfig => {
            let actualWikiName = '';
            try {
                const urlObj = new URL(wikiConfig.URL);
                actualWikiName = urlObj.hostname.replace(/^www\./i, '').split('.')[0];
            } catch (e) {
                actualWikiName = wikiConfig.URL.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('.')[0];
            }
            return { param: wikiConfig.PARAM, name: wikiConfig.NAME, actualName: actualWikiName };
        });

        // 核心修复：独立封装安全的 GraphQL 请求函数，强力拦截 PHP 报错
        const fetchSafeGraphQL = async (queryStr) => {
            try {
                const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: queryStr }),
                    cache: 'no-store'
                });
                
                const text = await gqlRes.text();
                
                // 尝试解析 JSON，如果遇到 <br /> <b> 等 PHP 崩溃页面，会直接跳入 catch
                const json = JSON.parse(text);
                if (json.errors) return [];
                
                // 提取请求别名对应的数据
                const keys = Object.keys(json.data || {});
                if (keys.length > 0) return json.data[keys[0]] || [];
                
                return [];
            } catch (e) {
                // 遇到非 JSON 的报错数据直接静默返回空数组，绝不引发整体崩溃
                return [];
            }
        };

        // 将原本庞大的一体化查询拆分为轻量级的并发查询，防止打挂 Wikit 的服务器
        const fetchPromises = [
            fetchSafeGraphQL(`query { global: authorRanking(by: RATING) { rank name value } }`)
        ];

        sites.forEach(site => {
            fetchPromises.push(
                fetchSafeGraphQL(`query { siteRank: authorRanking(wiki: "${site.actualName}", by: RATING) { rank name value } }`)
            );
        });

        const results = await Promise.all(fetchPromises);

        const responseData = {
            global: results[0],
            sites: sites.map((site, index) => ({
                param: site.param,
                name: site.name,
                ranking: results[index + 1]
            }))
        };

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: '获取排行榜数据失败', details: error.message });
    }
}
