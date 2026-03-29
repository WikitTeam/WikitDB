// pages/tools/bingo.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function TagBingo() {
    const [username, setUsername] = useState(null);
    const [balance, setBalance] = useState(0);
    const [selectedTags, setSelectedTags] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState(null);

    // 新增：动态配置状态
    const [availableTags, setAvailableTags] = useState([]);
    const [scanCost, setScanCost] = useState(50);

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
            fetch('/api/admin/user-assets?username=' + storedUsername)
                .then(res => res.json())
                .then(data => { if(data.portfolio) setBalance(data.portfolio.balance || 0); });
        }

        // 从后台拉取动态设定的标签和价格
        fetch('/api/tools/bingo')
            .then(res => res.json())
            .then(data => {
                if (data.tags) setAvailableTags(data.tags);
                if (data.cost) setScanCost(data.cost);
            });
    }, []);

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            if (selectedTags.length >= 3) {
                alert('最多只能选择 3 个标签');
                return;
            }
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleScan = async () => {
        if (!username) return alert('请先登录');
        if (selectedTags.length !== 3) return alert('请选择 3 个标签');
        
        setIsScanning(true);
        setResult(null);

        try {
            const res = await fetch('/api/tools/bingo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, selectedTags })
            });
            const data = await res.json();

            if (res.ok) {
                setResult(data);
                setBalance(data.newBalance);
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('网络错误');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 font-sans bg-slate-50 min-h-screen">
            <Head><title>标签大乐透 - WikitDB</title></Head>
            
            <div className="max-w-5xl mx-auto w-full">
                <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">标签大乐透</h1>
                        <p className="mt-2 text-gray-500 text-sm">
                            每次扫描消耗 ¥{scanCost}。命中 1 个标签回本，2 个奖励 ¥{scanCost * 10}，3 个全中奖励 ¥{scanCost * 100}。
                        </p>
                    </div>
                    <div className="text-right text-xl font-mono text-green-600 font-bold">
                        余额: ¥{balance}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm h-fit">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">选择目标标签 (已选 {selectedTags.length}/3)</h2>
                        <div className="flex flex-wrap gap-3 mb-10">
                            {availableTags.length === 0 ? <div className="text-sm text-gray-400">正在同步标签池...</div> : null}
                            {availableTags.map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-5 py-2.5 rounded-lg font-bold text-sm border transition-colors ${
                                            isSelected 
                                            ? 'bg-blue-600 text-white border-blue-600' 
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button 
                            onClick={handleScan} 
                            disabled={isScanning || selectedTags.length !== 3}
                            className="w-full py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg rounded-xl shadow-sm transition-colors"
                        >
                            {isScanning ? '正在检索数据库...' : `支付 ¥${scanCost} 开始扫描`}
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                        {!result && !isScanning && (
                            <div className="text-gray-400 text-center font-medium">
                                选择标签并点击扫描，结果将在此处显示
                            </div>
                        )}

                        {isScanning && (
                            <div className="text-blue-600 font-bold animate-pulse text-lg">
                                正在连接数据节点...
                            </div>
                        )}

                        {result && result.page && (
                            <div className="w-full text-center">
                                <div className="text-sm text-gray-400 mb-2 font-semibold tracking-widest uppercase">随机截获文档</div>
                                <div className="text-2xl font-bold text-gray-900 mb-2">{result.page.title}</div>
                                <div className="text-sm text-gray-500 mb-8">作者: {result.page.author}</div>
                                
                                <div className="mb-8 border-t border-b border-gray-100 py-6">
                                    <div className="text-xs text-gray-400 mb-4 font-semibold uppercase tracking-wider">该文档携带的标签</div>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {result.page.tags && result.page.tags.length > 0 ? (
                                            result.page.tags.map(t => (
                                                <span key={t} className={`px-3 py-1.5 rounded-md text-xs font-bold border ${
                                                    result.matchedTags.includes(t) 
                                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}>
                                                    {t}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-400 text-sm">此文档无标签</span>
                                        )}
                                    </div>
                                </div>

                                {result.matchCount === 0 && <div className="text-gray-500 font-bold text-lg">未能命中任何标签，扫描失败。</div>}
                                {result.matchCount === 1 && <div className="text-blue-600 font-bold text-lg">命中 1 个标签，获得安慰奖 ¥{scanCost}</div>}
                                {result.matchCount === 2 && <div className="text-orange-600 font-bold text-xl">命中 2 个标签，获得奖金 ¥{scanCost * 10}</div>}
                                {result.matchCount === 3 && <div className="text-red-600 font-bold text-2xl">大满贯！3 个标签全中，获得奖金 ¥{scanCost * 100}</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
