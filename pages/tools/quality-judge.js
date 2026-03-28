// pages/tools/quality-judge.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

// 独立的页面交易卡片组件
const PageTradeCard = ({ pageData, username }) => {
    const [direction, setDirection] = useState('long');
    const [margin, setMargin] = useState(100);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [statusType, setStatusType] = useState(''); // 'success' 或 'error'

    const handleSubmit = async () => {
        if (!username) {
            setMessage('请先在顶部设置操作账户');
            setStatusType('error');
            return;
        }
        
        const marginNum = Number(margin);
        if (isNaN(marginNum) || marginNum <= 0) {
            setMessage('请输入有效的金额');
            setStatusType('error');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const res = await fetch('/api/trade/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    site: pageData.wiki,
                    pageId: pageData.page,
                    pageTitle: pageData.title,
                    direction,
                    lockType: 'none', // 快捷模式默认不锁仓
                    margin: marginNum,
                    leverage: 1       // 快捷模式默认1倍杠杆
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                setMessage(data.error || '开仓失败');
                setStatusType('error');
            } else {
                setMessage(`开仓成功！最新余额: ¥${data.newBalance.toFixed(2)}`);
                setStatusType('success');
            }
        } catch (error) {
            setMessage('网络错误，请检查接口');
            setStatusType('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-5 flex flex-col justify-between hover:border-gray-500 transition-colors shadow-lg">
            {/* 顶部：标的信息 */}
            <div className="mb-4">
                <div className="text-white font-bold text-lg leading-snug break-all mb-2 line-clamp-2" title={pageData.title}>
                    {pageData.title}
                </div>
                <div className="flex gap-3 text-xs text-gray-400 font-mono">
                    <span className="bg-gray-900/80 px-2 py-1 rounded border border-gray-700">站点: {pageData.wiki}</span>
                    <span className="bg-blue-900/20 text-blue-400 px-2 py-1 rounded border border-blue-900/50">当前评分: {pageData.rating}</span>
                </div>
            </div>
            
            {/* 中间：快捷参数输入 */}
            <div className="flex gap-3 mb-4 mt-auto">
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">方向</label>
                    <select 
                        value={direction}
                        onChange={(e) => setDirection(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                    >
                        <option value="long">做多 (看涨)</option>
                        <option value="short">做空 (看跌)</option>
                    </select>
                </div>
                <div className="flex-1 relative">
                    <label className="block text-xs text-gray-500 mb-1">保证金 (¥)</label>
                    <input 
                        type="number" 
                        min="1"
                        value={margin}
                        onChange={(e) => setMargin(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                        placeholder="金额"
                    />
                </div>
            </div>

            {/* 底部：操作按钮与反馈 */}
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-lg font-bold text-white text-sm transition-colors ${
                    isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 
                    direction === 'long' ? 'bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.3)]' : 
                    'bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                }`}
            >
                {isSubmitting ? '正在提交...' : direction === 'long' ? '确认买入 (做多)' : '确认买入 (做空)'}
            </button>

            {message && (
                <div className={`mt-3 text-xs p-2.5 rounded-lg font-medium ${
                    statusType === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 'bg-red-900/30 text-red-400 border border-red-800/50'
                }`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default function QualityJudge() {
    const [recentPages, setRecentPages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 全局操作账户设置
    const [globalUsername, setGlobalUsername] = useState('Laimu_slime');

    useEffect(() => {
        const fetchRecentPages = async () => {
            try {
                // 拉取 12 条数据填满网格
                const query = {
                    query: `
                        query {
                            articles(page: 1, pageSize: 12) {
                                nodes {
                                    wiki
                                    page
                                    title
                                    rating
                                }
                            }
                        }
                    `
                };
                const res = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(query)
                });
                const result = await res.json();
                if (result.data && result.data.articles) {
                    setRecentPages(result.data.articles.nodes);
                }
            } catch (error) {
                console.error("拉取页面列表失败", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecentPages();
    }, []);

    return (
        <>
            <Head>
                <title>页面质量评断 (打新) - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6 pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-800 pb-4 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">页面质量评断与打新</h1>
                        <p className="mt-2 text-gray-400 text-sm">自动抓取各站最新发布的页面。直接在卡片上设置投资额并快速开仓。</p>
                    </div>
                    
                    {/* 全局用户设置区域 */}
                    <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-700 w-full md:w-auto flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-900/50 text-blue-400 rounded-lg flex items-center justify-center text-lg">
                            <i className="fa-solid fa-wallet"></i>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">当前操作账户 (暂代登录)</label>
                            <input 
                                type="text" 
                                value={globalUsername}
                                onChange={(e) => setGlobalUsername(e.target.value)}
                                className="w-full md:w-48 bg-gray-900 border border-gray-600 rounded px-3 py-1 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                                placeholder="输入用户名"
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20 text-blue-500 gap-3 font-mono">
                        <i className="fa-solid fa-circle-notch animate-spin text-xl"></i>
                        正在接入全网节点拉取最新页面数据...
                    </div>
                ) : recentPages.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        暂无最新页面数据
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {recentPages.map((pageData) => (
                            <PageTradeCard 
                                key={`${pageData.wiki}-${pageData.page}`} 
                                pageData={pageData} 
                                username={globalUsername} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
