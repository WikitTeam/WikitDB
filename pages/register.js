import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // 流程控制：1=填信息 2=去绑定 3=确认拉取到的WDID
    const [step, setStep] = useState(1);
    const [verifyUrl, setVerifyUrl] = useState('');
    const [generatedQq, setGeneratedQq] = useState(''); 
    const [wdid, setWdid] = useState(''); 

    // 页面加载时，检查有没有未过期的注册进度（24小时自动清理）
    useEffect(() => {
        const sessionStr = localStorage.getItem('wikit_reg_session');
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                // 检查是否在 24 小时有效期内
                if (Date.now() < session.expireTime) {
                    setFormData({ username: session.username, password: session.password });
                    setGeneratedQq(session.qq);
                    setVerifyUrl(session.verifyUrl);
                    setStep(2); // 进度恢复，直接跳转到步骤2
                } else {
                    // 超过 24 小时，自动清理记录
                    localStorage.removeItem('wikit_reg_session');
                }
            } catch (e) {
                localStorage.removeItem('wikit_reg_session');
            }
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 步骤 1：开始注册，获取绑定链接
    const handleRegisterStart = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.password) {
            setMessage('名字和密码都要写全');
            return;
        }

        setLoading(true);
        setMessage('');

        const qq = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const token = '9a3f6c1d8e2b4a7f0c5d9e3b1a6f8c2d';

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qq, token })
            });

            const rawText = await res.text();
            let url = '';
            
            try {
                const data = JSON.parse(rawText);
                url = data['verification-link'] || '';
            } catch (err) {
                const match = rawText.match(/https?:\/\/[^\s"'\\]+/);
                if (match) url = match[0];
            }

            if (url && url.startsWith('http')) {
                setVerifyUrl(url);
                setGeneratedQq(qq);
                setStep(2);

                // 记录 QQID 和当前进度，存入本地，有效期设为 24 小时 (24 * 60 * 60 * 1000)
                localStorage.setItem('wikit_reg_session', JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    qq: qq,
                    verifyUrl: url,
                    expireTime: Date.now() + 86400000 
                }));
            } else {
                setMessage('没能在返回数据里找到验证链接');
            }
        } catch (err) {
            setMessage('网络请求失败，请检查连接');
        } finally {
            setLoading(false);
        }
    };

    // 步骤 2：去查询绑定的 WDID
    const handleCheckBind = async () => {
        if (!generatedQq) {
            setMessage('找不到 QQID 记录，请返回上一步重新生成');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const res = await fetch(`/api/query-bind?qq=${generatedQq}`);
            const rawText = await res.text();
            
            let fetchedWdid = '';
            
            try {
                const data = JSON.parse(rawText);
                fetchedWdid = data.wdid || data.user || data.username || data.account || data.data || '';
            } catch (err) {
                fetchedWdid = rawText.trim();
            }

            // 拦截无效数据（错误信息、HTML标签、false等）
            if (fetchedWdid && !fetchedWdid.toLowerCase().includes('error') && !fetchedWdid.includes('<') && fetchedWdid !== 'false' && fetchedWdid !== 'null') {
                setWdid(fetchedWdid);
                setStep(3); 
            } else {
                setMessage('还没查到你的绑定信息，是不是还没在 Wikidot 上操作完？');
            }
        } catch (err) {
            setMessage('查询绑定状态失败了，稍后再试一下');
        } finally {
            setLoading(false);
        }
    };

    // 步骤 3：确认入库
    const handleFinalSubmit = async () => {
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, wikidotAccount: wdid })
            });
            
            if (res.ok) {
                // 注册成功后清理本地的临时记录
                localStorage.removeItem('wikit_reg_session');
                localStorage.setItem('username', formData.username);
                
                setMessage('注册成功！正在进入首页...');
                setTimeout(() => {
                    router.push('/');
                }, 1000);
            } else {
                const data = await res.json();
                setMessage(data.error || '存入数据库时失败了');
            }
        } catch (err) {
            setMessage('提交失败，后端可能没有响应');
        } finally {
            setLoading(false);
        }
    };

    // 重置注册流程
    const handleReset = () => {
        localStorage.removeItem('wikit_reg_session');
        setStep(1);
        setGeneratedQq('');
        setVerifyUrl('');
        setMessage('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
            <Head>
                <title>注册账号 - WikitDB</title>
            </Head>
            
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">注册新账号</h1>
                
                {message && (
                    <div className="mb-4 p-3 rounded bg-gray-700/50 text-gray-300 text-sm text-center border border-gray-600">
                        {message}
                    </div>
                )}
                
                <div className="space-y-4">
                    {step === 1 && (
                        <form onSubmit={handleRegisterStart} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">显示名称</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={formData.username} 
                                    onChange={handleChange} 
                                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">登录密码</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-5 py-2.5 mt-6 transition-all disabled:opacity-50"
                            >
                                {loading ? '正在获取...' : '注册并验证 Wikidot'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="p-4 bg-gray-900/50 border border-gray-600 rounded-lg space-y-4">
                            <p className="text-sm text-gray-300 leading-relaxed text-center">
                                验证链接已生成。请前往 Wikidot 完成授权绑定。
                            </p>
                            
                            <a 
                                href={verifyUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full py-2.5 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                前往授权页
                            </a>
                            
                            <button 
                                type="button" 
                                onClick={handleCheckBind} 
                                disabled={loading}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? '正在查询...' : '我已完成绑定'}
                            </button>

                            <button 
                                type="button" 
                                onClick={handleReset} 
                                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors mt-2"
                            >
                                返回上一步重新生成
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="p-4 bg-gray-900/50 border border-gray-600 rounded-lg space-y-5">
                            <div className="text-center">
                                <div className="text-gray-400 text-sm mb-2">已读取到您的 Wikidot 账号：</div>
                                <div className="text-xl font-bold text-indigo-400 bg-gray-900 py-2 rounded border border-gray-700">
                                    {wdid}
                                </div>
                            </div>
                            
                            <button 
                                type="button" 
                                onClick={handleFinalSubmit} 
                                disabled={loading}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? '正在写入数据库...' : '确认无误，完成注册'}
                            </button>

                            <button 
                                type="button" 
                                onClick={() => setStep(2)} 
                                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors mt-2"
                            >
                                账号不对？重新验证
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
