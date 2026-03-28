import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 指定最高权限创始人
const SUPER_ADMIN = 'Laimu_slime';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    const { action, username, targetUser, amount } = req.body;

    if (!username) {
        return res.status(401).json({ error: '未登录' });
    }

    // 1. 权限校验
    let isAdmin = username === SUPER_ADMIN;
    if (!isAdmin) {
        const adminSet = await redis.smembers('global:admins');
        if (adminSet && adminSet.includes(username)) {
            isAdmin = true;
        }
    }

    if (!isAdmin) {
        return res.status(403).json({ error: '权限不足，仅限管理员访问' });
    }

    // 2. 路由处理
    try {
        if (action === 'check') {
            const adminSet = await redis.smembers('global:admins') || [];
            // 过滤掉集合里可能重复的创始人，合并返回
            const admins = [SUPER_ADMIN, ...adminSet.filter(a => a !== SUPER_ADMIN)];
            return res.status(200).json({ isAdmin: true, admins });
        }

        if (action === 'add_admin') {
            if (!targetUser) return res.status(400).json({ error: '缺少目标用户' });
            await redis.sadd('global:admins', targetUser);
            return res.status(200).json({ message: '添加成功' });
        }

        if (action === 'remove_admin') {
            if (!targetUser) return res.status(400).json({ error: '缺少目标用户' });
            if (targetUser === SUPER_ADMIN) return res.status(400).json({ error: '不能移除创始人' });
            await redis.srem('global:admins', targetUser);
            return res.status(200).json({ message: '移除成功' });
        }

        if (action === 'give_money') {
            if (!targetUser || !amount) return res.status(400).json({ error: '参数不完整' });
            
            const user = await redis.get(`user:${targetUser}`);
            if (!user) return res.status(404).json({ error: '找不到该用户，请确认用户名是否正确' });

            const currentBalance = user.balance !== undefined ? Number(user.balance) : 10000;
            user.balance = currentBalance + Number(amount);
            
            await redis.set(`user:${targetUser}`, user);
            return res.status(200).json({ message: '资金变更成功', newBalance: user.balance });
        }

        return res.status(400).json({ error: '未知操作' });
    } catch (error) {
        res.status(500).json({ error: '服务器内部错误' });
    }
}
