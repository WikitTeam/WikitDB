// pages/tools/escape.js
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function CodeEscape() {
    const [gameState, setGameState] = useState('idle');
    const [originalCode, setOriginalCode] = useState('');
    const [userCode, setUserCode] = useState('');
    const [targetPage, setTargetPage] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [score, setScore] = useState(0);

    const timerRef = useRef(null);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (gameState === 'playing' && timeLeft <= 0) {
            setGameState('fail');
        }

        return () => clearTimeout(timerRef.current);
    }, [timeLeft, gameState]);

    const startRandomEscape = async () => {
        setGameState('loading');
        try {
            // 先去 GraphQL 拉取最近的 50 个页面作为随机池
            const query = {
                query: `
                    query {
                        articles(page: 1, pageSize: 50) {
                            nodes {
                                wiki
                                page
                                title
                            }
                        }
                    }
                `
            };
            const res = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(query)
            });
            const result = await res.json();
            const nodes = result.data?.articles?.nodes || [];

            if (nodes.length === 0) throw new Error('没有获取到页面列表');

            const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
            setTargetPage(randomNode);

            // 调用你的源码接口拉取真实代码
            const sourceRes = await fetch(`/api/source?site=${randomNode.wiki}&page=${encodeURIComponent(randomNode.page)}`);
            const sourceData = await sourceRes.json();

            if (!sourceRes.ok || !sourceData.sourceCode) {
                throw new Error('源码拉取失败');
            }

            const fullCode = sourceData.sourceCode;
            
            // 找一段包含维基语法的片段，截取 400 个字符左右，不然代码太长没法玩
            let startIndex = fullCode.indexOf('[[');
            if (startIndex === -1 || startIndex > fullCode.length - 400) {
                startIndex = 0;
            }
            const snippet = fullCode.substring(startIndex, startIndex + 400);

            // 制造代码损坏
            let damaged = snippet;
            damaged = damaged.replace('[[div', '[div');
            damaged = damaged.replace('[[/div]]', '[/div]');
            damaged = damaged.replace('[[module', '[module');
            damaged = damaged.replace('**', '*');

            // 如果替换后没有任何变化，说明这段代码没有上述标签，直接删掉一个右括号作为兜底
            if (damaged === snippet) {
                damaged = damaged.replace(']]', ']');
            }

            setOriginalCode(snippet);
            setUserCode(damaged);
            setTimeLeft(60);
            setGameState('playing');

        } catch (err) {
            alert('随机抽取异常代码失败，请重试');
            setGameState('idle');
        }
    };

    const handleVerify = () => {
        if (gameState !== 'playing') return;

        // 去掉首尾空格后精确对比
        if (userCode.trim() === originalCode.trim()) {
            setGameState('success');
            setScore(prev => prev + 100 + timeLeft * 2);
        } else {
            // 提交错误直接扣除 10 秒
            setTimeLeft(prev => Math.max(0, prev - 10));
        }
    };

    const handleAbort = () => {
        setGameState('idle');
        clearTimeout(timerRef.current);
    };

    return (
        <>
            <Head>
                <title>异常突破：代码修复逃脱 - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6">
                <div className="border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-red-500 tracking-tight">
                        异常突破：代码修复逃脱
                    </h1>
                    <p className="mt-2 text-gray-400 text-sm">
                        收容失效警告。系统将随机抽取真实的异常文档代码并注入破坏，你必须在倒计时结束前修复 Wikidot 语法才能重启隔离门。
                    </p>
                </div>

                {gameState === 'idle' && (
                    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-8 text-center mt-4 max-w-2xl mx-auto w-full">
                        <div className="text-red-500 text-6xl mb-6">
                            WIKIT DB
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">准备接入随机代码段</h2>
                        <p className="text-gray-400 mb-8">
                            接入后，系统会自动截取约 400 字符的代码切片，并随机破坏其中的闭合标签。每一次提交错误都将加速系统崩溃。
                        </p>
                        <button 
                            onClick={startRandomEscape}
                            className="w-full py-4 bg-red-900/40 hover:bg-red-900/80 text-red-400 border border-red-900/50 rounded-lg font-bold text-lg transition-colors"
                        >
                            启动随机抽取序列
                        </button>
                    </div>
                )}

                {gameState === 'loading' && (
                    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-12 text-center mt-4 max-w-2xl mx-auto w-full">
                        <div className="text-blue-500 text-4xl mb-4 animate-spin">
                            O
                        </div>
                        <div className="text-blue-400 font-mono tracking-widest animate-pulse">
                            正在全球数据库中随机定位异常页面...
                        </div>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center bg-gray-900 border border-red-900/50 p-4 rounded-lg">
                            <div>
                                <div className="text-gray-400 text-sm mb-1">受损档案来源：{targetPage?.wiki}</div>
                                <div className="text-white font-bold">{targetPage?.title || targetPage?.page}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-sm mb-1">系统崩溃倒计时</div>
                                <div className={`text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                                    00:{timeLeft.toString().padStart(2, '0')}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-sm font-medium text-gray-400 flex justify-between">
                                <span>源代码控制台 (直接修改受损代码)</span>
                                <span className="text-red-400">错误提交将扣除 10 秒时间</span>
                            </label>
                            <textarea 
                                value={userCode}
                                onChange={(e) => setUserCode(e.target.value)}
                                className="w-full h-80 bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                                spellCheck="false"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={handleVerify}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg transition-colors"
                            >
                                编译并验证覆写
                            </button>
                            <button 
                                onClick={handleAbort}
                                className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                紧急脱离
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'success' && (
                    <div className="bg-green-900/20 border border-green-500/30 p-8 rounded-xl text-center flex flex-col items-center mt-4">
                        <div className="text-green-500 text-5xl mb-4">
                            V
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">隔离门已重启</h2>
                        <p className="text-gray-400 mb-6">
                            你成功修复了 <span className="text-white">{targetPage?.title}</span> 的片段并阻止了收容失效。该次操作得分为：<span className="text-green-400 font-bold">{score}</span>
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setGameState('idle')}
                                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                            >
                                结算并返回大厅
                            </button>
                            <button 
                                onClick={startRandomEscape}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                            >
                                继续处理下一份档案
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'fail' && (
                    <div className="bg-red-900/20 border border-red-500/30 p-8 rounded-xl text-center flex flex-col items-center mt-4">
                        <div className="text-red-500 text-5xl mb-4">
                            X
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">收容失效</h2>
                        <p className="text-gray-400 mb-6">倒计时结束，这部分异常代码已彻底崩溃。</p>
                        <div className="flex gap-4">
                            <button 
                                onClick={startRandomEscape}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
                            >
                                抽取新档案重试
                            </button>
                            <button 
                                onClick={() => setGameState('idle')}
                                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                            >
                                返回大厅
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
