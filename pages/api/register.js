import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { action, username, password } = req.body;

    if (!username) return res.status(400).json({ error: '缺少显示名称' });

    // 步骤一：生成 QQID，获取链接，并存入 Redis 临时库 (有效期 24 小时)
    if (action === 'start') {
        if (!password) return res.status(400).json({ error: '缺少密码' });

        const exists = await redis.get(`user:${username}`);
        if (exists) return res.status(400).json({ error: '该名称已被占用' });

        const qq = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const token = '9a3f6c1d8e2b4a7f0c5d9e3b1a6f8c2d';

        try {
            const verifyRes = await fetch('https://wikit.unitreaty.org/module/qq-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ qq, token }).toString()
            });
            const rawText = await verifyRes.text();
            let url = '';
            try {
                const data = JSON.parse(rawText);
                url = data['verification-link'] || '';
            } catch (e) {
                const match = rawText.match(/https?:\/\/[^\s"'\\]+/);
                if (match) url = match[0];
            }

            if (url && url.startsWith('http')) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await redis.set(`temp_reg:${username}`, { qq, password: hashedPassword, verifyUrl: url }, { ex: 86400 });
                return res.status(200).json({ verifyUrl: url });
            } else {
                return res.status(500).json({ error: '接口未返回有效链接' });
            }
        } catch (err) {
            return res.status(500).json({ error: '验证服务器通信失败' });
        }
    }

    // 步骤二：从数据库读取 QQID 并查询绑定状态
    if (action === 'check') {
        const tempRecord = await redis.get(`temp_reg:${username}`);
        if (!tempRecord) return res.status(400).json({ error: '验证会话已过期 (超过24小时) 或不存在' });

        try {
            // 依然使用 bind-query 接口
            const queryRes = await fetch(`https://wikit.unitreaty.org/module/bind-query?qq=${tempRecord.qq}`);
            const rawText = await queryRes.text();

            let wdid = '';
            
            try {
                const responseData = JSON.parse(rawText);
                
                // 提取 JSON 里的 id 字段
                if (responseData.status === 'success' && responseData.data && responseData.data.length > 0) {
                    wdid = responseData.data[0].id;
                }
            } catch (e) {
                // 兼容逻辑：如果接口突然没有返回 JSON，尝试按原文本处理
                wdid = rawText.trim();
                if (wdid.toLowerCase().includes('error') || wdid.includes('<') || wdid === 'false' || wdid === 'null') {
                    wdid = '';
                }
            }

            if (wdid) {
                await redis.set(`temp_reg:${username}`, { ...tempRecord, wdid }, { ex: 86400 });
                return res.status(200).json({ wdid });
            } else {
                return res.status(400).json({ error: '未查到绑定信息，请确保已在 Wikidot 授权' });
            }
            
        } catch (err) {
            return res.status(500).json({ error: '查询绑定状态失败' });
        }
    }

    // 步骤三：确认无误，转移数据到正式用户库并附赠初始资金
    if (action === 'submit') {
        const tempRecord = await redis.get(`temp_reg:${username}`);
        if (!tempRecord || !tempRecord.wdid) return res.status(400).json({ error: '数据已过期或未完成验证' });

        try {
            await redis.set(`user:${username}`, {
                username,
                wikidotAccount: tempRecord.wdid,
                password: tempRecord.password,
                balance: 10000, 
                createdAt: Date.now()
            });
            await redis.del(`temp_reg:${username}`);
            return res.status(200).json({ message: '注册成功' });
        } catch (e) {
            return res.status(500).json({ error: '入库失败' });
        }
    }

    return res.status(400).json({ error: '未知操作' });
}
