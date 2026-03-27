import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    const { username, tradeId, realizedPnl } = req.body;

    if (!username || !tradeId) {
        return res.status(400).json({ error: '参数不完整' });
    }

    try {
        const user = await redis.get(`user:${username}`);
        if (!user) return res.status(404).json({ error: '用户异常' });

        const rawTrades = await redis.lrange(`user_trades:${username}`, 0, -1) || [];
        const trades = rawTrades.map(t => typeof t === 'string' ? JSON.parse(t) : t);

        const tradeIndex = trades.findIndex(t => t.id === tradeId && t.status === 'open');
        if (tradeIndex === -1) {
            return res.status(400).json({ error: '订单不存在或已平仓' });
        }

        const trade = trades[tradeIndex];
        
        // 变更订单状态
        trade.status = 'closed';
        trade.closeTime = Date.now();
        trade.realizedPnl = Number(realizedPnl) || 0;

        // 结算金额回滚到余额 (退回保证金 + 盈亏)
        const currentBalance = user.balance !== undefined ? Number(user.balance) : 10000;
        const returnAmount = trade.margin + trade.realizedPnl;
        user.balance = currentBalance + returnAmount;

        // 更新数据库
        await redis.set(`user:${username}`, user);
        
        // 重写用户的交易列表 (Upstash Redis 不支持直接按索引修改，所以全量覆盖)
        trades[tradeIndex] = trade;
        await redis.del(`user_trades:${username}`);
        
        const pipeline = redis.pipeline();
        // 倒序 push 保证原有顺序
        for (const t of trades.reverse()) {
            pipeline.lpush(`user_trades:${username}`, JSON.stringify(t));
        }
        await pipeline.exec();

        res.status(200).json({ 
            message: '平仓成功', 
            newBalance: user.balance,
            returnAmount
        });
    } catch (error) {
        res.status(500).json({ error: '平仓结算失败' });
    }
}
