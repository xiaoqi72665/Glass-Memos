# 映照 (Glass Memos)

<div align="center">
  <img src="/public/Logo.svg" width="100" height="100" alt="Glass Memos Logo" />
  <h3>看见即治愈</h3>
  <p>一个专注于自我观察、记录与觉察的现代化 Web 应用。</p>
</div>

---

## ✨ 项目简介

**映照 (Glass Memos)** 是一个基于 **Vue 3** 构建的渐进式 Web 应用 (PWA)。它不只是一个备忘录，更是一个帮助你练习“客观观察”的工具。通过分离“客观事实”、“情绪反应”和“模式识别”，帮助你从混乱的思绪中抽离，建立清晰的自我认知。

本项目采用 **无服务器架构 (Serverless)**，利用 Cloudflare Workers + KV 存储数据，安全、低成本且极速。

## 🚀 核心特性

- **💎 玻璃拟态设计**：精致的 iOS 风格 UI，流畅的动画与交互体验。
- **🤖 AI 辅助 (安全版)**：
    - **智能压缩**：一句话总结冗长的事件（<26字）。
    - **客观润色**：自动去除情绪化与口语表达，还原事实原貌。
    - *特点：基于 Cloudflare Worker 代理，API Key 不暴露于前端，绝对安全。*
- **☁️ 云端同步**：基于 Cloudflare KV 的数据存储，多设备实时同步。
- **🔐 隐私安全**：支持访问密码保护，数据完全掌控在你手中。
- **📱 PWA 支持**：可直接安装到手机桌面，离线亦可访问（基础功能）。
- **🎨 深色模式**：自动跟随系统日夜切换。

## 🛠️ 技术栈

- **前端**：Vue 3, Vite, Glassmorphism CSS
- **后端**：Cloudflare Workers (Edge Computing)
- **数据库**：Cloudflare KV (Key-Value Storage)
- **AI 服务**：Baidu ERNIE (Via OpenAI-Compatible Interface)

## 📦 快速开始

### 1. 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env

# 启动开发服务器
npm run dev
```

### 2. 部署后端 (Cloudflare Worker)

本项目依赖 Cloudflare Worker 作为后端 API 网关和 AI 代理。

1.  登录 Cloudflare Dashboard，创建一个新的 Worker。
2.  绑定 KV Namespace (变量名: `GROWTH_MEMOS_KV`)。
3.  设置环境变量 (Settings -> Variables):
    *   `BAIDU_API_KEY`: 你的百度文心千帆 API Key (`bce-v3/...`)
4.  复制项目中的 `worker-merged.js` 代码到 Worker 编辑器并部署。

### 3. 部署前端 (Cloudflare Pages)

1.  由 GitHub 连接仓库部署。
2.  **构建配置**:
    *   **构建命令 (Build Command)**: `npm run build`
    *   **构建输出目录 (Build output directory)**: `dist`
3.  **环境变量 (Environment Variables)**:
    *   `VITE_API_URL`: 填入你第2步部署的 Worker 地址 (例如 `https://your-worker.workers.dev`)。

## 🤖 AI 原则

我们在引入 AI 时设定了严格的边界，以确保工具的纯粹性：

1.  **仅做辅助**：AI 仅用于文字层面的压缩与润色。
2.  **绝对中立**：AI 不参与理解、判断、解释或建议。
3.  **用户主导**：AI 生成内容仅为候选，必须经由用户确认才可写入。

## 📂 目录结构

```
.
├── src/
│   ├── components/    # Vue 组件 (EditModal, LoginOverlay 等)
│   ├── composables/   # 组合式 API (useAuth, useNotes)
│   ├── services/      # 外部服务 (AI, API)
│   └── ...
├── worker-merged.js   # 后端 Worker 完整代码 (Auth + AI)
├── public/            # 静态资源
└── vite.config.js     # Vite 配置
```

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
