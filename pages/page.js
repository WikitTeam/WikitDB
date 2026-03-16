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

    useEffect(() => {
        if (!router.isReady) return;

        const fetchPageData = async () => {
            try {
                const res = await fetch(`/api/page?site=${site}&page=${encodeURIComponent(page)}`);
                const result = await res.json();
                
                if (!res.ok) {
                    throw new Error(result.details || result.error || '获取页面详情失败');
                }
                
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [router.isReady, site, page]);

    if (loading) return <div className="py-12 text-center text-gray-400">正在抓取页面详情...</div>;
    
    if (error) return (
        <div className="py-12 text-center">
            <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900/50 inline-block">
                {error}
            </div>
        </div>
    );

    if (!data) return null;

    return (
        <>
            <Head>
                <title>{`${data.title} - ${config.SITE_NAME}`}</title>
            </Head>

            <div className="py-8 max-w-5xl mx-auto">
                {/* 页面头部 */}
                <div className="mb-8 border-b border-gray-700 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h1 className="text-3xl font-bold text-white break-words">{data.title}</h1>
                        <a 
                            href={data.pageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-center"
                        >
                            在原站打开页面
                        </a>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {data.authorAvatar && (
                            <img 
                                src={data.authorAvatar} 
                                alt={data.authorName} 
                                className="w-12 h-12 rounded bg-gray-900 border border-gray-600"
                                onError={(e) => { e.target.src = 'https://www.wikidot.com/local--favicon/favicon.gif'; }}
                            />
                        )}
                        <div>
                            <div className="text-sm text-gray-400 mb-1">页面创建者</div>
                            {data.authorName ? (
                                <Link 
                                    href={`/authors?name=${encodeURIComponent(data.authorName)}`}
                                    className="text-lg font-medium text-indigo-400 hover:text-indigo-300"
                                >
                                    {data.authorName}
                                </Link>
                            ) : (
                                <span className="text-gray-500">未知作者</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 页面正文内容 */}
                <div className="bg-gray-800/30 rounded-xl p-6 border border-white/5 mb-8 overflow-hidden">
                    <div 
                        className="wikidot-content prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: data.contentHtml }} 
                    />
                </div>

                {/* 评分表展示区域 */}
                {data.ratingTable && data.ratingTable.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10 mb-8">
                        <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                            评分详情 (Rating Details)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {data.ratingTable.map((rate, index) => (
                                <div key={index} className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
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
                    </div>
                )}

                {/* 页面历史记录 */}
                {data.history && data.history.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                            历史记录 (History)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700 text-gray-400">
                                        <th className="py-3 px-4 font-medium">版本</th>
                                        <th className="py-3 px-4 font-medium">编辑者</th>
                                        <th className="py-3 px-4 font-medium">时间</th>
                                        <th className="py-3 px-4 font-medium">备注</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    {data.history.map((item, index) => (
                                        <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="py-3 px-4">{item.rev}</td>
                                            <td className="py-3 px-4">
                                                <Link 
                                                    href={`/authors?name=${encodeURIComponent(item.user)}`}
                                                    className="text-indigo-400 hover:text-indigo-300"
                                                >
                                                    {item.user}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500">{item.date}</td>
                                            <td className="py-3 px-4 text-gray-400">{item.comments || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PageDetail;
