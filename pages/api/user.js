import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: '只支持 GET 请求' });
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

        // 如果是老用户（之前存的时候没写余额字段），默认补发 10000 块钱本金
        const balance = user.balance !== undefined ? Number(user.balance) : 10000;
        
        res.status(200).json({ balance });
    } catch (error) {
        res.status(500).json({ error: '获取余额失败' });
    }
}
