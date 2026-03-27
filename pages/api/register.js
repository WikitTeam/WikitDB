export default async function handler(req, res) {
    // 只处理 POST 请求，别的不管
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '方法不对，只接受 POST 请求' });
    }

    const { username, email, password } = req.body;

    // 后端再兜底检查一下前端传过来的数据有没有漏的
    if (!username || !email || !password) {
        return res.status(400).json({ error: '注册信息没填全' });
    }

    try {
        // 这里该写查数据库的逻辑了，看看用户名或者邮箱是不是被别人占用了
        // 比如：const existingUser = await db.collection('users').findOne({ email });
        // 如果占用了就 return res.status(400).json({ error: '邮箱已经被注册过了' });

        // 密码存数据库前要加密，这里先不写具体的加密库（比如 bcrypt），直接跳到保存步骤
        // const hashedPassword = await bcrypt.hash(password, 10);
        
        // 模拟拼装好准备存入数据库的用户对象
        const newUser = {
            username,
            email,
            // password: hashedPassword,
            createdAt: new Date()
        };

        // 比如：await db.collection('users').insertOne(newUser);

        // 存完之后给前端回个信，告诉它搞定了
        res.status(200).json({ 
            message: '注册成功',
            user: { username: newUser.username, email: newUser.email }
        });

    } catch (error) {
        // 万一数据库连不上或者哪里报错了，在这抓一下，别让服务端直接崩了
        res.status(500).json({ error: '服务器出错了，没注册上' });
    }
}
