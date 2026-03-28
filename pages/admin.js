import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const config = require('../wikitdb.config.js');

export default function AdminDashboard() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // 权限管理状态
    const [admins, setAdmins] = useState([]);
    const [newAdmin, setNewAdmin] = useState('');

    // 资金管理状态
    const [targetUser, setTargetUser] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        const username = localStorage.getItem('username');
        if (!username) {
            router.push('/login');
            return;
        }
        checkAdmin(username);
    }, []);

    const checkAdmin = async (username) => {
        try {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check', username })
            });
            const data = await res.json();
            
            if (res.ok && data.isAdmin) {
                setIsAdmin(true);
                setAdmins(data.admins || []);
            } else {
                setIsAdmin(false);
            }
        } catch (e) {
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdmin) return;
        const username = localStorage.getItem('username');
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_admin', username, targetUser: newAdmin })
        });
        
        if (res.ok) {
            alert('添加管理员成功');
            setNewAdmin('');
            checkAdmin(username);
        } else {
            const data = await res.json();
            alert(data.error);
        }
    };

    const handleRemoveAdmin = async (target) => {
        if (!confirm(`确定要移除 ${target} 的管理权限吗？`)) return;
        const username = localStorage.getItem('username');
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove_admin', username, targetUser: target })
        });
        
        if (res.ok) {
            alert('移除成功');
            checkAdmin(username);
        } else {
            const data = await res.json();
            alert(data.error);
        }
    };

    const handleGiveMoney = async () => {
        if (!targetUser || !amount) return;
        if (!confirm(`确定要为 ${targetUser} 变更 ${amount} 资产吗？`)) return;

        const username = localStorage.getItem('username');
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'give_money', username, targetUser, amount: Number(amount) })
        });
        
        const data = await res.json();
        if (res.ok) {
            alert(`执行成功！${targetUser} 的最新余额为: ${data.newBalance.toFixed(2)}`);
            setTargetUser('');
            setAmount('');
        } else {
            alert(data.error);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-900 text-gray-400 flex items-center justify-center tracking-widest">验证身份中...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-950 text-red-500 flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-3xl font-bold mb-4">访问被拒绝</h1>
                <p className="text-gray-400">你没有权限访问该区域，或者你的账号未被授权。</p>
                <button onClick={() => router.push('/')} className="mt-8 px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">
                    返回大盘首页
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
            <Head>
                <title>系统管理后台 - {config.SITE_NAME}</title>
            </Head>

            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center border-b border-gray-800 pb-6 mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-indigo-400">系统管理后台</h1>
                    <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white transition-colors">
                        返回首页
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 权限管理模块 */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold mb-6 text-white border-l-4 border-indigo-500 pl-3">授权管理员</h2>
                        
                        <div className="flex gap-2 mb-6">
                            <input 
                                type="text" 
                                value={newAdmin}
                                onChange={(e) => setNewAdmin(e.target.value)}
                                placeholder="输入要授权的用户名" 
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <button onClick={handleAddAdmin} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">
                                授权
                            </button>
                        </div>

                        <div className="text-xs text-gray-500 mb-3 uppercase tracking-widest">当前名单</div>
                        <ul className="space-y-3">
                            {admins.map(admin => (
                                <li key={admin} className="flex justify-between items-center bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                                    <span className="font-mono text-sm text-gray-200">{admin}</span>
                                    {admin === 'Laimu_slime' ? (
                                        <span className="text-indigo-400 text-xs font-bold border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 rounded">创始人</span>
                                    ) : (
                                        <button onClick={() => handleRemoveAdmin(admin)} className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1 bg-red-400/10 rounded transition-colors">
                                            撤销权限
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 资金管理模块 */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold mb-6 text-white border-l-4 border-green-500 pl-3">资产干预</h2>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">目标用户名</label>
                                <input 
                                    type="text" 
                                    value={targetUser}
                                    onChange={(e) => setTargetUser(e.target.value)}
                                    placeholder="要操作的用户 ID"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">发放或扣除金额</label>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="正数为发放，负数为扣除"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-2">提示：输入 -500 即为扣除 500 资产。</p>
                            </div>
                            
                            <div className="pt-2">
                                <button onClick={handleGiveMoney} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-bold shadow-lg transition-colors">
                                    立即执行资产变更
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
