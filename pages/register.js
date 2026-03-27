import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', wikidotAccount: '', email: '', password: '' });
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
        if (!formData.wikidotAccount) {
            setMessage('请先填写 Wikidot 用户名');
            return;
        }
        setIsVerifying(true);
        const qq = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const token = '9a3f6c1d8e2b4a7f0c5d9e3b1a6f8c2d';

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qq, token })
            });
            const text = await res.text();
            let url = text.match(/https?:\/\/[^\s"]+/) ? text.match(/https?:\/\/[^\s"]+/)[0] : text;
            if (url.includes('http')) {
                setVerifyUrl(url);
            } else {
                setMessage('无法获取有效链接');
            }
        } catch (err) {
            setMessage('验证请求失败');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isVerified) return setMessage('请先完成绑定');
        setLoading(true);
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                localStorage.setItem('username', formData.username);
                router.push('/');
            } else {
                const data = await res.json();
                setMessage(data.error || '注册失败');
            }
        } catch (err) {
            setMessage('提交出错');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">注册新账号</h1>
                {message && <div className="mb-4 p-3 rounded bg-gray-700/50 text-gray-300 text-sm text-center border border-gray-600">{message}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="username" placeholder="数据库显示名" onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 text-white p-2.5 rounded-lg outline-none" />
                    <div className="flex gap-2">
                        <input type="text" name="wikidotAccount" placeholder="Wikidot 用户名" onChange={handleChange} disabled={isVerified} className="flex-1 bg-gray-900 border border-gray-600 text-white p-2.5 rounded-lg outline-none disabled:opacity-50" />
                        {!isVerified && <button type="button" onClick={handleGenerateLink} disabled={isVerifying} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">{isVerifying ? '获取中' : '获取验证链接'}</button>}
                    </div>
                    {verifyUrl && !isVerified && (
                        <div className="p-4 bg-gray-900/50 border border-gray-600 rounded-lg space-y-3">
                            <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-2 text-center bg-blue-600 text-white rounded-lg text-sm">前往授权页</a>
                            <button type="button" onClick={() => setIsVerified(true)} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm">我已完成绑定</button>
                        </div>
                    )}
                    <input type="email" name="email" placeholder="邮箱" onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 text-white p-2.5 rounded-lg" />
                    <input type="password" name="password" placeholder="密码" onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 text-white p-2.5 rounded-lg" />
                    <button type="submit" disabled={!isVerified || loading} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50">提交注册</button>
                </form>
            </div>
        </div>
    );
}
