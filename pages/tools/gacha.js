import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const GRAPHQL_ENDPOINT = 'https://wikit.unitreaty.org/apiv1/graphql';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    const { username } = req.body;

    if (!username) {
        return res.status(401).json({ error: '请先登录' });
    }

    try {
        const user = await redis.get(`user:${username}`);
        if (!user) {
            return res.status(404).json({ error: '找不到该用户' });
        }

        const currentBalance = user.balance !== undefined ? Number(user.balance) : 10000;
        const COST = 100; 

        if (currentBalance < COST) {
            return res.status(400).json({ error: `余额不足！抽一次需要 ${COST}，当前可用 ${currentBalance.toFixed(2)}` });
        }

        const totalQuery = `
            query {
                articles(page: 1, pageSize: 1) {
                    pageInfo {
                        total
                    }
                }
            }
        `;

        const totalRes = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: totalQuery })
        });

        if (!totalRes.ok) {
            throw new Error('GraphQL 接口请求失败');
        }

        const totalData = await totalRes.json();
        const totalPages = totalData?.data?.articles?.pageInfo?.total;

        if (!totalPages || totalPages <= 0) {
            throw new Error('未能从接口获取到页面总数');
        }

        const randomPageNum = Math.floor(Math.random() * totalPages) + 1;

        const drawQuery = `
            query {
                articles(page: ${randomPageNum}, pageSize: 1) {
                    nodes {
                        wiki
                        page
                        title
                        rating
                    }
                }
            }
        `;

        const drawRes = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: drawQuery })
        });

        if (!drawRes.ok) {
            throw new Error('GraphQL 接口请求失败');
        }

        const drawData = await drawRes.json();
        const nodes = drawData?.data?.articles?.nodes;

        if (!nodes || nodes.length === 0) {
            throw new Error('抽卡失败，该随机页码没有返回数据');
        }

        const randomNode = nodes[0];
        
        const site = randomNode.wiki || '未知站点';
        const pageId = randomNode.page || 'unknown-page';
        const title = randomNode.title || pageId;
        const score = randomNode.rating || 0;

        // 根据最新要求调整稀有度门槛
        let rarity = 'N';
        if (score >= 20) rarity = 'SSR';
        else if (score >= 10) rarity = 'SR';
        else if (score >= 0) rarity = 'R';

        const drawResult = {
            site,
            pageId,
            title,
            score,
            rarity
        };

        user.balance = currentBalance - COST;
        await redis.set(`user:${username}`, user);

        const gachaRecord = {
            id: Date.now().toString(),
            username,
            ...drawResult,
            time: Date.now()
        };
        await redis.lpush(`user_gacha:${username}`, JSON.stringify(gachaRecord));

        res.status(200).json({ 
            message: '抽卡成功', 
            newBalance: user.balance,
            result: drawResult
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '抽卡机发生故障，请检查接口连通性' });
    }
}
