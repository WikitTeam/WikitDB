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
    const [activeTab, setActiveTab] = useState('global');
    const [filterSite, setFilterSite] = useState('all');

    // 核心改造 1：引入缓存字典，点过的排行数据全部存在这里面
    const [rankingCache, setRankingCache] = useState({});

    useEffect(() => {
        if (!router.isReady) return;

        if (name) {
            setSearchInput(name);
            fetchAuthorData(name);
        } else {
            setSearchInput('');
            setData(null);
            
            // 初次进入页面时，只有当 'global' 没被缓存过，才去请求全站总排行
            if (!rankingCache['global']) {
                fetchRankingData('global');
            } else {
                setActiveTab('global');
            }
        }
    }, [router.isReady, name]);

    const fetchAuthorData = async (authorName) => {
        setLoading(true);
        setError(null);
        setData(null);
        setFilterSite('all');

        try {
            const res = await fetch(`/api/authors?name=${encodeURIComponent(authorName)}`);
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.details || result.error || '请求失败');
            }

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

    // 核心改造 2：带有参数的动态获取函数
    const fetchRankingData = async (tabParam) => {
        setLoading(true);
        setError(null);
        
        try {
            const res = await fetch(`/api/ranking?site=${tabParam}`);
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.details || result.error || '获取排行榜失败');
            }
            
            // 将获取到的新数据塞进缓存字典里
            setRankingCache(prev => ({
                ...prev,
                [tabParam]: result.ranking
            }));
            setActiveTab(tabParam);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            router.push(`/authors?name=${encodeURIComponent(searchInput.trim())}`, undefined, { shallow: true });
        } else {
            router.push(`/authors`, undefined, { shallow: true });
        }
    };

    // 核心改造 3：点击 Tab 时判断是否需要发请求
    const handleTabClick = (tabParam) => {
        setActiveTab(tabParam);
        // 如果缓存里没有这个站的数据，才去后台拉取，否则直接秒切！
        if (!rankingCache[tabParam]) {
            fetchRankingData(tabParam);
        }
    };

    // 取出当前选中 Tab 的数据
    const currentRankingList = rankingCache[activeTab] || [];

    const siteCounts = {};
    if (data && data.pages) {
        data.pages.forEach(page => {
            siteCounts[page.wiki] = (siteCounts[page.wiki] || 0) + 1;
        });
    }

    const displayedPages = data && data.pages ? (
        filterSite === 'all' 
            ? data.pages 
            : data.pages.filter(page => page.wiki === filterSite)
    ) : [];

    return (
        <>
            <Head>
                <title>{data ? `${data.name} 的主页 - ${config.SITE_NAME}` : `作者查询与排行 - ${config.SITE_NAME}`}</title>
            </Head>

            <div className="py-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-700 pb-6">
                    <h1 className="text-3xl font-bold text-white">
                        {name ? '作者信息' : '作者评分排行榜'}
                    </h1>
                    
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
                        正在加载数据...
                    </div>
                )}

                {error && (
                    <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900/50">
                        检索失败: {error}
                    </div>
                )}

                {data && !loading && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-6">
                            <img 
                                src={data.avatar} 
                                alt={data.name} 
                                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-700 bg-gray-900"
                                onError={(e) => { e.target.src = 'https://www.wikidot.com/local--favicon/favicon.gif'; }}
                            />
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">{data.name}</h2>
                                <div className="text-sm text-gray-400">
                                    数据同步自 Wikit GraphQL 数据库
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
                            <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">全站数据总览 (Overview)</h3>
                            <p className="text-gray-300 leading-relaxed mb-6">
                                <span className="font-semibold text-indigo-400">{data.name}</span> 在所有站点中全局排名 <span className="font-semibold text-white">#{data.globalRank}</span>。
                                共计拥有 <span className="font-semibold text-white">{data.totalPages}</span> 个页面，
                                累计总评分为 <span className="font-semibold text-green-400">{data.totalRating > 0 ? `+${data.totalRating}` : data.totalRating}</span>，
                                平均评分为 <span className="font-semibold text-white">{data.averageRating > 0 ? `+${data.averageRating}` : data.averageRating}</span>。
                            </p>

                            {data.siteStats && data.siteStats.length > 0 && (
                                <>
                                    <h4 className="text-lg font-medium text-white mb-3">所属站点数据分布：</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {data.siteStats.map((site, index) => {
                                            const siteConfig = config.SUPPORT_WIKI.find(w => w.WIKIT_ID === site.wiki || w.NAME === site.wiki);
                                            const siteName = siteConfig ? siteConfig.NAME : site.wiki;
                                            return (
                                                <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                                    <div className="font-medium text-indigo-400 mb-2 truncate" title={siteName}>{siteName}</div>
                                                    <div className="text-sm text-gray-400 space-y-1">
                                                        <div className="flex justify-between"><span>站点排名:</span> <span className="text-white font-medium">#{site.rank}</span></div>
                                                        <div className="flex justify-between"><span>页面总数:</span> <span className="text-white">{site.count}</span></div>
                                                        <div className="flex justify-between">
                                                            <span>站点总分:</span> 
                                                            <span className={`font-medium ${site.rating > 0 ? 'text-green-400' : site.rating < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                                                                {site.rating > 0 ? `+${site.rating}` : site.rating}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-700 pb-2">
                                <h3 className="text-xl font-semibold text-white">
                                    所有发布页面 <span className="text-sm font-normal text-gray-400">(按创建时间倒序)</span>
                                </h3>
                                
                                {Object.keys(siteCounts).length > 0 && (
                                    <select
                                        value={filterSite}
                                        onChange={(e) => setFilterSite(e.target.value)}
                                        className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none cursor-pointer transition-colors"
                                    >
                                        <option value="all">全站总览 (All Sites)</option>
                                        {Object.entries(siteCounts).map(([wikiId, count]) => {
                                            const siteConfig = config.SUPPORT_WIKI.find(w => w.WIKIT_ID === wikiId || w.URL.includes(wikiId));
                                            const siteName = siteConfig ? siteConfig.NAME : wikiId;
                                            return (
                                                <option key={wikiId} value={wikiId}>
                                                    {siteName} ({count} 篇)
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                            </div>
                            
                            {displayedPages.length > 0 ? (
                                <div className="space-y-4">
                                    {displayedPages.map((page, index) => {
                                        const siteConfig = config.SUPPORT_WIKI.find(w => w.WIKIT_ID === page.wiki || w.URL.includes(page.wiki));
                                        const siteParam = siteConfig ? siteConfig.PARAM : page.wiki;
                                        const dateStr = page.created_at ? new Date(page.created_at).toLocaleDateString('zh-CN') : '未知时间';

                                        return (
                                            <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-baseline flex-wrap gap-2">
                                                        <Link 
                                                            href={`/page?site=${siteParam}&page=${encodeURIComponent(page.page)}`}
                                                            className="text-lg font-medium text-indigo-400 hover:text-indigo-300 hover:underline truncate"
                                                        >
                                                            {page.title || page.page}
                                                        </Link>
                                                        <span className={`text-sm font-semibold whitespace-nowrap ${page.rating > 0 ? 'text-green-400' : page.rating < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                            ({page.rating > 0 ? `+${page.rating}` : page.rating})
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                                        发布于 {dateStr} • 所在站点: {page.wiki}
                                                    </div>
                                                </div>
                                                
                                                <a 
                                                    href={`http://${page.wiki}.wikidot.com/${page.page}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-600 transition-colors whitespace-nowrap text-center shrink-0"
                                                >
                                                    在原站打开
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-center py-8">
                                    该站点下未找到任何页面。
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 核心改造 4：无缝渲染排行榜的各个站点按钮 */}
                {!name && !loading && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-4 border-b border-gray-700 pb-4">
                            <button
                                onClick={() => handleTabClick('global')}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    activeTab === 'global'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                全站总排行
                            </button>
                            
                            {config.SUPPORT_WIKI.map((site) => (
                                <button
                                    key={site.PARAM}
                                    onClick={() => handleTabClick(site.PARAM)}
                                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                        activeTab === site.PARAM
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {site.NAME}
                                </button>
                            ))}
                        </div>

                        <div className="bg-gray-800/50 rounded-xl border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900/50 border-b border-gray-700 text-gray-400 text-sm">
                                            <th className="p-4 font-medium w-24">排名</th>
                                            <th className="p-4 font-medium">作者</th>
                                            <th className="p-4 font-medium text-right">总评分</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRankingList && currentRankingList.length > 0 ? (
                                            currentRankingList.map((author, index) => (
                                                <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                                            author.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                                                            author.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                                                            author.rank === 3 ? 'bg-orange-400/20 text-orange-400' :
                                                            'bg-gray-800 text-gray-400'
                                                        }`}>
                                                            {author.rank}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium">
                                                        <Link 
                                                            href={`/authors?name=${encodeURIComponent(author.name)}`}
                                                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        >
                                                            {author.name}
                                                        </Link>
                                                    </td>
                                                    <td className="p-4 text-right font-semibold text-green-400">
                                                        +{author.value}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="p-8 text-center text-gray-500">
                                                    暂无排行数据或尚未加载完毕
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AuthorProfile;
