import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const rawLogs = await redis.lrange('global_trades', 0, 200);
        const logs = rawLogs.map(log => typeof log === 'string' ? JSON.parse(log) : log);
        return res.status(200).json({ logs });
    } catch (error) {
        return res.status(500).json({ error: '读取审计日志失败' });
    }
}
