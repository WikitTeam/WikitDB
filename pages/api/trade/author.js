// pages/api/trade/author.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    const { username, authorName, action, currentPrice } = req.body;

    if (!username) {
        return res.status(401).json({ error: '你还没有登录，无法交易' });
    }

    if (!authorName || !action || !currentPrice) {
        return res.status(400).json({ error: '交易参数不完整' });
    }

    const priceNum = Number(currentPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ error: '获取当前股价失败' });
    }

    try {
        // 读取用户的基本信息和余额
        const userKey = `user:${username}`;
        const user = await redis.get(userKey);
        
        if (!user) {
            return res.status(404).json({ error: '找不到该用户' });
        }

        const currentBalance = user.balance !== undefined ? Number(user.balance) : 10000;
        
        // 读取用户当前在这个作者上的持仓数
        const portfolioKey = `portfolio:${username}`;
        const currentPositionStr = await redis.hget(portfolioKey, authorName);
        const currentPosition = currentPositionStr ? Number(currentPositionStr) : 0;

        const fee = priceNum * 0.01; // 暂定 1% 的交易手续费

        if (action === 'buy') {
            const totalCost = priceNum + fee;
            
            if (currentBalance < totalCost) {
                return res.status(400).json({ error: `余额不足！买入需 ${totalCost.toFixed(2)} (含手续费)，当前可用 ${currentBalance.toFixed(2)}` });
            }

            // 扣钱并加仓
            user.balance = currentBalance - totalCost;
            await redis.set(userKey, user);
            await redis.hset(portfolioKey, { [authorName]: currentPosition + 1 });

        } else if (action === 'sell') {
            if (currentPosition <= 0) {
                return res.status(400).json({ error: '你目前没有持有该作者的股份，无法卖出' });
            }

            const netIncome = priceNum - fee;

            // 加钱并减仓
            user.balance = currentBalance + netIncome;
            await redis.set(userKey, user);
            await redis.hset(portfolioKey, { [authorName]: currentPosition - 1 });

        } else {
            return res.status(400).json({ error: '未知的交易操作' });
        }

        // 记录这条交易流水
        const tradeRecord = {
            id: Date.now().toString(),
            username,
            target: authorName,
            type: 'author_stock',
            action,
            price: priceNum,
            fee,
            time: Date.now()
        };

        await redis.lpush('global_trades', JSON.stringify(tradeRecord));
        await redis.lpush(`user_trades:${username}`, JSON.stringify(tradeRecord));

        res.status(200).json({ 
            message: action === 'buy' ? '买入成功' : '卖出成功',
            newBalance: user.balance,
            newPosition: action === 'buy' ? currentPosition + 1 : currentPosition - 1
        });

    } catch (error) {
        res.status(500).json({ error: '数据库写入失败' });
    }
}
