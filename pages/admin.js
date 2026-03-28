// pages/admin.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('members');
    const [currentUser, setCurrentUser] = useState(null);
    
    // 成员管理状态
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 验证当前登录状态 (防君子不防小人，实际应在中间件处理)
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setCurrentUser(storedUsername);
        }

        if (activeTab === 'members') {
            fetchUsers();
        }
    }, [activeTab]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            } else {
                console.error("无法获取用户列表");
            }
        } catch (error) {
            console.error("网络错误", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserAction = async (targetUser, action) => {
        const actionNames = {
            'ban': '封禁',
            'unban': '解封',
            'promote': '设为管理',
            'demote': '取消管理'
        };

        if (!confirm(`确定要对 ${targetUser} 执行 [${actionNames[action]}] 操作吗？`)) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUser, action, operator: currentUser })
            });

            if (res.ok) {
                // 操作成功后刷新列表
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || '操作失败');
            }
        } catch (error) {
            alert('网络请求失败');
        }
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u.wikidotAccount && u.wikidotAccount.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // 左侧导航菜单配置
    const navItems = [
        { id: 'dashboard', label: '大盘概览', icon: 'fa-chart-pie' },
        { id: 'members', label: '成员管理', icon: 'fa-users' },
        { id: 'settings', label: '系统设置', icon: 'fa-sliders' }
    ];

    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500 font-bold bg-[#0a0a0a]">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i> 未登录，拒绝访问控制台
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex">
            <Head>
                <title>中央控制台 - WikitDB Admin</title>
            </Head>

            {/* 左侧边栏 (Sidebar) */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-3">
                        <i className="fa-solid fa-shield-halved text-blue-500"></i>
                        WIKIT ADMIN
                    </h1>
                    <div className="mt-2 text-xs text-gray-500 font-mono">
                        操作员: <span className="text-blue-400">{currentUser}</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === item.id 
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                        >
                            <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-800 text-xs text-gray-600 text-center">
                    WikitDB v2.0 <br/> Secure Connection
                </div>
            </aside>

            {/* 右侧主内容区 (Main Content) */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 border-b border-gray-800 bg-gray-900/50 flex items-center px-8 shrink-0">
                    <h2 className="text-lg font-bold text-white">
                        {navItems.find(i => i.id === activeTab)?.label}
                    </h2>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* 仪表盘占位 */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <div className="text-gray-400 text-sm mb-2">系统总用户数</div>
                                <div className="text-3xl font-mono font-bold text-white">{users.length || '--'}</div>
                            </div>
                            <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <div className="text-gray-400 text-sm mb-2">资金池总额 (¥)</div>
                                <div className="text-3xl font-mono font-bold text-green-400">
                                    {users.reduce((sum, u) => sum + (Number(u.balance) || 0), 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <div className="text-gray-400 text-sm mb-2">系统状态</div>
                                <div className="text-xl font-bold text-cyan-400 flex items-center gap-2 mt-2">
                                    <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                                    运行良好
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 成员管理核心模块 */}
                    {activeTab === 'members' && (
                        <div className="flex flex-col gap-4 h-full">
                            {/* 工具栏 */}
                            <div className="flex justify-between items-center bg-gray-800/40 p-4 rounded-xl border border-gray-700">
                                <div className="relative w-72">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                                    <input 
                                        type="text" 
                                        placeholder="搜索系统名称或 Wikidot 账号..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <button onClick={fetchUsers} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors">
                                    <i className={`fa-solid fa-rotate-right mr-2 ${isLoading ? 'animate-spin' : ''}`}></i>
                                    刷新数据
                                </button>
                            </div>

                            {/* 数据表格 */}
                            <div className="bg-gray-800/40 rounded-xl border border-gray-700 overflow-hidden shadow-xl flex-1 flex flex-col">
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-900/80 text-gray-400 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4 font-medium border-b border-gray-700">系统账户</th>
                                                <th className="px-6 py-4 font-medium border-b border-gray-700">Wikidot 绑定</th>
                                                <th className="px-6 py-4 font-medium border-b border-gray-700">账户余额</th>
                                                <th className="px-6 py-4 font-medium border-b border-gray-700">身份组</th>
                                                <th className="px-6 py-4 font-medium border-b border-gray-700">状态</th>
                                                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {isLoading && users.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                        <i className="fa-solid fa-circle-notch animate-spin text-xl mb-2 block"></i>
                                                        正在读取数据库...
                                                    </td>
                                                </tr>
                                            ) : filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">没有找到匹配的用户</td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map((u, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-800/60 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-white">{u.username}</td>
                                                        <td className="px-6 py-4 text-blue-400 font-mono">{u.wikidotAccount || '未绑定'}</td>
                                                        <td className="px-6 py-4 font-mono text-green-400">¥{(Number(u.balance) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                                                                u.role === 'admin' ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-gray-800 text-gray-400 border-gray-700'
                                                            }`}>
                                                                {u.role === 'admin' ? '管理员' : '普通成员'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {u.status === 'banned' ? (
                                                                <span className="text-red-400 flex items-center gap-1"><i className="fa-solid fa-lock text-xs"></i> 已封禁</span>
                                                            ) : (
                                                                <span className="text-green-400 flex items-center gap-1"><i className="fa-solid fa-check text-xs"></i> 正常</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-2">
                                                            {u.status === 'banned' ? (
                                                                <button onClick={() => handleUserAction(u.username, 'unban')} className="p-2 bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white rounded transition-colors" title="解除封禁">
                                                                    <i className="fa-solid fa-unlock"></i>
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleUserAction(u.username, 'ban')} className="p-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors" title="封禁用户">
                                                                    <i className="fa-solid fa-ban"></i>
                                                                </button>
                                                            )}

                                                            {u.role === 'admin' ? (
                                                                <button onClick={() => handleUserAction(u.username, 'demote')} className="p-2 bg-gray-700 hover:bg-orange-600 text-gray-300 hover:text-white rounded transition-colors" title="降级为普通成员">
                                                                    <i className="fa-solid fa-user-minus"></i>
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleUserAction(u.username, 'promote')} className="p-2 bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white rounded transition-colors" title="提升为管理员">
                                                                    <i className="fa-solid fa-user-shield"></i>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-gray-900/80 px-6 py-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between items-center">
                                    <span>显示 {filteredUsers.length} 条记录</span>
                                    <span>系统底层直接读取 Redis 键值</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 系统设置占位 */}
                    {activeTab === 'settings' && (
                        <div className="bg-gray-800/40 p-8 rounded-xl border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">系统全局设定</h3>
                            <p className="text-gray-400">设置模块正在建设中，未来将支持在此处调整经济系统汇率及大盘基准点数。</p>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
