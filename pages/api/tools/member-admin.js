export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: '仅支持 POST 请求' });
    }

    const { token, wiki, username, password, member, action, reason } = req.body;

    if (!token || !wiki || !username || !password || !member || !action) {
        return res.status(400).json({ status: 'error', message: '缺少必填参数' });
    }

    try {
        const payload = {
            token,
            wiki,
            username,
            password,
            member,
            action
        };

        if (action === 'ban' && reason) {
            payload.reason = reason;
        }

        const fetchRes = await fetch('https://wikit.unitreaty.org/wikidot/member-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(payload)
        });

        const data = await fetchRes.json();
        
        // 按照截图说明，状态是 success 和 error
        if (data.status === 'success') {
            return res.status(200).json(data);
        } else {
            return res.status(400).json(data);
        }

    } catch (error) {
        res.status(500).json({ status: 'error', message: '请求 Wikit 接口异常', details: error.message });
    }
}
