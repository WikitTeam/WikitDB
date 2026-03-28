// pages/tools/radar.js
import React, { useState } from 'react';
import Head from 'next/head';

const SvgRadarChart = ({ data }) => {
    const labels = ['爆肝度', '均分评价', '巅峰实力', '跨域探索', '话题热度', '综合胜率'];
    const size = 320;
    const center = size / 2;
    const radius = 100;

    const getPolygonPoints = (scale) => {
        return labels.map((_, i) => {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = center + radius * scale * Math.cos(angle);
            const y = center + radius * scale * Math.sin(angle);
            return `${x},${y}`;
        }).join(' ');
    };

    const dataPoints = data.map((val, i) => {
        const scale = Math.max(0, Math.min(100, val)) / 100;
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = center + radius * scale * Math.cos(angle);
        const y = center + radius * scale * Math.sin(angle);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible max-w-sm mx-auto">
            {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
                <polygon 
                    key={scale}
                    points={getPolygonPoints(scale)} 
                    fill="none" 
                    stroke="rgba(255, 255, 255, 0.1)" 
                    strokeWidth="1"
                />
            ))}

            {labels.map((_, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return (
                    <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                );
            })}

            <polygon 
                points={dataPoints} 
                fill="rgba(59, 130, 246, 0.4)" 
                stroke="rgba(59, 130, 246, 0.8)" 
                strokeWidth="2" 
            />

            {data.map((val, i) => {
                const scale = Math.max(0, Math.min(100, val)) / 100;
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const x = center + radius * scale * Math.cos(angle);
                const y = center + radius * scale * Math.sin(angle);
                return <circle key={`p-${i}`} cx={x} cy={y} r="4" fill="#60a5fa" />;
            })}

            {labels.map((label, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const x = center + (radius + 35) * Math.cos(angle);
                const y = center + (radius + 20) * Math.sin(angle);
                return (
                    <text 
                        key={`label-${i}`} 
                        x={x} 
                        y={y} 
                        fill="#9ca3af" 
                        fontSize="13" 
                        textAnchor="middle" 
                        dominantBaseline="middle"
                    >
                        {label}
                    </text>
                );
            })}
        </svg>
    );
};

