const config = require('../wikitdb.config.js');

const Header = () => {
    return (
        <header className="relative bg-gray-800/50 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10">
            <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
                <div className="relative flex h-16 items-center justify-between">
                    <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                        <button type="button" command="--toggle" commandfor="mobile-menu" className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white">
                            <span className="absolute -inset-0.5"></span>
                            <span className="sr-only">打开顶栏</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" data-slot="icon" aria-hidden="true" className="size-6 in-aria-expanded:hidden">
                                <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" data-slot="icon" aria-hidden="true" className="size-6 not-in-aria-expanded:hidden">
                                <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                        <a href="/" className="flex shrink-0 items-center">
                            <img src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500" alt="logo" className="h-8 w-auto" />
                            <span className="px-1.5 font-bold text-white">{config.SITE_NAME}</span>
                        </a>
                        <div className="hidden sm:ml-6 sm:block">
                            <div className="flex space-x-4">
                                <a href="/pages" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">页面</a>
                                <a href="/authors" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">作者</a>
                                <a href="/tools" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">工具</a>
                                <a href="/about" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">关于</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <el-disclosure id="mobile-menu" hidden className="block sm:hidden">
                <div className="space-y-1 px-2 pt-2 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                        <a href="/pages" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                            <i className="fa-solid fa-file"></i> 页面
                        </a>
                        <a href="/authors" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                            <i className="fa-solid fa-user"></i> 作者
                        </a>
                        <a href="/tools" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                            <i className="fa-solid fa-toolbox"></i> 工具
                        </a>
                        <a href="/about" className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                            <i className="fa-solid fa-circle-info"></i> 关于
                        </a>
                    </div>
                </div>
            </el-disclosure>
        </header>
    );
};

export default Header;
