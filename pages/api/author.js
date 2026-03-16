export default async function handler(req, res) {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: '缺少有效的 name 参数' });
    }

    try {
        const queryName = name.trim();
        
        // 1. 使用你提供的专门接口获取作者全局排名及统计数据
        const rankRes = await fetch(`https://wikit.unitreaty.org/wikidot/rank?user=${encodeURIComponent(queryName)}`, {
            method: 'GET',
            cache: 'no-store'
        });
        
        let rankData = {};
        if (rankRes.ok) {
            try {
                rankData = await rankRes.json();
            } catch (e) {}
        }

        // 2. 依然使用 GraphQL 获取具体的作品列表
        const query = `
        query {
          articles: articles(author: "${queryName}", page: 1, pageSize: 500) {
            nodes {
              title
              wiki
              page
              rating
              created_at
            }
            pageInfo {
              total
            }
          }
        }`;

        const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            cache: 'no-store'
        });

        let articlesData = [];
        let totalPagesGql = 0;
        if (gqlRes.ok) {
            const gqlJson = await gqlRes.json();
            if (!gqlJson.errors && gqlJson.data && gqlJson.data.articles) {
                articlesData = gqlJson.data.articles.nodes || [];
                totalPagesGql = gqlJson.data.articles.pageInfo?.total || 0;
            }
        }

        const accountName = encodeURIComponent(queryName.toLowerCase().replace(/_/g, '-').replace(/ /g, '-'));
        const avatarUrl = `https://www.wikidot.com/avatar.php?account=${accountName}`;

        // 防御性解析 REST 接口的返回字段，并与 GraphQL 的总数进行兜底比对
        const globalRank = rankData.rank || rankData.global_rank || '无记录';
        const totalRating = rankData.rating || rankData.score || rankData.total_rating || 0;
        const totalPages = rankData.pages || rankData.count || rankData.total_pages || totalPagesGql;
        
        let averageRating = 0;
        if (totalPages > 0) {
            averageRating = (totalRating / totalPages).toFixed(1);
        }

        const authorData = {
            name: queryName,
            avatar: avatarUrl,
            globalRank: globalRank,
            totalRating: totalRating,
            totalPages: totalPages,
            averageRating: averageRating,
            pages: articlesData
        };

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json(authorData);
    } catch (error) {
        res.status(500).json({ error: '获取作者信息失败', details: error.message });
    }
}
