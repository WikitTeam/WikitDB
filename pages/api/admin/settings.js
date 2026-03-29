import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { module, data } = req.body;
    
    try {
        // 支持保存 bingo 和 bounty 玩法的配置
        if (module === 'bingo' || module === 'bounty') {
            await redis.set(`config:${module}`, JSON.stringify(data));
            return res.status(200).json({ success: true });
        }
        
        return res.status(400).json({ error: '未知的设置模块' });
    } catch (e) {
        return res.status(500).json({ error: '设置保存失败' });
    }
}
