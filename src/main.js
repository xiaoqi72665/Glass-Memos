import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'

if ('serviceWorker' in navigator) {
    const isDev = import.meta && import.meta.env && import.meta.env.DEV

    if (isDev) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(reg => reg.unregister())
        })
        if ('caches' in window) {
            caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
        }
    } else {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('✅ PWA Service Worker 注册成功', reg.scope))
                .catch(err => console.log('❌ PWA 注册失败: ', err))
        })
    }
}

createApp(App).mount('#app')
