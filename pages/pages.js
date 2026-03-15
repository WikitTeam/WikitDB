import React, { useState, useEffect } from 'react';
import Head from 'next/head';
const config = require('../wikitdb.config.js');

const Pages = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
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
            fetchCrawlerData(selectedSite);
        }
    }, [selectedSite]);

    return (
        <>
            <Head>
                <title>{`页面抓取 - ${config.SITE_NAME}`}</title>
            </Head>

            <div className="py-8">
                <h1 className="text-3xl font-bold text-white mb-8">实时页面数据提取</h1>

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
                            正在从服务器抓取数据并解析...
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
                                    解析到的网页标签标题: {data.pageTitle}
                                </p>
                            </div>

                            <h3 className="text-lg text-gray-300 mb-4">提取到的正文链接 (Top 10):</h3>
                            
                            {data.links && data.links.length > 0 ? (
                                <ul className="space-y-3">
                                    {data.links.map((link, index) => (
                                        <li key={index} className="text-gray-400 flex flex-col sm:flex-row sm:items-baseline gap-2">
                                            <span className="text-gray-500 w-6">{(index + 1).toString().padStart(2, '0')}.</span>
                                            <a 
                                                href={link.href} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="hover:text-indigo-400 text-indigo-300 transition-colors break-all"
                                            >
                                                {link.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">该页面正文区域未解析到超链接。</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Pages;
