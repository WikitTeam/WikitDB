// pages/api/admin/redis.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { action, key, value } = req.body;

    if (!key) return res.status(400).json({ error: '键名不可为空' });

    try {
        if (action === 'get') {
            const data = await redis.get(key);
            return res.status(200).json({ data });
        } else if (action === 'set') {
            let payload = value;
            try { payload = JSON.parse(value); } catch(e) {}
            
            await redis.set(key, typeof payload === 'string' ? payload : JSON.stringify(payload));
            return res.status(200).json({ success: true });
        }

        // 处理未知的 action
        return res.status(400).json({ error: '未知的操作类型' });
    } catch (error) {
        return res.status(500).json({ error: '底层数据库操作失败' });
    }
}
