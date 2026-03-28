// pages/api/admin/users.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    // 【GET 请求】：获取所有用户列表，渲染后台表格
    if (req.method === 'GET') {
        try {
            // 扫描所有的 user 键
            const keys = await redis.keys('user:*');
            const users = [];

            for (const key of keys) {
                let userData = await redis.get(key);
                if (userData) {
                    if (typeof userData === 'string') {
                        userData = JSON.parse(userData);
                    }
                    // 剔除密码等敏感信息，提取后台需要的数据
                    users.push({
                        username: userData.username,
                        // 兼容早期的字段名和现在的绑定机制
                        wikidotAccount: userData.wikidotAccount || userData.wikidotUser || '',
                        balance: userData.balance || 0,
                        role: userData.role || 'user',
                        status: userData.status || 'active',
                        createdAt: userData.createdAt || Date.now()
                    });
                }
            }

            // 按余额排序（富有者在前）
            users.sort((a, b) => b.balance - a.balance);

            return res.status(200).json({ users });
        } catch (error) {
            console.error("Admin Fetch Users Error:", error);
            return res.status(500).json({ error: '读取用户数据库失败' });
        }
    }

    // 【POST 请求】：执行管理员操作 (封禁、解封、提权、降级、删除)
    if (req.method === 'POST') {
        const { targetUser, action, operator } = req.body;

        if (!targetUser || !action) {
            return res.status(400).json({ error: '参数不完整' });
        }

        // ---【致命级安全限制】---
        // 1. 管理员绝对不能对自己执行封禁、降级、删除操作，否则会导致系统死锁
        if (targetUser === operator && (action === 'ban' || action === 'demote' || action === 'delete')) {
            return res.status(403).json({ error: `安全限制：你不能对自己的账号(${targetUser})执行该操作` });
        }

        try {
            const userKey = `user:${targetUser}`;
            let userData = await redis.get(userKey);

            if (!userData) {
                return res.status(404).json({ error: '找不到目标用户' });
            }

            if (typeof userData === 'string') {
                userData = JSON.parse(userData);
            }

            // 执行状态变更逻辑
            switch (action) {
                case 'ban':
                    userData.status = 'banned';
                    break;
                case 'unban':
                    userData.status = 'active';
                    break;
                case 'promote':
                    userData.role = 'admin';
                    break;
                case 'demote':
                    userData.role = 'user';
                    break;
                // ---【新增：没收/永久删除逻辑】---
                case 'delete':
                    // 如果该用户绑定了维基账号，需要同时解除绑定标记，以便该维基账号能再次注册
                    const wdid = userData.wikidotAccount || userData.wikidotUser;
                    if (wdid) {
                        const wikidotBindKey = `bound_wikidot:${wdid}`;
                        // 并行删除用户主键和绑定键
                        await Promise.all([
                            redis.del(userKey),
                            redis.del(wikidotBindKey)
                        ]);
                    } else {
                        // 仅删除用户主键
                        await redis.del(userKey);
                    }
                    // 删除记录后直接返回，不需写回数据
                    return res.status(200).json({ success: true, message: `用户 ${targetUser} 的所有档案已通过宏观干预彻底抹除` });
                
                default:
                    return res.status(400).json({ error: '未知的操作类型' });
            }

            // 非删除操作，将修改后的数据写回 Redis
            await redis.set(userKey, JSON.stringify(userData));

            return res.status(200).json({ success: true, message: `已成功更新 ${targetUser} 的状态` });

        } catch (error) {
            console.error("Admin User Action Error:", error);
            return res.status(500).json({ error: '数据库操作失败' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
