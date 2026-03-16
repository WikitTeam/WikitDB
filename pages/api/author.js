export default async function handler(req, res) {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: '缺少有效的 name 参数' });
    }

    try {
        const queryName = name.trim();
        
        // 构造 GraphQL 查询，同时获取全局排名和作品列表
        const query = `
        query {
          rank: authorGlobalRank(name: "${queryName}", by: RATING) {
            rank
            value
          }
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

        if (!gqlRes.ok) {
            throw new Error(`HTTP 状态码异常: ${gqlRes.status}`);
        }

        const gqlJson = await gqlRes.json();
        
        if (gqlJson.errors) {
            throw new Error(gqlJson.errors[0].message);
        }

        const data = gqlJson.data;

        // 根据 Wikidot 的规则拼接头像 URL (替换空格和下划线为连字符)
        const accountName = encodeURIComponent(queryName.toLowerCase().replace(/_/g, '-').replace(/ /g, '-'));
        const avatarUrl = `https://www.wikidot.com/avatar.php?account=${accountName}`;

        const totalPages = data?.articles?.pageInfo?.total || 0;
        const totalRating = data?.rank?.value || 0;
        
        let averageRating = 0;
        if (totalPages > 0) {
            averageRating = (totalRating / totalPages).toFixed(1);
        }

        const authorData = {
            name: queryName,
            avatar: avatarUrl,
            globalRank: data?.rank?.rank || '无记录',
            totalRating: totalRating,
            totalPages: totalPages,
            averageRating: averageRating,
            pages: data?.articles?.nodes || []
        };

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json(authorData);
    } catch (error) {
        res.status(500).json({ error: '获取作者信息失败', details: error.message });
    }
}
