import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        wikidotAccount: '',
        email: '',
        password: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [verifyUrl, setVerifyUrl] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateLink = async () => {
        setIsVerifying(true);
        setMessage('');
        setVerifyUrl('');

        // 生成 10 位随机数作为 QQ 号传给后端
        const qq = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const token = '9a3f6c1d8e2b4a7f0c5d9e3b1a6f8c2d';

        try {
            const res = await fetch('https://wikit.unitreaty.org/module/qq-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                // 仅传递 qq 和 token
                body: new URLSearchParams({ qq, token }).toString()
            });

            const text = await res.text();
            let extractedUrl = '';
            
            try {
                const data = JSON.parse(text);
                extractedUrl = data.url || data.link || data.data || text;
            } catch {
                extractedUrl = text;
            }

            if (extractedUrl && extractedUrl.includes('http')) {
                const httpMatch = extractedUrl.match(/https?:\/\/[^\s"]+/);
                setVerifyUrl(httpMatch ? httpMatch[0] : extractedUrl);
            } else {
                setMessage('接口返回数据异常，未提取到有效链接');
            }
        } catch (err) {
            setMessage('验证请求失败，请检查网络或跨域限制');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.wikidotAccount || !formData.email || !formData.password) {
            setMessage('请将所有注册信息填写完整');
            return;
        }

        if (!isVerified) {
            setMessage('请先完成 Wikidot 账号绑定验证');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setMessage('账号注册成功！正在前往登录页...');
                setTimeout(() => {
                    router.push('/login');
                }, 1500);
            } else {
                setMessage(data.error || '注册失败');
            }
        } catch (err) {
            setMessage('服务器响应异常，请稍后再试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
            <Head>
                <title>注册 - WikitDB</title>
            </Head>
            
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">注册新账号</h1>
                
                {message && (
                    <div className="mb-4 p-3 rounded bg-gray-700/50 text-gray-300 text-sm text-center border border-gray-600">
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">数据库显示名</label>
                        <input 
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none transition-all"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Wikidot 用户名</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                name="wikidotAccount"
                                value={formData.wikidotAccount}
                                onChange={handleChange}
                                disabled={isVerified}
                                className="flex-1 bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none transition-all disabled:opacity-50"
                            />
                            {!isVerified && (
                                <button 
                                    type="button"
                                    onClick={handleGenerateLink}
                                    disabled={isVerifying}
                                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isVerifying ? '获取中' : '获取验证链接'}
                                </button>
                            )}
                        </div>

                        {verifyUrl && !isVerified && (
                            <div className="mt-3 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                                <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                                    请点击下方链接完成授权绑定，回来后点击“确认绑定”继续。
                                </p>
                                <a 
                                    href={verifyUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block w-full py-2 mb-3 text-center bg-gray-800 border border-gray-600 hover:bg-gray-700 text-indigo-400 text-sm font-medium rounded-lg transition-colors break-all px-2"
                                >
                                    点此前往授权页
                                </a>
                                <button 
                                    type="button"
                                    onClick={() => setIsVerified(true)}
                                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    确认绑定
                                </button>
                            </div>
                        )}

                        {isVerified && (
                            <div className="mt-2 text-xs text-green-400 flex items-center">
                                <i className="fa-solid fa-circle-check mr-1.5"></i> Wikidot 账号已绑定
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">电子邮箱</label>
                        <input 
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none transition-all"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">登录密码</label>
                        <input 
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none transition-all"
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={loading || !isVerified}
                        className="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-all disabled:opacity-50 mt-6 shadow-lg"
                    >
                        {loading ? '正在提交' : '提交注册'}
                    </button>
                </form>
            </div>
        </div>
    );
}
