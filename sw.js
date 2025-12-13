const CACHE_NAME = 'glass-memos-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './Logo.svg',
    './manifest.json',
    // ⚠️ 确保你生成了下面这两个图标文件，否则第一次加载会报错
    './image/icon-192.png', 
    './image/icon-512.png'
];

// 1. 安装 Service Worker
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. 激活并清理旧缓存
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 3. 拦截网络请求 (App Shell 优先缓存，API 网络优先)
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // 如果是 API 请求 (Cloudflare Worker)，直接走网络，不缓存
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
        return; 
    }

    // 其他静态资源：缓存优先 -> 网络回退
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});