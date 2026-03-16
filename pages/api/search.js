const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, q } = req.query;

    if (!site) return res.status(400).json({ error: '缺少 site 参数' });

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) return res.status(404).json({ error: '未找到该站点配置' });

    let actualWikiName = '';
    try {
        const urlObj = new URL(wikiConfig.URL);
        actualWikiName = urlObj.hostname.replace(/^www\./i, '').split('.')[0];
    } catch (e) {
        actualWikiName = wikiConfig.URL.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('.')[0];
    }

    const keyword = q ? q.trim() : '';

    try {
        // 策略 A：尝试使用 GraphQL 的参数直接搜索 (按最新时间倒序拉取 50 条)
        // 注意：不同后端的模糊查询语法可能不同，这里尝试使用包含语法
        const queryFilter = keyword ? `, title: "%${keyword}%"` : '';
        const query = `query { articles(wiki: ["${actualWikiName}"]${queryFilter}, page: 1, pageSize: 50) { nodes { title page wiki rating created_at } } }`;

        const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            cache: 'no-store'
        });

        if (!gqlRes.ok) throw new Error('Wikit API 网络异常');

        const gqlJson = await gqlRes.json();
        
        // 如果 GraphQL 不支持这种搜索语法并抛出错误，触发 Catch 进入兜底策略
        if (gqlJson.errors) {
            throw new Error(gqlJson.errors[0].message);
        }

        let nodes = gqlJson.data?.articles?.nodes || [];
        
        // 按照创建时间进行倒序排序 (最新发布的在最前面)
        nodes.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        res.status(200).json({
            siteName: wikiConfig.NAME,
            results: nodes
        });

    } catch (error) {
        // 策略 B (兜底)：如果带参数的 GraphQL 搜索报错，说明接口不支持该语法。
        // 此时我们拉取最新的 500 条数据，然后在 Node.js 本地使用原生 JS 强制进行精准搜索。
        try {
            const fallbackQuery = `query { articles(wiki: ["${actualWikiName}"], page: 1, pageSize: 500) { nodes { title page wiki rating created_at } } }`;
            const fallbackRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: fallbackQuery }),
                cache: 'no-store'
            });
            
            const fallbackJson = await fallbackRes.json();
            let nodes = fallbackJson.data?.articles?.nodes || [];
            
            if (keyword) {
                const lowerQ = keyword.toLowerCase();
                nodes = nodes.filter(n => 
                    (n.title && n.title.toLowerCase().includes(lowerQ)) || 
                    (n.page && n.page.toLowerCase().includes(lowerQ))
                );
            }

            nodes.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            
            res.status(200).json({
                siteName: wikiConfig.NAME,
                results: nodes.slice(0, 50) // 只返回前 50 条结果以保证渲染速度
            });
        } catch (err) {
            res.status(500).json({ error: '搜索执行失败', details: err.message });
        }
    }
}
