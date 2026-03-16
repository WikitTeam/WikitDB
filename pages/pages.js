import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
const config = require('../wikitdb.config.js');

const Pages = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedSite, setSelectedSite] = useState(config.SUPPORT_WIKI[0]?.PARAM);

    const fetchCrawlerData = async (siteParam) => {
        setLoading(true);
        setError(null);
        setData(null);
        
        try {
            const apiUrl = `${window.location.origin}/api/crawler?site=${siteParam}`;
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
        if (selectedSite) {
            setSearchQuery('');
            fetchCrawlerData(selectedSite);
        }
    }, [selectedSite]);

    const filteredLinks = data?.links?.filter(link => 
        link.text.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // 核心提取：无论原站返回的 href 是什么格式，统一剥离出最终的 page 页面名
    const getPageName = (href) => {
        return href.split('|')[0].split('#')[0].replace(/\/$/, '').split('/').pop();
    };

    return (
        <>
            <Head>
                <title>{`全站导航 - ${config.SITE_NAME}`}</title>
            </Head>

            <div className="py-8">
                <h1 className="text-3xl font-bold text-white mb-8">站点页面全量索引</h1>

                <div className="mb-8 flex flex-wrap gap-4">
                    {config.SUPPORT_WIKI.map((wiki) => (
                        <button
                            key={wiki.PARAM}
                            onClick={() => setSelectedSite(wiki.PARAM)}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                selectedSite === wiki.PARAM 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {wiki.NAME}
                        </button>
                    ))}
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10 min-h-[300px]">
                    {loading && (
                        <div className="text-gray-400 flex items-center">
                            正在读取全站索引数据 (这可能需要几秒钟)...
                        </div>
                    )}
                    
                    {error && (
                        <div className="text-red-400">
                            抓取错误: {error}
                        </div>
                    )}
                    
                    {data && (
                        <div>
                            <div className="mb-6 border-b border-gray-700 pb-4">
                                <h2 className="text-xl font-semibold text-white mb-2">
                                    来源站点: {data.siteName}
                                </h2>
                                <p className="text-gray-400">
                                    索引模式: {data.pageTitle}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h3 className="text-lg text-gray-300">
                                    提取到的页面总数: {data.links ? data.links.length : 0}
                                </h3>
                                
                                <div className="relative w-full sm:w-72">
                                    <input
                                        type="text"
                                        placeholder="搜索当前站点的页面标题..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 placeholder-gray-500 transition-colors"
                                    />
                                </div>
                            </div>
                            
                            {filteredLinks.length > 0 ? (
                                <div className="max-h-[600px] overflow-y-auto pr-4 border border-gray-700/50 rounded-lg p-4 bg-gray-900/30">
                                    <ul className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                                        {filteredLinks.map((link, index) => (
                                            <li key={index} className="text-gray-400 flex items-baseline gap-2 truncate">
                                                <span className="text-gray-600 text-xs w-8 shrink-0">{index + 1}.</span>
                                                <Link 
                                                    href={`/page?site=${selectedSite}&page=${encodeURIComponent(getPageName(link.href))}`}
                                                    className="hover:text-indigo-400 text-indigo-300 transition-colors truncate"
                                                    title={link.text}
                                                >
                                                    {link.text}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="text-center py-12 border border-dashed border-gray-700 rounded-lg bg-gray-900/20">
                                    <p className="text-gray-500">
                                        {searchQuery ? '未找到包含该关键词的页面。' : '未能解析到任何页面。'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Pages;
