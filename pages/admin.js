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
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const handleUserAction = async (targetUser, action) => {
        if (action === 'delete') {
            if (!confirm(`警告：确定要永久抹除 ${targetUser} 的档案吗？`)) return;
            if (!confirm(`再次确认：彻底删除操作不可逆转！`)) return;
        } else {
            if (!confirm(`确定要对 ${targetUser} 执行此操作吗？`)) return;
        }

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUser, action, operator: currentUser })
            });
            if (res.ok) {
                fetchUsers();
            } else {
                alert((await res.json()).error || '操作失败');
            }
        } catch (e) { 
            alert('请求失败'); 
        }
    };

    const handleInspect = async (username) => {
        setInspectTarget(username);
        setInspectData(null);
        try {
            const res = await fetch(`/api/admin/user-assets?username=${username}`);
            if (res.ok) setInspectData((await res.json()).portfolio);
        } catch (e) {
            console.error(e);
        }
    };

    // 审计日志逻辑
    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/logs');
            if (res.ok) setLogs((await res.json()).logs || []);
        } catch (e) {
            console.error(e);
        }
    };

    // 广播逻辑
    const fetchBroadcast = async () => {
        try {
            const res = await fetch('/api/admin/broadcast');
            if (res.ok) setBroadcastMsg((await res.json()).message || '');
        } catch (e) {
            console.error(e);
        }
    };

    const saveBroadcast = async () => {
        try {
            await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: broadcastMsg })
            });
            alert('广播设置成功，刷新页面即可在顶栏看到。清空文本保存可取消广播。');
        } catch (e) { 
            alert('保存失败'); 
        }
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
        } catch (e) { 
            alert('执行失败'); 
        }
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
        } catch (e) { 
            alert('操作失败'); 
        }
    };

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const navItems = [
        { id: 'members', label: '成员管理', icon: 'fa-users' },
        { id: 'logs', label: '交易审计', icon: 'fa-list-check' },
        { id: 'broadcast', label: '全站广播', icon: 'fa-bullhorn' },
        { id: 'macro', label: '宏观经济', icon: 'fa-money-bill-trend-up' },
        { id: 'redis', label: '裸键终端', icon: 'fa-terminal' }
    ];

    if (!currentUser) return (
        <div className="min-h-screen flex items-center justify-center text-red-600 bg-gray-50 font-bold text-lg">
            <i className="fa-solid fa-lock mr-2"></i> 未登录，拒绝访问控制台
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-gray-800 flex overflow-hidden font-sans">
            <Head><title>中央控制台 - WikitDB</title></Head>

            {/* 侧边栏 */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm z-10">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-blue-600 tracking-tight flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved"></i>
                        WIKIT ADMIN
                    </h1>
                </div>
                
                <div className="p-6 pb-2">
                    <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">系统模块</div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    isActive 
                                    ? 'bg-blue-50 text-blue-700' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <i className={`fa-solid ${item.icon} w-5 text-center ${isActive ? 'text-blue-600' : 'text-gray-400'}`}></i>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {currentUser.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-sm font-bold text-gray-900 leading-none">{currentUser}</span>
                            <span className="text-xs text-gray-500 mt-1">系统操作员</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shrink-0 justify-between">
                    <h2 className="text-lg font-bold text-gray-800">
                        {navItems.find(i => i.id === activeTab)?.label}
                    </h2>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        系统运行正常
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    
                    {/* 模块1：成员管理 */}
                    {activeTab === 'members' && (
                        <div className="flex flex-col gap-6 h-full max-w-7xl mx-auto">
                            {/* 顶部操作栏 */}
                            <div className="flex justify-between items-center">
                                <div className="relative w-80">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                    <input 
                                        type="text" 
                                        placeholder="搜索用户名称..." 
                                        value={searchQuery} 
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                    />
                                </div>
                                <button onClick={fetchUsers} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-gray-700 transition-colors shadow-sm font-medium flex items-center gap-2">
                                    <i className={`fa-solid fa-rotate-right ${isLoading ? 'animate-spin text-blue-500' : 'text-gray-400'}`}></i>
                                    刷新表格
                                </button>
                            </div>

                            {/* 表格卡片 */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 flex flex-col">
                                <div className="overflow-x-auto flex-1">
                                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-gray-600">系统账户</th>
                                                <th className="px-6 py-4 font-semibold text-gray-600">Wikidot 绑定</th>
                                                <th className="px-6 py-4 font-semibold text-gray-600">账户余额</th>
                                                <th className="px-6 py-4 font-semibold text-gray-600">状态标签</th>
                                                <th className="px-6 py-4 font-semibold text-gray-600 text-right">管理操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredUsers.map(u => (
                                                <tr key={u.username} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{u.username}</td>
                                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{u.wikidotAccount || '-'}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-900 font-medium">¥ {Number(u.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                    <td className="px-6 py-4 space-x-2">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                                                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {u.role === 'admin' ? '管理员' : '普通成员'}
                                                        </span>
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                                                            u.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                        }`}>
                                                            {u.status === 'banned' ? '封禁中' : '正常'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button onClick={() => handleInspect(u.username)} className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 rounded-md transition-colors" title="资产透视">资产透视</button>
                                                        
                                                        {u.status === 'banned' ? (
                                                            <button onClick={() => handleUserAction(u.username, 'unban')} className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200 text-gray-600 rounded-md transition-colors" title="解封">解封</button>
                                                        ) : (
                                                            <button onClick={() => handleUserAction(u.username, 'ban')} className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 text-gray-600 rounded-md transition-colors" title="封禁">封禁</button>
                                                        )}

                                                        {u.role === 'admin' ? (
                                                            <button onClick={() => handleUserAction(u.username, 'demote')} className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-md transition-colors" title="降级">降权</button>
                                                        ) : (
                                                            <button onClick={() => handleUserAction(u.username, 'promote')} className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-gray-600 rounded-md transition-colors" title="提权">提权</button>
                                                        )}
                                                        
                                                        {u.role === 'admin' && (
                                                            <button onClick={() => handleUserAction(u.username, 'infinite')} className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-gray-600 rounded-md transition-colors" title="无限财富"><i className="fa-solid fa-infinity"></i></button>
                                                        )}
                                                        <button onClick={() => handleUserAction(u.username, 'delete')} className="px-3 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 rounded-md transition-colors font-medium" title="永久删除">删除</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-xs text-gray-500 font-medium">
                                    当前列表共 {filteredUsers.length} 名成员
                                </div>
                            </div>
                            
                            {/* 透视面板 */}
                            {inspectData && (
                                <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                                    <div className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <i className="fa-solid fa-box-open text-blue-500"></i>
                                        [{inspectTarget}] 的底层持仓数据：
                                    </div>
                                    <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 p-4 rounded-lg font-mono overflow-auto">{JSON.stringify(inspectData, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 模块2：审计天眼 */}
                    {activeTab === 'logs' && (
                        <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">全网交易流水记录</h3>
                                <button onClick={fetchLogs} className="text-sm text-blue-600 hover:text-blue-800 font-medium">刷新记录</button>
                            </div>
                            <div className="p-6 space-y-3 text-sm">
                                {logs.length === 0 ? <div className="text-gray-500 text-center py-8">暂无流水记录</div> : 
                                    logs.map((log, i) => (
                                    <div key={i} className="px-4 py-3 border border-gray-100 bg-gray-50 hover:bg-white rounded-lg flex items-center gap-6 transition-colors">
                                        <span className="text-gray-400 font-mono text-xs">{new Date(log.time).toLocaleString()}</span>
                                        <span className="font-bold text-gray-700 w-32 truncate">{log.username}</span>
                                        <span className="flex-1 text-gray-600">
                                            执行了 <span className={log.action === 'buy' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{log.action === 'buy' ? '买入' : '卖出'}</span> 操作： 
                                            <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded mx-1">{log.target}</span> 
                                            数量 <span className="font-bold">{log.amount}</span> 份，单价 <span className="font-mono text-gray-800">¥{log.price}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 模块3：全局广播 */}
                    {activeTab === 'broadcast' && (
                        <div className="max-w-2xl mx-auto bg-white border border-gray-200 p-8 rounded-xl shadow-sm space-y-6">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg mb-1">全站紧急广播设置</h3>
                                <p className="text-sm text-gray-500">此内容将以红色警报横幅的形式，置顶显示在所有用户的页面最上方。</p>
                            </div>
                            <textarea 
                                value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                                className="w-full h-32 bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                                placeholder="输入需要通知全站的紧急消息... (留空保存则为撤销广播)"
                            />
                            <div className="flex justify-end">
                                <button onClick={saveBroadcast} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors">
                                    保存并推送到全站
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 模块4：宏观调控 */}
                    {activeTab === 'macro' && (
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-lg"><i className="fa-solid fa-parachute-box"></i></div>
                                        <h3 className="font-bold text-gray-800 text-lg">空投津贴 (Airdrop)</h3>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4 ml-13">无差别向所有已注册的系统账户发放固定额度的资金，用于刺激交易活跃度。</p>
                                    <div className="flex gap-3">
                                        <input type="number" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 w-48 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="额度"/>
                                        <button onClick={() => executeMacro('airdrop')} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition-colors">执行空投</button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg"><i className="fa-solid fa-scale-unbalanced"></i></div>
                                        <h3 className="font-bold text-gray-800 text-lg">财富税征收 (Tax)</h3>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4 ml-13">按设定的百分比，强制扣除所有用户当前账户余额的一部分，用于回收流动性。</p>
                                    <div className="flex gap-3">
                                        <div className="relative w-48">
                                            <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg pl-4 pr-8 py-2 w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="比例"/>
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                                        </div>
                                        <button onClick={() => executeMacro('tax')} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors">执行扣款</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 模块5：裸键终端 */}
                    {activeTab === 'redis' && (
                        <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-gray-900 px-6 py-3 flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="text-xs text-gray-400 font-mono tracking-widest">REDIS RAW CONSOLE</span>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-lg text-sm mb-6 flex gap-3 items-start">
                                    <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                    <div>
                                        <p className="font-bold">高危操作区域</p>
                                        <p>在此处修改数据将绕过所有业务逻辑代码的检查，直接覆写底层数据库，格式错误可能导致网站白屏崩溃。</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">Key:</span>
                                        <input type="text" value={redisKey} onChange={e => setRedisKey(e.target.value)} placeholder="如 user:Laimu_slime" className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-12 pr-4 py-2.5 text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                                    </div>
                                    <button onClick={() => queryRedis('get')} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors">查询数据</button>
                                </div>
                                <textarea 
                                    value={redisValue} onChange={e => setRedisValue(e.target.value)} 
                                    className="w-full h-80 bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" 
                                    placeholder="Value 数据区域..."
                                />
                                <button onClick={() => queryRedis('set')} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-file-code"></i> 强制覆盖写入
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
