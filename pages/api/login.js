import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只接受 POST 请求' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '信息没填全' });
    }

    try {
        const user = await redis.get(`user:${username}`);
        
        if (!user) {
            return res.status(400).json({ error: '用户不存在' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ error: '密码错误' });
        }

        const token = Buffer.from(`${username}-${Date.now()}`).toString('base64');

        res.status(200).json({ 
            message: '登录成功',
            token: token,
            username: user.username
        });

    } catch (error) {
        res.status(500).json({ error: '数据库连接异常' });
    }
}
