// pages/admin.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('members');
    const [currentUser, setCurrentUser] = useState(null);
    
    // 各模块状态
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [logs, setLogs] = useState([]);
    
    const [broadcastMsg, setBroadcastMsg] = useState('');
    
    const [airdropAmount, setAirdropAmount] = useState(1000);
    const [taxRate, setTaxRate] = useState(5);
    
    const [redisKey, setRedisKey] = useState('');
    const [redisValue, setRedisValue] = useState('');

    const [inspectData, setInspectData] = useState(null);
    const [inspectTarget, setInspectTarget] = useState('');

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) setCurrentUser(storedUsername);

        if (activeTab === 'members') fetchUsers();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'broadcast') fetchBroadcast();
    }, [activeTab]);

    // 成员管理逻辑
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) setUsers((await res.json()).users || []);
        } catch (e) {}
        setIsLoading(false);
    };

    const handleUserAction = async (targetUser, action) => {
        if (!confirm(`确定要对 ${targetUser} 执行该操作吗？`)) return;
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUser, action, operator: currentUser })
            });
            if (res.ok) fetchUsers();
            else alert((await res.json()).error || '操作失败');
        } catch (e) { alert('请求失败'); }
    };

    const handleInspect = async (username) => {
        setInspectTarget(username);
        setInspectData(null);
        try {
            const res = await fetch(`/api/admin/user-assets?username=${username}`);
            if (res.ok) setInspectData((await res.json()).portfolio);
        } catch (e) {}
    };

    // 审计日志逻辑
    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/logs');
            if (res.ok) setLogs((await res.json()).logs || []);
        } catch (e) {}
    };

    // 广播逻辑
    const fetchBroadcast = async () => {
        try {
            const res = await fetch('/api/admin/broadcast');
            if (res.ok) setBroadcastMsg((await res.json()).message || '');
        } catch (e) {}
    };

    const saveBroadcast = async () => {
        try {
            await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: broadcastMsg })
            });
            alert('广播设置成功，刷新页面即可在顶栏看到。清空文本保存可取消广播。');
        } catch (e) { alert('保存失败'); }
    };

    // 宏观调控逻辑
    const executeMacro = async (action) => {
        if (!confirm(`警告：该操作将影响全站所有用户，确定执行吗？`)) return;
        try {
            const res = await fetch('/api/admin/macro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, amount: airdropAmount, rate: taxRate })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`执行完毕，影响了 ${data.affected} 个账户。`);
            }
        } catch (e) { alert('执行失败'); }
    };

    // Redis控制台逻辑
    const queryRedis = async (action) => {
        if (!redisKey) return alert('请输入键名');
        try {
            const res = await fetch('/api/admin/redis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, key: redisKey, value: redisValue })
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error);
            
            if (action === 'get') {
                setRedisValue(typeof data.data === 'object' ? JSON.stringify(data.data, null, 2) : String(data.data || ''));
            } else {
                alert('写入成功');
            }
        } catch (e) { alert('操作失败'); }
    };

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const navItems = [
        { id: 'members', label: '成员管理' },
        { id: 'logs', label: '交易审计' },
        { id: 'broadcast', label: '全站广播' },
        { id: 'macro', label: '宏观经济' },
        { id: 'redis', label: '裸键终端' }
    ];

    if (!currentUser) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#0a0a0a]">未登录，拒绝访问</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex overflow-hidden">
            <Head><title>中央控制台</title></Head>

            <aside className="w-48 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-800 font-bold text-white tracking-wider">
                    WIKIT ADMIN
                </div>
                <nav className="flex-1 p-2 space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${activeTab === item.id ? 'bg-blue-900/40 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-12 border-b border-gray-800 bg-gray-900/50 flex items-center px-6 shrink-0">
                    <h2 className="font-bold text-white">{navItems.find(i => i.id === activeTab)?.label}</h2>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* 模块1：成员管理 */}
                    {activeTab === 'members' && (
                        <div className="space-y-4">
                            <input 
                                type="text" placeholder="搜索用户..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm w-64"
                            />
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900 text-gray-400">
                                    <tr>
                                        <th className="p-3">系统账户</th>
                                        <th className="p-3">资金余额</th>
                                        <th className="p-3">管理操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {filteredUsers.map(u => (
                                        <tr key={u.username} className="hover:bg-gray-800/50">
                                            <td className="p-3">{u.username}</td>
                                            <td className="p-3 font-mono text-green-400">{Number(u.balance || 0).toFixed(2)}</td>
                                            <td className="p-3 space-x-2">
                                                <button onClick={() => handleInspect(u.username)} className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded">资产透视</button>
                                                <button onClick={() => handleUserAction(u.username, u.status === 'banned' ? 'unban' : 'ban')} className="px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded">{u.status === 'banned' ? '解封' : '封禁'}</button>
                                                <button onClick={() => handleUserAction(u.username, 'delete')} className="px-2 py-1 bg-red-900/50 text-red-300 rounded">彻底删除</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {inspectData && (
                                <div className="mt-6 p-4 border border-gray-700 bg-gray-900 rounded">
                                    <div className="font-bold text-blue-400 mb-2">[{inspectTarget}] 的底层持仓：</div>
                                    <pre className="text-xs text-gray-300 font-mono overflow-auto">{JSON.stringify(inspectData, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 模块2：审计天眼 */}
                    {activeTab === 'logs' && (
                        <div className="space-y-2 text-sm font-mono">
                            {logs.map((log, i) => (
                                <div key={i} className="p-2 border border-gray-800 bg-gray-900 rounded flex gap-4">
                                    <span className="text-gray-500">{new Date(log.time).toLocaleString()}</span>
                                    <span className="text-blue-400 w-24">{log.username}</span>
                                    <span className="text-gray-300 flex-1">{log.action === 'buy' ? '买入' : '卖出'} [{log.target}] {log.amount}份 @ {log.price}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 模块3：全局广播 */}
                    {activeTab === 'broadcast' && (
                        <div className="space-y-4 max-w-xl">
                            <label className="text-gray-400 text-sm">全站警报横幅内容 (留空则不显示)</label>
                            <textarea 
                                value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                                className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-3 text-white"
                                placeholder="输入需要通知全站的紧急消息..."
                            />
                            <button onClick={saveBroadcast} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">推送到前端</button>
                        </div>
                    )}

                    {/* 模块4：宏观调控 */}
                    {activeTab === 'macro' && (
                        <div className="max-w-xl space-y-8">
                            <div className="p-4 border border-green-900/50 bg-green-900/10 rounded space-y-3">
                                <h3 className="font-bold text-green-400">直升机撒钱 (Airdrop)</h3>
                                <input type="number" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full" placeholder="发放金额"/>
                                <button onClick={() => executeMacro('airdrop')} className="px-4 py-2 bg-green-700 text-white rounded w-full">给全服发钱</button>
                            </div>
                            <div className="p-4 border border-red-900/50 bg-red-900/10 rounded space-y-3">
                                <h3 className="font-bold text-red-400">强制征收财富税 (Tax)</h3>
                                <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full" placeholder="扣除百分比 (0-100)"/>
                                <button onClick={() => executeMacro('tax')} className="px-4 py-2 bg-red-700 text-white rounded w-full">按比例扣除全服余额</button>
                            </div>
                        </div>
                    )}

                    {/* 模块5：裸键终端 */}
                    {activeTab === 'redis' && (
                        <div className="space-y-4 max-w-2xl font-mono text-sm">
                            <div className="flex gap-2">
                                <input type="text" value={redisKey} onChange={e => setRedisKey(e.target.value)} placeholder="键名 例如 user:Laimu_slime" className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2"/>
                                <button onClick={() => queryRedis('get')} className="px-4 py-2 bg-gray-700 text-white rounded">读取 (GET)</button>
                            </div>
                            <textarea value={redisValue} onChange={e => setRedisValue(e.target.value)} className="w-full h-64 bg-gray-900 border border-gray-700 rounded p-3 text-green-400" placeholder="键值数据区域..."/>
                            <button onClick={() => queryRedis('set')} className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded w-full">强行覆盖写入 (SET)</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
