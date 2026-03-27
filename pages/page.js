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

const stockCrosshairPlugin = {
    id: 'stockCrosshair',
    beforeDatasetsDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; 
        ctx.shadowBlur = 8; 
        ctx.shadowOffsetY = 4; 
    },
    afterDatasetsDraw: (chart) => {
        chart.ctx.restore();
    }
};

const PageDetail = () => {
    const router = useRouter();
    const { site, page } = router.query;
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('评分');

    const [hpage, setHpage] = useState(1);
    const [maxHpage, setMaxHpage] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);

    const tabs = ['源码', '信息', '历史', '评分'];

    const fetchPageData = async (signal) => {
        if (!site || !page) return;
        setLoading(true);
        setError(null);
        
        try {
            const apiUrl = `/api/page?site=${site}&page=${encodeURIComponent(page)}&hpage=${hpage}`;
            const fetchOptions = signal ? { signal } : {};
            const res = await fetch(apiUrl, fetchOptions);
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.details || result.error || '请求失败');
            }
            
            if (!signal || !signal.aborted) {
                setData(result);
                if (result.maxHistoryPage) setMaxHpage(result.maxHistoryPage);
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

    const loadHistoryPage = async (newPage) => {
        if (newPage < 1 || newPage > maxHpage || newPage === hpage) return;
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/page?site=${site}&page=${encodeURIComponent(page)}&hpage=${newPage}`);
            const result = await res.json();
            if (res.ok) {
                setData(prev => ({ ...prev, historyHtml: result.historyHtml }));
                setHpage(newPage);
                if (result.maxHistoryPage) setMaxHpage(result.maxHistoryPage);
            }
        } catch (err) {
            console.error(err);
        }
        setHistoryLoading(false);
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
        return <div className="py-12 text-center text-gray-400">正在接入大盘数据...</div>;
    }

    if (error) {
        return (
            <div className="py-12 text-center">
                <div className="text-red-400 mb-4">数据接入失败: {error}</div>
                <button onClick={() => router.back()} className="text-indigo-400 hover:text-indigo-300">返回上一页</button>
            </div>
        );
    }

    if (!data) return null;

    let chartData = [];
    if (data.scoreHistory && data.scoreHistory.length > 0) {
        chartData = data.scoreHistory.map((item) => ({
            originalScore: item.score,
            stockPrice: 100 + item.score,
            date: item.date
        }));
        
        if (chartData[0].date === '初始记录') {
            chartData[0].originalScore = 0;
            chartData[0].stockPrice = 100;
            chartData[0].date = '开仓';
        } else {
            chartData.unshift({ originalScore: 0, stockPrice: 100, date: '开仓' });
        }
    }

    const colorRise = 'rgba(239, 68, 68, 1)'; 
    const colorDrop = 'rgba(34, 197, 94, 1)'; 
    const bgRise = 'rgba(239, 68, 68, 0.2)';
    const bgDrop = 'rgba(34, 197, 94, 0.2)';

    const lineChartData = {
        labels: chartData.map(d => d.date),
        datasets: [
            {
                label: '页面大盘',
                data: chartData.map(d => d.stockPrice),
                fill: 'origin',
                borderWidth: 2,
                tension: 0, 
                borderJoinStyle: 'miter', 
                stepped: false,
                segment: {
                    borderColor: ctx => {
                        if (!ctx.p0 || !ctx.p1) return colorRise;
                        return ctx.p1.parsed.y < ctx.p0.parsed.y ? colorDrop : colorRise;
                    },
                    backgroundColor: ctx => {
                        if (!ctx.p0 || !ctx.p1) return bgRise;
                        return ctx.p1.parsed.y < ctx.p0.parsed.y ? bgDrop : bgRise;
                    }
                },
                pointBackgroundColor: (ctx) => {
                    if (ctx.dataIndex === 0) return colorRise;
                    const prev = chartData[ctx.dataIndex - 1].stockPrice;
                    const curr = chartData[ctx.dataIndex].stockPrice;
                    return curr < prev ? colorDrop : colorRise;
                },
                pointBorderColor: '#000000',
                pointBorderWidth: 1,
                pointRadius: 0, 
                pointHoverRadius: 5,
            }
        ]
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { top: 20, bottom: 20, left: 10, right: 20 }
        },
        scales: {
            y: {
                suggestedMin: 80,
                suggestedMax: 120,
                ticks: {
                    precision: 0, 
                    stepSize: 5, 
                    color: (context) => {
                        if (context.tick.value > 100) return colorRise;
                        if (context.tick.value < 100) return colorDrop;
                        return '#ffffff';
                    },
                    font: { size: 12, family: 'monospace', weight: 'bold' }
                },
                grid: {
                    color: (context) => context.tick.value === 100 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(55, 65, 81, 0.3)',
                    lineWidth: (context) => context.tick.value === 100 ? 2 : 1,
                    borderDash: (context) => context.tick.value === 100 ? [] : [4, 4],
                    drawBorder: false,
                }
            },
            x: {
                ticks: {
                    color: '#9CA3AF',
                    maxTicksLimit: 8,
                    font: { size: 10, family: 'monospace' }
                },
                grid: {
                    color: 'rgba(55, 65, 81, 0.2)',
                    drawBorder: false,
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#9CA3AF',
                bodyColor: '#FFFFFF',
                bodyFont: { family: 'monospace', size: 14, weight: 'bold' },
                borderColor: (context) => {
                    if (!context.tooltip.dataPoints || context.tooltip.dataPoints.length === 0) return colorRise;
                    const dataIndex = context.tooltip.dataPoints[0].dataIndex;
                    if (dataIndex === 0) return colorRise;
                    const prev = chartData[dataIndex - 1].stockPrice;
                    const curr = chartData[dataIndex].stockPrice;
                    return curr < prev ? colorDrop : colorRise;
                },
                borderWidth: 2,
                padding: 12,
                displayColors: false,
                intersect: false,
                mode: 'index',
                callbacks: {
                    label: function(context) {
                        const dataIndex = context.dataIndex;
                        const stockPrice = chartData[dataIndex].stockPrice;
                        const originalScore = chartData[dataIndex].originalScore;
                        const trend = originalScore > 0 ? '+' : '';
                        return `股价: ${stockPrice.toFixed(2)} (原评分: ${trend}${originalScore})`;
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
                                            <span className={`font-medium ${data.rating && data.rating.toString().includes('+') ? 'text-red-500' : data.rating && data.rating.toString().includes('-') ? 'text-green-500' : 'text-gray-300'}`}>
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
                            <i className="fa-solid fa-rotate-right mr-1"></i> 刷新数据
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
                        <div className="space-y-4">
                            <div className="bg-gray-900/50 p-0 rounded-lg overflow-x-auto border border-gray-700 relative">
                                {historyLoading && (
                                    <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center z-10">
                                        <span className="text-gray-300">读取中...</span>
                                    </div>
                                )}
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
                            <div className="flex flex-wrap justify-between items-center bg-gray-900/30 p-3 rounded-lg border border-gray-700 gap-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button 
                                        onClick={() => loadHistoryPage(hpage - 1)}
                                        disabled={hpage <= 1 || historyLoading}
                                        className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        上一页
                                    </button>
                                    
                                    {Array.from({ length: maxHpage || 1 }, (_, i) => i + 1).map(pageNum => (
                                        <button
                                            key={pageNum}
                                            onClick={() => loadHistoryPage(pageNum)}
                                            disabled={historyLoading}
                                            className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                                hpage === pageNum
                                                    ? 'bg-indigo-600 text-white cursor-default'
                                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}

                                    <button 
                                        onClick={() => loadHistoryPage(hpage + 1)}
                                        disabled={historyLoading || hpage >= (maxHpage || 1)}
                                        className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        下一页
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">共 {maxHpage || 1} 页，跳至</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={maxHpage || 1}
                                        className="w-16 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-gray-300 focus:outline-none focus:border-indigo-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val)) loadHistoryPage(val);
                                            }
                                        }}
                                        id="pageJumpInput"
                                    />
                                    <button 
                                        onClick={() => {
                                            const val = parseInt(document.getElementById('pageJumpInput').value);
                                            if (!isNaN(val)) loadHistoryPage(val);
                                        }}
                                        disabled={historyLoading}
                                        className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        跳转
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === '评分' && (
                        <div className="space-y-6">
                            {chartData.length > 1 ? (
                                <div className="w-full bg-black p-6 rounded-lg border border-gray-700 shadow-inner">
                                    <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2 font-sans tracking-widest">
                                        页面大盘走势 <span className="text-xs text-gray-500 font-normal">（发行价 100.00）</span>
                                    </h3>
                                    <div className="w-full h-[320px] relative">
                                        <Line data={lineChartData} options={lineChartOptions} plugins={[stockCrosshairPlugin]} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 bg-gray-900/50 rounded-lg border border-gray-700">
                                    暂无交易数据，等待大盘开市...
                                </div>
                            )}

                            {data.ratingTable && data.ratingTable.length > 0 ? (
                                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                                    <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                                        大盘持仓列表
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
                                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${rate.vote === '+1' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                                                    {rate.vote === '+1' ? '+1' : '-1'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-700">
                                    暂无大盘持仓数据
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
