import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    const { username, site, pageId, pageTitle, direction, lockType, margin, leverage } = req.body;

    if (!username) {
        return res.status(401).json({ error: '你还没有登录，无法开仓' });
    }

    try {
        // 构建一条交易记录
        const tradeRecord = {
            id: Date.now().toString(),
            username,
            site,
            pageId,
            pageTitle,
            direction, // 'long' 做多，'short' 做空
            lockType,  // 锁仓时间
            margin: Number(margin), // 保证金
            leverage,  // 杠杆倍数
            status: 'open',
            openTime: Date.now()
        };

        // 存入 Redis，利用 List 结构记录全站的交易流水，方便以后拉取排行榜或个人主页
        await redis.lpush('global_trades', JSON.stringify(tradeRecord));
        // 同时也给个人名下单独存一份
        await redis.lpush(`user_trades:${username}`, JSON.stringify(tradeRecord));

        res.status(200).json({ message: '开仓记录已成功保存到数据库', tradeId: tradeRecord.id });
    } catch (error) {
        res.status(500).json({ error: '数据库写入失败' });
    }
}
