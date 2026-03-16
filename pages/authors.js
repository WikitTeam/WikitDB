import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
const config = require('../wikitdb.config.js');

const AuthorProfile = () => {
    const router = useRouter();
    const { name } = router.query;

    const [searchInput, setSearchInput] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (router.isReady && name) {
            setSearchInput(name);
            fetchAuthorData(name);
        }
    }, [router.isReady, name]);

    const fetchAuthorData = async (authorName) => {
        if (!authorName) return;
        setLoading(true);
        setError(null);
        setData(null);

        try {
            const res = await fetch(`/api/author?name=${encodeURIComponent(authorName)}`);
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.details || result.error || '请求失败');
            }

            // 按时间倒序排列作品列表 (最新的在前)
            if (result.pages && result.pages.length > 0) {
                result.pages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            router.push(`/author?name=${encodeURIComponent(searchInput.trim())}`, undefined, { shallow: true });
        }
    };

    return (
        <>
            <Head>
                <title>{data ? `${data.name} 的主页 - ${config.SITE_NAME}` : `作者查询 - ${config.SITE_NAME}`}</title>
            </Head>

            <div className="py-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-700 pb-6">
                    <h1 className="text-3xl font-bold text-white">作者信息查询</h1>
                    
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="输入 Wikidot 用户名..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 placeholder-gray-500 transition-colors"
                        />
                        <button type="submit" className="absolute right-2.5 bottom-2 text-gray-400 hover:text-white">
                            搜索
                        </button>
                    </form>
                </div>

                {loading && (
                    <div className="text-gray-400 flex items-center justify-center py-12">
                        正在从 Wikit GraphQL 检索数据...
                    </div>
                )}

                {error && (
                    <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900/50">
                        检索失败: {error}
                    </div>
                )}

                {data && (
                    <div className="space-y-8">
                        {/* 头部信息 */}
                        <div className="flex items-center gap-6">
                            <img 
                                src={data.avatar} 
                                alt={data.name} 
                                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-700"
                                onError={(e) => { e.target.src = 'https://www.wikidot.com/local--favicon/favicon.gif'; }}
                            />
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">{data.name}</h2>
                                <div className="text-sm text-gray-400">
                                    Wikidot Profile 数据同步自 Wikit GraphQL
                                </div>
                            </div>
                        </div>

                        {/* 数据总览 (Overview) */}
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
                            <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Overview (全站数据统计)</h3>
                            <p className="text-gray-300 leading-relaxed">
                                <span className="font-semibold text-indigo-400">{data.name}</span> is ranked <span className="font-semibold text-white">#{data.globalRank}</span>, 
                                with a total of <span className="font-semibold text-white">{data.totalPages}</span> pages 
                                having a total rating of <span className="font-semibold text-green-400">+{data.totalRating}</span> and 
                                an average rating of <span className="font-semibold text-white">+{data.averageRating}</span>.
                            </p>
                        </div>

                        {/* 作品列表 */}
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
                            <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                                Pages on all sites <span className="text-sm font-normal text-gray-400">(按创建时间倒序)</span>
                            </h3>
                            
                            {data.pages.length > 0 ? (
                                <div className="space-y-4">
                                    {data.pages.map((page, index) => {
                                        const siteConfig = config.SUPPORT_WIKI.find(w => w.URL.includes(page.wiki));
                                        const siteParam = siteConfig ? siteConfig.PARAM : page.wiki;
                                        const dateStr = page.created_at ? new Date(page.created_at).toLocaleDateString('zh-CN') : '未知时间';

                                        return (
                                            <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
                                                <div>
                                                    <Link 
                                                        href={`/page?site=${siteParam}&page=${encodeURIComponent(page.page)}`}
                                                        className="text-lg font-medium text-indigo-400 hover:text-indigo-300 hover:underline mr-2"
                                                    >
                                                        {page.title || page.page}
                                                    </Link>
                                                    <span className={`text-sm font-semibold ${page.rating > 0 ? 'text-green-400' : page.rating < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                        ({page.rating > 0 ? `+${page.rating}` : page.rating})
                                                    </span>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        发布于 {dateStr} • 所在站点: {page.wiki}
                                                    </div>
                                                </div>
                                                
                                                {/* 如果有原链接，提供直接访问原站的按钮 */}
                                                <a 
                                                    href={`http://${page.wiki}.wikidot.com/${page.page}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-600 transition-colors whitespace-nowrap text-center"
                                                >
                                                    在原站打开
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-center py-8">
                                    未在收录的站点中找到该作者的任何页面。
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AuthorProfile;
