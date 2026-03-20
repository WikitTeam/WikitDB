import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

const config = require('../wikitdb.config.js');

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const PageDetail = () => {
    const router = useRouter();
    const { site, page } = router.query;
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('源码');

    const tabs = ['源码', '信息', '历史', '评分'];

    const fetchPageData = async (signal) => {
        if (!site || !page) return;
        setLoading(true);
        setError(null);
        
        try {
            const apiUrl = `/api/page?site=${site}&page=${encodeURIComponent(page)}`;
            const fetchOptions = signal ? { signal } : {};
            const res = await fetch(apiUrl, fetchOptions);
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.details || result.error || '请求失败');
            }
            
            if (!signal || !signal.aborted) {
                setData(result);
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (!signal || !signal.aborted) {
                setError(err.message);
            }
        } finally {
            if (!signal || !signal.aborted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (!router.isReady) return;
        
        const controller = new AbortController();
        fetchPageData(controller.signal);
        
        return () => {
            controller.abort();
        };
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

    let chartData = [];
    if (data.scoreHistory && data.scoreHistory.length > 0) {
        chartData = data.scoreHistory.map((item) => ({
            score: item.score,
            date: item.date
        }));
        
        if (chartData.length >= 1 && chartData[0].date !== '初始记录') {
            chartData.unshift({ score: chartData[0].score, date: '初始记录' });
        }
    }

    const isNegative = chartData.length > 0 && chartData[chartData.length - 1].score < 0;
    const themeColor = isNegative ? 'rgba(248, 113, 113, 1)' : 'rgba(129, 140, 248, 1)';
    const bgColorFallback = isNegative ? 'rgba(248, 113, 113, 0.2)' : 'rgba(129, 140, 248, 0.2)';
    const grayColor = 'rgba(107, 114, 128, 1)';

    const lineChartData = {
        labels: chartData.map(d => d.date),
        datasets: [
            {
                fill: 'origin',
                label: '页面评分',
                data: chartData.map(d => d.score),
                borderColor: themeColor,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return bgColorFallback;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, isNegative ? 'rgba(248, 113, 113, 0.5)' : 'rgba(129, 140, 248, 0.5)');
                    gradient.addColorStop(1, isNegative ? 'rgba(248, 113, 113, 0)' : 'rgba(129, 140, 248, 0)');
                    return gradient;
                },
                borderWidth: 3,
                
                // 彻底去掉平滑曲线和阶梯，回归最自然的点到点直连
                tension: 0,
                
                // 初始记录线段变为灰色虚线
                segment: {
                    borderColor: ctx => ctx.p0DataIndex === 0 ? grayColor : themeColor,
                    borderDash: ctx => ctx.p0DataIndex === 0 ? [6, 6] : undefined,
                },
                
                // 初始记录的点变为灰色
                pointBackgroundColor: (ctx) => ctx.dataIndex === 0 ? grayColor : themeColor,
                pointBorderColor: '#1F2937',
                pointBorderWidth: 1.5,
                pointRadius: 4,
                pointHoverRadius: 6,
            }
        ]
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 20,
                bottom: 20,
                left: 10,
                right: 20
            }
        },
        scales: {
            y: {
                ticks: {
                    precision: 0, 
                    color: '#9CA3AF',
                    font: { size: 12 }
                },
                grid: {
                    color: (context) => context.tick.value === 0 ? '#4B5563' : '#374151',
                    borderDash: (context) => context.tick.value === 0 ? [6, 6] : [4, 4],
                    drawBorder: false,
                }
            },
            x: {
                ticks: {
                    color: '#9CA3AF',
                    maxTicksLimit: 8,
                    font: { size: 10 }
                },
                grid: {
                    display: false
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: '#111827',
                titleColor: '#9CA3AF',
                bodyColor: '#E5E7EB',
                borderColor: '#374151',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    label: function(context) {
                        let val = context.parsed.y;
                        return val > 0 ? `+${val}` : `${val}`;
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
    };

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
                                        <div className="flex items-center">
                                            <span className={`font-medium ${data.rating && data.rating.toString().includes('+') ? 'text-green-400' : data.rating && data.rating.toString().includes('-') ? 'text-red-400' : 'text-gray-300'}`}>
                                                {data.rating}
                                            </span>
                                            {data.upvotes !== undefined && data.downvotes !== undefined && (
                                                <span className="text-gray-400 text-sm ml-1.5 font-medium">
                                                    (+{data.upvotes}, -{data.downvotes})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {data.comments !== undefined && data.comments !== null && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">评论数:</span>
                                            <span className="font-medium text-gray-300">{data.comments}</span>
                                        </div>
                                    )}

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
                            onClick={() => fetchPageData()}
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
                            <div 
                                className="text-gray-300 text-sm whitespace-pre-wrap font-mono break-all"
                                dangerouslySetInnerHTML={{ __html: data.sourceCode }}
                            />
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
                        <div className="bg-gray-900/50 p-0 rounded-lg overflow-x-auto border border-gray-700">
                            <div 
                                className="w-full text-sm text-gray-300 
                                [&_table]:w-full [&_table]:text-left [&_table]:border-collapse [&_table]:min-w-max
                                [&_th]:p-4 [&_th]:font-medium [&_th]:text-gray-400 [&_th]:border-b [&_th]:border-gray-700 [&_th]:bg-gray-800/50
                                [&_td]:p-4 [&_td]:border-b [&_td]:border-gray-700/50
                                [&_tr:last-child_td]:border-b-0
                                [&_tr:hover_td]:bg-gray-800/80 [&_tr]:transition-colors
                                [&_img]:inline-block [&_img]:w-5 [&_img]:h-5 [&_img]:rounded-full [&_img]:mr-2 [&_img]:align-middle [&_img]:object-cover [&_img]:border [&_img]:border-gray-600
                                [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:transition-colors"
                                dangerouslySetInnerHTML={{ __html: data.historyHtml }}
                            />
                        </div>
                    )}

                    {activeTab === '评分' && (
                        <div className="space-y-6">
                            {chartData.length > 1 ? (
                                <div className="w-full bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                                    <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                                        <i className="fa-solid fa-chart-line text-indigo-400"></i> 按日评分走势
                                    </h3>
                                    <div className="w-full h-[320px] relative">
                                        <Line data={lineChartData} options={lineChartOptions} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 bg-gray-900/50 rounded-lg border border-gray-700">
                                    开始记录数据... 明日即可生成走势曲线。
                                </div>
                            )}

                            {data.ratingTable && data.ratingTable.length > 0 ? (
                                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                                    <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                                        <i className="fa-solid fa-users text-indigo-400"></i> 当前评分者列表
                                    </h3>
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
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-700">
                                    暂无当前评分者数据
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
