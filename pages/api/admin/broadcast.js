// pages/api/admin/broadcast.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const message = await redis.get('system_broadcast');
            return res.status(200).json({ message: message || '' });
        } catch (error) {
            return res.status(500).json({ error: '读取失败' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { message } = req.body;
            if (message) {
                await redis.set('system_broadcast', message);
            } else {
                await redis.del('system_broadcast');
            }
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: '写入失败' });
        }
    }

    // 处理非 GET 或 POST 的其他请求
    return res.status(405).json({ error: 'Method not allowed' });
}
