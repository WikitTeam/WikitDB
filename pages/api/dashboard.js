import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: '仅支持 GET 请求' });
    }

    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ error: '缺少用户名' });
    }

    try {
        const user = await redis.get(`user:${username}`);
        if (!user) {
            return res.status(404).json({ error: '找不到该用户' });
        }

        const balance = user.balance !== undefined ? Number(user.balance) : 10000;

        // 获取交易记录 (包含持仓和已平仓)
        const rawTrades = await redis.lrange(`user_trades:${username}`, 0, -1) || [];
        const trades = rawTrades.map(t => typeof t === 'string' ? JSON.parse(t) : t);

        // 获取抽卡盲盒记录
        const rawGachas = await redis.lrange(`user_gacha:${username}`, 0, -1) || [];
        const gachas = rawGachas.map(g => typeof g === 'string' ? JSON.parse(g) : g);

        res.status(200).json({
            balance,
            trades,
            gachas
        });
    } catch (error) {
        res.status(500).json({ error: '获取控制台数据失败' });
    }
}
