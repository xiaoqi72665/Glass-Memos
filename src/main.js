import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ PWA Service Worker 注册成功', reg.scope))
            .catch(err => console.log('❌ PWA 注册失败: ', err));
    });
}

createApp(App).mount('#app')

