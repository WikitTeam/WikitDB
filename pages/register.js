import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // 控制步骤：1是填名字密码，2是去Wikidot绑定
    const [step, setStep] = useState(1);
    const [verifyUrl, setVerifyUrl] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 第一步：点击注册，获取验证链接
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
                // 精准提取 verification-link 字段
                url = data['verification-link'] || '';
            } catch (err) {
                // 如果后端真的没返回标准 JSON，再作为备用正则提取
                const match = rawText.match(/https?:\/\/[^\s"'\\]+/);
                if (match) url = match[0];
            }

            if (url && url.startsWith('http')) {
                setVerifyUrl(url);
                setStep(2);
            } else {
                setMessage('没能在返回数据里找到 verification-link');
                console.log("接口实际返回的内容:", rawText); // 方便在控制台排查
            }
        } catch (err) {
            setMessage('网络请求失败，请检查控制台');
        } finally {
            setLoading(false);
        }
    };

    // 第二步：绑完之后，提交数据库
    const handleFinalSubmit = async () => {
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
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
            setMessage('提交失败，后端可能挂了');
        } finally {
            setLoading(false);
        }
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
                
                <form onSubmit={step === 1 ? handleRegisterStart : (e) => e.preventDefault()} className="space-y-4">
                    {step === 1 && (
                        <>
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
                        </>
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
                                onClick={handleFinalSubmit} 
                                disabled={loading}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? '正在写入数据库...' : '我已完成绑定，确认注册'}
                            </button>

                            <button 
                                type="button" 
                                onClick={() => setStep(1)} 
                                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors mt-2"
                            >
                                返回上一步
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