export default function AuthorRadar() {
    const [authorName, setAuthorName] = useState('Laimu_slime');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [radarData, setRadarData] = useState([0, 0, 0, 0, 0, 0]);
    const [report, setReport] = useState(null);

    const fetchAuthorData = async () => {
        if (!authorName.trim()) return;
        
        setIsLoading(true);
        setError('');
        setReport(null);

        try {
            const graphqlQuery = {
                query: `
                    query($author: String!) {
                        articles(author: $author, page: 1, pageSize: 500) {
                            nodes {
                                wiki
                                rating
                                comments
                            }
                        }
                    }
                `,
                variables: { author: authorName }
            };

            const res = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphqlQuery)
            });

            const result = await res.json();
            
            if (result.errors) {
                setError('无法从数据库获取该作者的信息');
                setIsLoading(false);
                return;
            }

            const articles = result.data?.articles?.nodes || [];
            
            if (articles.length === 0) {
                setError('数据库中未收录该作者的页面档案');
                setRadarData([0, 0, 0, 0, 0, 0]);
                setIsLoading(false);
                return;
            }

            const totalArticles = articles.length;
            const uniqueWikis = new Set();
            let totalRating = 0;
            let maxRating = -999;
            let totalComments = 0;
            let positiveCount = 0;

            articles.forEach(article => {
                const rating = article.rating || 0;
                if (article.wiki) uniqueWikis.add(article.wiki);
                totalRating += rating;
                if (rating > maxRating) maxRating = rating;
                if (article.comments) totalComments += article.comments;
                if (rating > 0) positiveCount++;
            });

            const scoreCount = Math.min(100, (totalArticles / 50) * 100); 
            const avgRating = totalArticles > 0 ? (totalRating / totalArticles) : 0;
            const scoreAvg = Math.max(0, Math.min(100, (avgRating / 30) * 100)); 
            const scorePeak = Math.max(0, Math.min(100, (maxRating / 150) * 100)); 
            const scoreCross = Math.min(100, (uniqueWikis.size / 5) * 100); 
            const scoreHot = Math.min(100, (totalComments / 200) * 100); 
            const scoreWinRate = totalArticles > 0 ? (positiveCount / totalArticles) * 100 : 0; 

            setRadarData([scoreCount, scoreAvg, scorePeak, scoreCross, scoreHot, scoreWinRate]);
            generateReport(totalArticles, uniqueWikis.size, maxRating, scoreWinRate);

        } catch (err) {
            setError('网络请求异常');
        } finally {
            setIsLoading(false);
        }
    };

    const generateReport = (count, wikiCount, maxRating, winRate) => {
        let title = "Safe (安全级)";
        let desc = "该实体在维基系统中的活动相对平稳，未表现出强烈的异常扩张倾向。";

        if (count > 30 && winRate > 80) {
            title = "Keter (极度危险)";
            desc = "警告：该作者具有极高的创作产能与优异的存活率，其模因污染正在多个站点迅速扩散，建议密切监控。";
        } else if (maxRating > 100) {
            title = "Euclid (收容难测)";
            desc = "该实体偶尔会释放出具有极强影响力的爆款文档，其实力上限深不可测。";
        } else if (wikiCount >= 3) {
            title = "Wanderer (跨站流浪者)";
            desc = "该作者的踪迹遍布多个维基宇宙，难以将其锁定在单一区域，具备极强的环境适应力。";
        } else if (winRate < 30 && count > 5) {
            title = "Neutralized (屡战屡败)";
            desc = "该实体的异常档案大部分已被各站管理抹杀，但其仍未放弃突破收容的尝试。";
        }

        setReport({ title, desc, count, wikiCount, maxRating });
    };

    return (
        <>
            <Head>
                <title>创作者战力雷达 - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6">
                <div className="border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-white tracking-tight">创作者战力雷达评估</h1>
                    <p className="mt-2 text-gray-400 text-sm">跨站聚合创作者历史记录，全方位推算其“危险等级”。</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-6">
                            <label className="block text-sm font-medium text-gray-400 mb-2">追踪作者档案</label>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    placeholder="输入作者名称..."
                                    onKeyDown={(e) => e.key === 'Enter' && fetchAuthorData()}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button 
                                    onClick={fetchAuthorData}
                                    disabled={isLoading}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-600"
                                >
                                    {isLoading ? '扫描中' : '执行扫描'}
                                </button>
                            </div>
                            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
                        </div>

                        {report && (
                            <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-6 flex-1 border-t-4 border-t-red-900 shadow-xl">
                                <h3 className="text-red-400 text-xs font-bold tracking-widest mb-2 uppercase">Danger Level Evaluation</h3>
                                <div className="text-2xl font-bold text-white mb-4">{report.title}</div>
                                <div className="text-gray-300 text-sm leading-relaxed mb-6 bg-gray-900/50 p-3 rounded border border-gray-700/50">
                                    {report.desc}
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-gray-700/50 pb-2">
                                        <span className="text-gray-500">已确认档案数</span>
                                        <span className="text-gray-200 font-mono">{report.count} 份</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700/50 pb-2">
                                        <span className="text-gray-500">最高突破评分</span>
                                        <span className="text-gray-200 font-mono">{report.maxRating > -999 ? `+${report.maxRating}` : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between pb-1">
                                        <span className="text-gray-500">活动范围</span>
                                        <span className="text-gray-200 font-mono">{report.wikiCount} 个平行站点</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2 bg-gray-800/40 rounded-xl border border-gray-700 p-6 flex flex-col items-center justify-center min-h-[450px]">
                        {!report && !isLoading ? (
                            <div className="text-gray-500 flex flex-col items-center gap-3">
                                <span>请输入作者名称以启动雷达扫描网络</span>
                            </div>
                        ) : isLoading ? (
                            <div className="text-blue-500 animate-pulse font-mono tracking-wider">正在从全球数据库拉取交叉对比数据...</div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <SvgRadarChart data={radarData} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
