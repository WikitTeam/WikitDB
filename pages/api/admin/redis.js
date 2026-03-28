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
            // 尝试判断是不是JSON格式，如果是就转成对象再存，保持结构一致
            let payload = value;
            try { payload = JSON.parse(value); } catch(e) {}
            
            await redis.set(key, typeof payload === 'string' ? payload : JSON.stringify(payload));
            return res.status(200).json({ success: true });
        }
    } catch (error) {
        return res.status(500).json({ error: '底层数据库操作失败' });
    }
}
