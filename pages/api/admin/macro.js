import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { action, amount, rate } = req.body;

    try {
        const keys = await redis.keys('user:*');
        let affected = 0;

        for (const key of keys) {
            let user = await redis.get(key);
            if (!user) continue;
            if (typeof user === 'string') user = JSON.parse(user);

            let currentBalance = Number(user.balance) || 0;

            if (action === 'airdrop') {
                user.balance = currentBalance + Number(amount);
            } else if (action === 'tax') {
                const taxAmount = currentBalance * (Number(rate) / 100);
                user.balance = currentBalance - taxAmount;
            }

            await redis.set(key, JSON.stringify(user));
            affected++;
        }

        return res.status(200).json({ success: true, affected });
    } catch (error) {
        return res.status(500).json({ error: '宏观调控执行失败' });
    }
}
