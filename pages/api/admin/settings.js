// pages/api/admin/settings.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { module, data } = req.body;
    
    try {
        // 保存大乐透玩法的配置
        if (module === 'bingo') {
            await redis.set('config:bingo', JSON.stringify(data));
            return res.status(200).json({ success: true });
        }
        
        return res.status(400).json({ error: '未知的设置模块' });
    } catch (e) {
        return res.status(500).json({ error: '设置保存失败' });
    }
}
