// pages/tools/author-stock.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import TradingChart from '../../components/TradingChart';

export default function AuthorStock() {
    const [username, setUsername] = useState('Laimu_slime');
    const [selectedAuthor, setSelectedAuthor] = useState('Laimu_slime');
    const [chartData, setChartData] = useState([]);
    
    const [userBalance, setUserBalance] = useState(10000);
    const [userPosition, setUserPosition] = useState(0);
    
    // 新增：自定义交易股数
    const [tradeAmount, setTradeAmount] = useState(10);

    // 拉取K线和账户数据
    useEffect(() => {
        const fetchStockData = async () => {
            if (!selectedAuthor) return;
            try {
                const res = await fetch(`/api/trade/author-kline?author=${encodeURIComponent(selectedAuthor)}`);
                const result = await res.json();
                if (result.data) {
                    setChartData(result.data);
                }
            } catch (error) {
                console.error("加载图表数据失败", error);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchStockData();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [selectedAuthor]);

    const handleBuy = async () => {
        if (chartData.length === 0) return;
        const currentPrice = chartData[chartData.length - 1].close;
        const amountNum = Number(tradeAmount);

        if (isNaN(amountNum) || amountNum <= 0) {
            alert('请输入有效的买入股数');
            return;
        }
        
        try {
            const res = await fetch('/api/trade/author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    authorName: selectedAuthor, 
                    action: 'buy', 
                    currentPrice, 
                    amount: amountNum // 传递数量给后端
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                setUserBalance(data.newBalance);
                setUserPosition(data.newPosition);
                alert(`成功买入 ${amountNum} 股！花费: ¥${(currentPrice * amountNum).toFixed(2)}`);
            } else {
                alert(data.error || '买入失败');
            }
        } catch (error) {
            alert('网络错误，请稍后再试');
        }
    };

    const handleSell = async () => {
        if (chartData.length === 0 || userPosition <= 0) return;
        const currentPrice = chartData[chartData.length - 1].close;
        const amountNum = Number(tradeAmount);

        if (isNaN(amountNum) || amountNum <= 0) {
            alert('请输入有效的卖出股数');
            return;
        }

        if (amountNum > userPosition) {
            alert(`持仓不足，你当前只有 ${userPosition} 股`);
            return;
        }
        
        try {
            const res = await fetch('/api/trade/author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    authorName: selectedAuthor, 
                    action: 'sell', 
                    currentPrice,
                    amount: amountNum // 传递数量给后端
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                setUserBalance(data.newBalance);
                setUserPosition(data.newPosition);
                alert(`成功卖出 ${amountNum} 股！收入: ¥${(currentPrice * amountNum).toFixed(2)}`);
            } else {
                alert(data.error || '卖出失败');
            }
        } catch (error) {
            alert('网络错误，请稍后再试');
        }
    };

    return (
        <>
            <Head>
                <title>作者概念股 - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">作者概念股交易中心</h1>
                        <p className="mt-2 text-gray-400 text-sm">在这里投资你认为有潜力的创作者。股价与发文量、存活率挂钩。</p>
                    </div>
                    <div className="text-right">
                        <div className="text-gray-400 text-sm">可用资金</div>
                        <div className="text-2xl font-mono text-green-400">¥{userBalance.toFixed(2)}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 bg-gray-800/40 rounded-xl border border-gray-700 p-6 flex flex-col h-[500px]">
                        
                        <div className="space-y-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">操作账户</label>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">搜索作者档案</label>
                                <input 
                                    type="text" 
                                    value={selectedAuthor}
                                    onChange={(e) => setSelectedAuthor(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center space-y-4 my-2">
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">当前持有</span>
                                    <span className="text-white font-mono font-bold">{userPosition} 股</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">最新报价</span>
                                    <span className="text-blue-400 font-mono font-bold">
                                        ¥{chartData.length > 0 ? chartData[chartData.length - 1].close.toFixed(2) : '0.00'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* 新增：交易股数输入框 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">交易数量 (股)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={tradeAmount}
                                    onChange={(e) => setTradeAmount(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-auto">
                            <button 
                                onClick={handleBuy}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                买入看涨
                            </button>
                            <button 
                                onClick={handleSell}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                抛售平仓
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-3 bg-gray-800/40 rounded-xl border border-gray-700 p-4 h-[500px]">
                        {chartData.length > 0 ? (
                            <TradingChart data={chartData} isCandle={true} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                正在查询数据或该作者暂无图表...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
