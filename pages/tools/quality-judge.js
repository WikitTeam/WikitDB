// pages/tools/quality-judge.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';

export default function QualityJudge() {
    // 交易标的和基础状态
    const [recentPages, setRecentPages] = useState([]);
    const [selectedPage, setSelectedPage] = useState(null);
    
    // 对应你的 API 接口字段
    const [username, setUsername] = useState('Laimu_slime'); // 临时替代登录态
    const [direction, setDirection] = useState('long'); // 做多(long)或做空(short)
    const [margin, setMargin] = useState(100);
    const [leverage, setLeverage] = useState(1);
    const [lockType, setLockType] = useState('none');

    // 交互反馈
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    // 页面加载时去 GraphQL 拉一下最近的页面数据供用户选择
    useEffect(() => {
        const fetchRecentPages = async () => {
            try {
                const query = {
                    query: `
                        query {
                            articles(page: 1, pageSize: 10) {
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
            }
        };
        fetchRecentPages();
    }, []);

    // 提交开仓表单到你的后端接口
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPage) {
            setMessage('请先在左侧选择一个要交易的页面');
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
                    site: selectedPage.wiki,
                    pageId: selectedPage.page,
                    pageTitle: selectedPage.title,
                    direction,
                    lockType,
                    margin: Number(margin),
                    leverage: Number(leverage)
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                setMessage(data.error || '开仓请求失败');
            } else {
                setMessage(`开仓成功！流水号: ${data.tradeId}，最新余额: ¥${data.newBalance.toFixed(2)}`);
            }
        } catch (error) {
            setMessage('网络错误，请检查接口状态');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <Head>
                <title>页面质量评断 (打新) - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6">
                <div className="border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-white tracking-tight">页面质量评断与打新</h1>
                    <p className="mt-2 text-gray-400 text-sm">预测新页面的评分走向。支持做多与做空。</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 左侧：选择标的 */}
                    <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">第一步：选择标的页面</h2>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {recentPages.length === 0 ? (
                                <div className="text-gray-500">正在拉取页面数据...</div>
                            ) : (
                                recentPages.map((pageData) => (
                                    <div 
                                        key={`${pageData.wiki}-${pageData.page}`}
                                        onClick={() => setSelectedPage(pageData)}
                                        className={`p-4 rounded-lg cursor-pointer border transition-colors ${
                                            selectedPage?.page === pageData.page 
                                            ? 'bg-blue-900/30 border-blue-500' 
                                            : 'bg-gray-900/50 border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        <div className="text-white font-medium break-all">{pageData.title}</div>
                                        <div className="flex justify-between mt-2 text-sm text-gray-400">
                                            <span>站点: {pageData.wiki}</span>
                                            <span>当前评分: {pageData.rating}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 右侧：交易表单 */}
                    <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">第二步：设置仓位参数</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">测试用户名 (暂代登录)</label>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">交易方向</label>
                                    <select 
                                        value={direction}
                                        onChange={(e) => setDirection(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="long">做多 (看涨评分)</option>
                                        <option value="short">做空 (看跌评分)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">锁仓类型</label>
                                    <select 
                                        value={lockType}
                                        onChange={(e) => setLockType(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="none">无锁仓</option>
                                        <option value="time">时间锁</option>
                                        <option value="target">目标价锁</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">保证金金额</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={margin}
                                        onChange={(e) => setMargin(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">预估手续费: ¥{(margin * 0.01).toFixed(2)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">杠杆倍数</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="100"
                                        value={leverage}
                                        onChange={(e) => setLeverage(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-700">
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                                        isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'
                                    }`}
                                >
                                    {isSubmitting ? '正在提交...' : '确认开仓'}
                                </button>
                            </div>

                            {message && (
                                <div className={`p-4 rounded-lg mt-4 ${message.includes('成功') ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                                    {message}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
