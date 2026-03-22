import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
const config = require('../../wikitdb.config.js');

const DeleteAnnouncement = () => {
    const wikis = config.SUPPORT_WIKI || config.SUPPOST_WIKI || [];
    
    const [selectedSite, setSelectedSite] = useState(wikis.length > 0 ? wikis[0].PARAM : '');
    const [searchInput, setSearchInput] = useState('');
    const [pagesList, setPagesList] = useState([]);
    const [isFetchingSingle, setIsFetchingSingle] = useState(false);
    
    // 批量抓取状态
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchInput, setBatchInput] = useState('');
    const [isBatchFetching, setIsBatchFetching] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

    const [generatedCode, setGeneratedCode] = useState('');

    // 解析输入的 URL 或页面名
    const parseInputStr = (inputStr) => {
        let site = selectedSite;
        let page = inputStr.trim();
        
        if (page.startsWith('http')) {
            try {
                const url = new URL(page);
                const host = url.hostname;
                const path = url.pathname.substring(1);
                
                const matchedSite = wikis.find(w => {
                    try { return new URL(w.URL).hostname === host; } catch(e) { return false; }
                });
                
                if (matchedSite) site = matchedSite.PARAM;
                page = path;
            } catch (e) {}
        }
        return { site, page };
    };

    const fetchPageData = async (siteParam, pageName) => {
        const res = await fetch(`/api/page?site=${siteParam}&page=${encodeURIComponent(pageName)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '抓取失败');
        return data;
    };

    const handleSingleAdd = async (e) => {
        e.preventDefault();
        if (!searchInput.trim() || !selectedSite) return;
        
        setIsFetchingSingle(true);
        try {
            const { site, page } = parseInputStr(searchInput);
            const data = await fetchPageData(site, page);
            
            // 避免重复添加
            if (!pagesList.find(p => p.originalUrl === data.originalUrl)) {
                setPagesList(prev => [...prev, data]);
            }
            setSearchInput('');
        } catch (err) {
            alert(`抓取失败: ${err.message}`);
        } finally {
            setIsFetchingSingle(false);
        }
    };

    const handleBatchAdd = async () => {
        const lines = batchInput.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;

        setIsBatchFetching(true);
        setBatchProgress({ current: 0, total: lines.length });

        const newPages = [];
        for (let i = 0; i < lines.length; i++) {
            try {
                const { site, page } = parseInputStr(lines[i]);
                const data = await fetchPageData(site, page);
                if (!pagesList.find(p => p.originalUrl === data.originalUrl) && !newPages.find(p => p.originalUrl === data.originalUrl)) {
                    newPages.push(data);
                }
            } catch (err) {
                console.error(`无法抓取 ${lines[i]}:`, err);
            }
            setBatchProgress({ current: i + 1, total: lines.length });
        }

        setPagesList(prev => [...prev, ...newPages]);
        setIsBatchFetching(false);
        setShowBatchModal(false);
        setBatchInput('');
    };

    const removePage = (indexToRemove) => {
        setPagesList(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const generateCode = () => {
        if (pagesList.length === 0) {
            setGeneratedCode('请先添加至少一个页面。');
            return;
        }

        let code = `[[div class="deletion-announcement"]]\n`;
        code += `**本周低分/违规页面删除公示**\n\n`;
        code += `以下页面因评分低于阈值或违反站点规定，将于近期执行删除操作。请原作者及时备份。\n\n`;
        code += `[[table class="wiki-content-table"]]\n`;
        code += `[[row]]\n`;
        code += `[[hcell]] 页面标题 [[/hcell]]\n`;
        code += `[[hcell]] 原作者 [[/hcell]]\n`;
        code += `[[hcell]] 当前评分 [[/hcell]]\n`;
        code += `[[/row]]\n`;

        pagesList.forEach(p => {
            const title = p.title || '未知页面';
            const url = p.originalUrl;
            const author = p.creatorName || '未知';
            const rating = p.rating || 0;
            
            code += `[[row]]\n`;
            code += `[[cell]] [[[${url} | ${title}]]] [[/cell]]\n`;
            code += `[[cell]] [[*user ${author}]] [[/cell]]\n`;
            code += `[[cell]] ${rating > 0 ? '+' + rating : rating} [[/cell]]\n`;
            code += `[[/row]]\n`;
        });

        code += `[[/table]]\n`;
        code += `[[/div]]`;

        setGeneratedCode(code);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode).then(() => {
            alert('代码已复制到剪贴板！');
        });
    };

    return (
        <>
            <Head>
                <title>删除公告生成器 - {config.SITE_NAME}</title>
            </Head>

            <div className="py-8 max-w-6xl mx-auto">
                <div className="mb-6 flex items-center text-sm text-gray-400">
                    <Link href="/tools" className="hover:text-indigo-400 transition-colors">工具库</Link>
                    <i className="fa-solid fa-chevron-right mx-2 text-xs"></i>
                    <span className="text-gray-300">删除公告生成</span>
                </div>

                <div className="mb-8 border-b border-gray-700 pb-6">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <i className="fa-solid fa-bullhorn text-red-500"></i>
                        页面自动删除公告生成器
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm">
                        快速生成符合 Wikidot 格式的低分/违规页面删除公告代码。支持搜索添加或批量导入。
                    </p>
                </div>

                {/* 操作栏 */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-gray-800/50 p-4 rounded-xl border border-white/5">
                    <form onSubmit={handleSingleAdd} className="flex-1 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="输入页面 URL 或 英文名..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                disabled={isFetchingSingle}
                                className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pl-10 disabled:opacity-50"
                            />
                            <i className="fa-solid fa-search absolute left-3.5 top-3 text-gray-500"></i>
                        </div>
                        <select 
                            className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 sm:w-48"
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                            disabled={isFetchingSingle}
                        >
                            {wikis.map(wiki => (
                                <option key={wiki.PARAM} value={wiki.PARAM}>{wiki.NAME}</option>
                            ))}
                        </select>
                        <button 
                            type="submit"
                            disabled={isFetchingSingle || !searchInput.trim()}
                            className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
                        >
                            {isFetchingSingle ? '抓取中...' : '添加'}
                        </button>
                    </form>
                    
                    <button 
                        onClick={() => setShowBatchModal(true)}
                        className="px-4 py-2.5 bg-gray-700 text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors shrink-0 flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-list-ul"></i> 批量添加页面
                    </button>
                </div>

                {/* 页面列表 */}
                <div className="bg-gray-800/30 rounded-xl border border-white/5 overflow-hidden mb-8">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700/50">
                            <thead className="bg-gray-900/40">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">页面标题</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase w-32">原作者</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase w-24">当前评分</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase w-40">最后更新</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase w-20">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/30">
                                {pagesList.length > 0 ? (
                                    pagesList.map((page, index) => (
                                        <tr key={index} className="hover:bg-gray-800/40 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <a href={page.originalUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 font-medium truncate max-w-xs block">
                                                    {page.title}
                                                </a>
                                                <div className="text-xs text-gray-500 mt-1">{page.siteName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {page.creatorName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`font-semibold ${page.rating > 0 ? 'text-green-400' : page.rating < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                    {page.rating > 0 ? `+${page.rating}` : page.rating}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {page.lastUpdated}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button 
                                                    onClick={() => removePage(index)}
                                                    className="text-red-400 hover:text-red-300 p-2 rounded-md hover:bg-red-400/10 transition-colors"
                                                    title="移除"
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <i className="fa-solid fa-inbox text-4xl mb-3 opacity-50"></i>
                                                列表为空，请在上方搜索添加页面
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 生成区 */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white">生成的 Wikidot 代码</h2>
                        <button 
                            onClick={generateCode}
                            className="px-4 py-1.5 bg-green-600/20 text-green-400 border border-green-500/30 rounded hover:bg-green-600/30 transition-colors text-sm font-medium"
                        >
                            <i className="fa-solid fa-code mr-1.5"></i>
                            生成公告代码
                        </button>
                    </div>
                    <textarea 
                        className="w-full h-48 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-indigo-500 resize-y"
                        readOnly
                        value={generatedCode}
                        placeholder="点击右上角按钮生成代码..."
                    ></textarea>
                    {generatedCode && !generatedCode.includes('请先添加') && (
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={copyToClipboard}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                            >
                                <i className="fa-regular fa-copy mr-1.5"></i> 复制代码
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 批量添加模态框 */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">批量添加页面</h3>
                            {!isBatchFetching && (
                                <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-white">
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-400 mb-3">
                                支持直接粘贴页面 URL（每行一个），系统将自动识别站点并抓取信息。如果只输入纯英文页面名，将默认使用当前下拉框选中的站点。
                            </p>
                            <textarea
                                className="w-full h-40 bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                                placeholder="http://scp-wiki-cn.wikidot.com/scp-cn-xxxx&#10;http://forest-literature-club.wikidot.com/test-page&#10;another-page-name"
                                value={batchInput}
                                onChange={(e) => setBatchInput(e.target.value)}
                                disabled={isBatchFetching}
                            ></textarea>
                            
                            {isBatchFetching && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>抓取进度</span>
                                        <span>{batchProgress.current} / {batchProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div 
                                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                                            style={{ width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowBatchModal(false)}
                                disabled={isBatchFetching}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleBatchAdd}
                                disabled={isBatchFetching || !batchInput.trim()}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center"
                            >
                                {isBatchFetching ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> 抓取中...</>
                                ) : '开始抓取'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeleteAnnouncement;
