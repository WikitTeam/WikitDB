import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
const config = require('../wikitdb.config.js');

const PageDetail = () => {
    const router = useRouter();
    const { site, page } = router.query;
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('源码');

    const tabs = ['源码', '信息', '历史', '评分'];

    const fetchPageData = async () => {
        if (!site || !page) return;
        setLoading(true);
        setError(null);
        
        try {
            const apiUrl = `/api/page?site=${site}&page=${encodeURIComponent(page)}`;
            const res = await fetch(apiUrl);
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.details || result.error || '请求失败');
            }
            
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (router.isReady) {
            fetchPageData();
        }
    }, [router.isReady, site, page]);

    if (loading) {
        return <div className="py-12 text-center text-gray-400">加载详情数据中...</div>;
    }

    if (error) {
        return (
            <div className="py-12 text-center">
                <div className="text-red-400 mb-4">加载失败: {error}</div>
                <button onClick={() => router.back()} className="text-indigo-400 hover:text-indigo-300">返回上一页</button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <>
            <Head>
                <title>{`${data.title} - ${config.SITE_NAME}`}</title>
            </Head>

            <div className="py-4">
                <div className="mb-4 text-sm text-gray-400">
                    页面详情
                </div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 bg-gray-800/50 p-4 rounded-xl border border-white/10">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 h-12 w-12 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden border border-gray-700 shrink-0">
                            {data.siteImg && <img src={data.siteImg} alt="site logo" className="h-8 w-8 object-contain" />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white break-all">{data.title}</h1>
                            
                            <div className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
                                {data.tags && data.tags.length > 0 && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-gray-500 shrink-0">页面标签:</span>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {data.tags.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-gray-700/50 rounded text-gray-300 border border-gray-600/30">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">创建者:</span>
                                        <div className="flex items-center text-indigo-400">
                                            {data.creatorAvatar && (
                                                <img src={data.creatorAvatar} alt="avatar" className="w-4 h-4 rounded-full mr-1.5 object-cover" />
                                            )}
                                            {data.creatorName}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">原网页最后更新:</span>
                                        <span>{data.lastUpdated}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">页面评分:</span>
                                        <span className={`font-medium ${data.rating.includes('+') ? 'text-green-400' : data.rating.includes('-') ? 'text-red-400' : 'text-gray-300'}`}>
                                            {data.rating}
                                        </span>
                                    </div>
                                    {/* 页面 ID 紧贴在页面评分右侧 */}
                                    {data.pageId && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">页面 ID:</span>
                                            <span className="font-medium text-gray-300">
                                                {data.pageId}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                        <a 
                            href={data.originalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> 在原站打开
                        </a>
                        <button 
                            onClick={fetchPageData}
                            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                            <i className="fa-solid fa-rotate-right mr-1"></i> 刷新页面
                        </button>
                        <button 
                            onClick={() => router.back()}
                            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                            <i className="fa-solid fa-arrow-left mr-1"></i> 返回
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors">
                        编辑
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 transition-colors">
                        强制覆盖
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors">
                        删除
                    </button>
                </div>

                <div className="border-b border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab
                                        ? 'border-indigo-500 text-indigo-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="bg-gray-800/30 rounded-xl p-6 border border-white/5 min-h-[400px]">
                    {activeTab === '源码' && (
                        <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto border border-gray-700">
                            <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono break-all">
                                {data.sourceCode}
                            </pre>
                        </div>
                    )}

                    {activeTab === '信息' && (
                        <div className="space-y-4 text-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="text-gray-500 text-sm mb-1">页面标题</div>
                                    <div className="font-medium text-white">{data.title}</div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="text-gray-500 text-sm mb-1">来源站点</div>
                                    <div>{data.siteName}</div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="text-gray-500 text-sm mb-1">创建者 / 搬运者</div>
                                    <div className="flex items-center">
                                        {data.creatorAvatar && (
                                            <img src={data.creatorAvatar} alt="avatar" className="w-5 h-5 rounded-full mr-2 object-cover" />
                                        )}
                                        {data.creatorName}
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="text-gray-500 text-sm mb-1">原站最后更新时间</div>
                                    <div>{data.lastUpdated}</div>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                <div className="text-gray-500 text-sm mb-1">完整原始链接</div>
                                <a href={data.originalUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">
                                    {data.originalUrl}
                                </a>
                            </div>
                        </div>
                    )}

                    {activeTab === '历史' && (
                        <div className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto border border-gray-700">
                            <div 
                                className="prose prose-invert max-w-none text-sm prose-table:w-full prose-th:text-left prose-td:border-t prose-td:border-gray-700 prose-th:p-2 prose-td:p-2 prose-td:whitespace-nowrap break-normal prose-img:inline-block prose-img:w-5 prose-img:h-5 prose-img:rounded-full prose-img:m-0 prose-img:mr-1.5 prose-img:align-middle"
                                dangerouslySetInnerHTML={{ __html: data.historyHtml }}
                            />
                        </div>
                    )}

                    {activeTab === '评分' && (
                        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                            {data.ratingTable && data.ratingTable.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {data.ratingTable.map((rate, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-600/50 hover:border-gray-500 transition-colors">
                                            <img 
                                                src={rate.avatar} 
                                                alt={rate.user} 
                                                className="w-8 h-8 rounded object-cover border border-gray-600"
                                                onError={(e) => { e.target.src = 'https://www.wikidot.com/local--favicon/favicon.gif'; }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <Link 
                                                    href={`/authors?name=${encodeURIComponent(rate.user)}`} 
                                                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 truncate block"
                                                >
                                                    {rate.user}
                                                </Link>
                                            </div>
                                            <span className={`text-sm font-bold px-2 py-0.5 rounded ${rate.vote === '+1' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                {rate.vote === '+1' ? '+1' : '-1'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    暂无评分数据，或该页面未被任何人评分。
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PageDetail;
