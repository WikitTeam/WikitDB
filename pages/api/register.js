// pages/api/register.js
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password, verifyCode } = req.body;

    if (!username || !password || !verifyCode) {
        return res.status(400).json({ error: '缺少必要的注册参数' });
    }

    try {
        // 1. 先检查这个系统用户名是否已经被注册了
        const userKey = `user:${username}`;
        const existingUser = await redis.get(userKey);
        
        if (existingUser) {
            return res.status(400).json({ error: '该用户名已被占用' });
        }

        // 2. 核心：去验证页面抓取历史记录
        // 调用你提供的 API 获取 wikkit 站点的 wikitdb:verify 页面历史
        const historyRes = await fetch('https://wikit.unitreaty.org/wikidot/pagehistory?wiki=wikkit&page=https://wikkit.wikidot.com/wikitdb:verify');
        
        if (!historyRes.ok) {
            return res.status(500).json({ error: '无法连接到验证服务器，请稍后重试' });
        }

        const historyData = await historyRes.json();
        const revisions = historyData.data?.revisions || [];

        if (revisions.length === 0) {
            return res.status(400).json({ error: '未能获取到任何编辑记录' });
        }

        // 3. 在历史记录里寻找匹配的验证码
        // 只检查最近的 15 条记录，防止找得太深
        const recentRevisions = revisions.slice(0, 15);
        let matchedUser = null;

        for (const rev of recentRevisions) {
            // 对比 comment 字段
            if (rev.comment && rev.comment.trim() === verifyCode.trim()) {
                matchedUser = rev.user;
                break;
            }
        }

        if (!matchedUser) {
            return res.status(400).json({ error: '未找到匹配的验证记录。请确保您已保存编辑，并且验证码填写正确。' });
        }

        // 4. 可选：检查这个 Wikidot 账号是否已经被别人绑定了
        // 这里只是个防重名的演示，为了严谨可以给所有绑定过的 wikidot 账号建个集合
        const wikidotBindKey = `bound_wikidot:${matchedUser}`;
        const isBound = await redis.get(wikidotBindKey);
        if (isBound) {
            return res.status(400).json({ error: `该 Wikidot 账号 (${matchedUser}) 已经被其他系统账号绑定了。` });
        }

        // 5. 验证通过，加密密码并存入数据库
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            username,
            wikidotUser: matchedUser, // 保存绑定到的真实 Wikidot 身份
            password: hashedPassword,
            balance: 10000,
            createdAt: Date.now()
        };

        // 写入用户数据
        await redis.set(userKey, JSON.stringify(newUser));
        // 标记这个 Wikidot 账号已被绑定
        await redis.set(wikidotBindKey, username);

        return res.status(200).json({ 
            success: true, 
            wikidotUser: matchedUser 
        });

    } catch (error) {
        console.error('Registration/Verification error:', error);
        return res.status(500).json({ error: '服务器内部错误，注册失败' });
    }
}
