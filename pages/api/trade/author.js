// pages/api/trade/author.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 接收前端传来的 amount (如果没传，则默认 1 兜底)
        const { username, authorName, action, currentPrice, amount = 1 } = req.body;

        if (!username || !authorName || !action || !currentPrice || amount <= 0) {
            return res.status(400).json({ error: '参数错误或数量无效' });
        }

        const userKey = `user:${username}`;
        let userData = await redis.get(userKey);

        if (!userData) {
            userData = { balance: 10000, positions: [], authorStocks: {} };
        } else if (typeof userData === 'string') {
            userData = JSON.parse(userData);
        }

        if (userData.balance === undefined) userData.balance = 10000;
        if (!userData.authorStocks) userData.authorStocks = {};

        const currentPos = userData.authorStocks[authorName] || 0;
        const totalCost = currentPrice * amount; // 计算总金额

        if (action === 'buy') {
            if (userData.balance < totalCost) {
                return res.status(400).json({ error: `余额不足，买入需要 ¥${totalCost.toFixed(2)}` });
            }
            userData.balance -= totalCost;
            userData.authorStocks[authorName] = currentPos + amount;
        } else if (action === 'sell') {
            if (currentPos < amount) {
                return res.status(400).json({ error: '持仓不足，无法卖出这么多份额' });
            }
            userData.balance += totalCost;
            userData.authorStocks[authorName] = currentPos - amount;
        } else {
            return res.status(400).json({ error: '无效的操作' });
        }

        // 写回数据库
        await redis.set(userKey, JSON.stringify(userData));

        return res.status(200).json({
            success: true,
            newBalance: userData.balance,
            newPosition: userData.authorStocks[authorName]
        });

    } catch (error) {
        console.error('Author stock trade error:', error);
        return res.status(500).json({ error: '服务器内部错误，交易失败' });
    }
}
