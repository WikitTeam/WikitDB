import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
const config = require('../wikitdb.config.js');

const Tools = () => {
    return (
        <>
            <Head>
                <title>工具 - {config.SITE_NAME}</title>
            </Head>

            <div className="py-8 max-w-5xl mx-auto">
                <div className="mb-8 border-b border-gray-700 pb-6">
                    <h1 className="text-3xl font-bold text-white">工具库</h1>
                    <p className="text-gray-400 mt-2 text-sm">提供基于 Wikit API 的各种便捷站点管理与查询工具。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* 成员管理工具卡片 */}
                    <Link 
                        href="/tools/member-admin" 
                        className="bg-gray-800/50 rounded-xl p-6 border border-white/10 hover:border-indigo-500/50 hover:bg-gray-800 transition-all group block"
                    >
                        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                            <i className="fa-solid fa-user-shield"></i>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                            成员管理 (Member Admin)
                        </h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            调用 Wikit 官方 API，安全地对指定站点的 Wikidot 用户执行移除或封禁操作。
                        </p>
                    </Link>

                    {/* 虚线占位框：提示未来会有更多工具 */}
                    <div className="bg-gray-800/30 rounded-xl p-6 border border-white/5 border-dashed flex flex-col items-center justify-center text-center min-h-[200px] opacity-70">
                        <i className="fa-solid fa-plus text-3xl text-gray-600 mb-3"></i>
                        <h2 className="text-lg font-medium text-gray-500">更多工具</h2>
                        <p className="text-sm text-gray-600 mt-1">敬请期待...</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Tools;
