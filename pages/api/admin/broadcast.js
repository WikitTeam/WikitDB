import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const message = await redis.get('system_broadcast');
        return res.status(200).json({ message: message || '' });
    }
    
    if (req.method === 'POST') {
        const { message } = req.body;
        if (message) {
            await redis.set('system_broadcast', message);
        } else {
            await redis.del('system_broadcast');
        }
        return res.status(200).json({ success: true });
    }
}
