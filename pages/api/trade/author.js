// pages/api/trade/author.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 获取作者的实际身价
async function getAuthorPrice(authorName) {
    try {
        const query = {
            query: `
                query($author: String!) {
                    articles(author: $author, page: 1, pageSize: 500) {
                        nodes {
                            rating
                            comments
                        }
                    }
                }
            `,
            variables: { author: authorName }
        };

        const res = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query)
        });

        const result = await res.json();
        const articles = result.data?.articles?.nodes || [];

        if (articles.length === 0) return 10;

        let totalRating = 0;
        let totalComments = 0;
        
        articles.forEach(article => {
            totalRating += (article.rating || 0);
            totalComments += (article.comments || 0);
        });

        const price = 10 + (articles.length * 2.5) + (totalRating * 0.8) + (totalComments * 0.2);
        return Math.max(1, price);
    } catch (error) {
        return 10;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    // 接收 amount 参数，默认值为 1
    const { username, authorName, action, amount = 1 } = req.body;
    const tradeAmount = Number(amount);

    if (!username) {
        return res.status(401).json({ error: '你还没有登录，无法交易' });
    }

    if (!authorName || !action || isNaN(tradeAmount) || tradeAmount <= 0) {
        return res.status(400).json({ error: '交易参数不完整或数量错误' });
    }

    // 服务端计算价格
    const realPrice = await getAuthorPrice(authorName);
    const priceNum = Number(realPrice);

    try {
        // 读取用户的基本信息和余额
        const userKey = `user:${username}`;
        let user = await redis.get(userKey);
        
        if (!user) {
            return res.status(404).json({ error: '找不到该用户' });
        }

        const currentBalance = user.balance !== undefined ? Number(user.balance) : 10000;
        
        // 读取用户当前在这个作者上的持仓数
        const portfolioKey = `portfolio:${username}`;
        const currentPositionStr = await redis.hget(portfolioKey, authorName);
        const currentPosition = currentPositionStr ? Number(currentPositionStr) : 0;

        // 计算总交易额和手续费
        const transactionValue = priceNum * tradeAmount;
        const fee = transactionValue * 0.01; 

        if (action === 'buy') {
            const totalCost = transactionValue + fee;
            
            if (currentBalance < totalCost) {
                return res.status(400).json({ error: `余额不足！买入需 ${totalCost.toFixed(2)} (含手续费)，当前可用 ${currentBalance.toFixed(2)}` });
            }

            // 扣钱并加仓
            user.balance = currentBalance - totalCost;
            await redis.set(userKey, user);
            await redis.hset(portfolioKey, { [authorName]: currentPosition + tradeAmount });

        } else if (action === 'sell') {
            if (currentPosition < tradeAmount) {
                return res.status(400).json({ error: `持仓不足，你目前仅持有 ${currentPosition} 股` });
            }

            const netIncome = transactionValue - fee;

            // 加钱并减仓
            user.balance = currentBalance + netIncome;
            await redis.set(userKey, user);
            await redis.hset(portfolioKey, { [authorName]: currentPosition - tradeAmount });

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
            amount: tradeAmount,
            fee,
            time: Date.now()
        };

        await redis.lpush('global_trades', JSON.stringify(tradeRecord));
        await redis.lpush(`user_trades:${username}`, JSON.stringify(tradeRecord));

        res.status(200).json({ 
            message: action === 'buy' ? '买入成功' : '卖出成功',
            newBalance: user.balance,
            newPosition: action === 'buy' ? currentPosition + tradeAmount : currentPosition - tradeAmount
        });

    } catch (error) {
        res.status(500).json({ error: '数据库写入失败' });
    }
}
