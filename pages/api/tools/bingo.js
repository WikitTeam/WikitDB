// pages/api/tools/bingo.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    // GET: 给前端下发后台配置的标签池和价格
    if (req.method === 'GET') {
        try {
            let config = await redis.get('config:bingo');
            if (typeof config === 'string') config = JSON.parse(config);
            
            // 如果后台还没设置过，给一套默认值
            if (!config) {
                config = { 
                    tags: ['原创', '精品', 'scp', 'tale', 'goi-format', '微恐', '搞笑', '科幻', 'keter'], 
                    cost: 50 
                };
            }
            return res.status(200).json(config);
        } catch (e) {
            return res.status(500).json({ error: '配置读取失败' });
        }
    }

    // POST: 玩家执行抽卡
    if (req.method === 'POST') {
        const { username, selectedTags } = req.body;
        if (!username) return res.status(401).json({ error: '未登录' });
        if (!selectedTags || selectedTags.length !== 3) {
            return res.status(400).json({ error: '请精确选择 3 个标签' });
        }

        try {
            // 读取最新的玩法配置
            let config = await redis.get('config:bingo');
            if (typeof config === 'string') config = JSON.parse(config);
            const cost = config?.cost || 50;

            const userKey = `user:${username}`;
            let user = await redis.get(userKey);
            if (!user) return res.status(404).json({ error: '用户不存在' });
            if (typeof user === 'string') user = JSON.parse(user);

            if ((user.balance || 0) < cost) {
                return res.status(400).json({ error: `余额不足，每次扫描需要 ¥${cost}` });
            }
            
            user.balance -= cost;

            const query = {
                query: `
                    query {
                        articles(sort: random, page: 1, pageSize: 1) {
                            nodes { wiki, title, author, tags }
                        }
                    }
                `
            };

            const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(query)
            });
            
            const gqlData = await gqlRes.json();
            const pageNode = gqlData.data?.articles?.nodes?.[0];

            if (!pageNode) {
                user.balance += cost;
                await redis.set(userKey, JSON.stringify(user));
                return res.status(500).json({ error: '节点数据获取失败，已退还本金' });
            }

            const pageTags = pageNode.tags || [];
            const matchedTags = selectedTags.filter(t => pageTags.includes(t));
            const matchCount = matchedTags.length;

            let reward = 0;
            // 奖励跟随后台配置的价格按比例放大：1倍 / 10倍 / 100倍
            if (matchCount === 1) reward = cost;
            if (matchCount === 2) reward = cost * 10;
            if (matchCount === 3) reward = cost * 100;

            user.balance += reward;

            await redis.set(userKey, JSON.stringify(user));

            return res.status(200).json({
                success: true,
                page: pageNode,
                matchedTags,
                matchCount,
                reward,
                newBalance: user.balance
            });

        } catch (error) {
            return res.status(500).json({ error: '服务器内部错误' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
