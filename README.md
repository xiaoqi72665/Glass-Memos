# Glass Memos (映照)

一个专注于自我观察与记录的 Vue 3 应用。

## 功能特性

- **Vue 3 + Vite**: 现代化、高性能的前端架构。
- **PWA 支持**: 可作为应用安装到手机。
- **云端同步**: 支持与 Cloudflare Workers 后端同步数据。
- **暗色模式**: 支持系统自动或手动切换深色主题。
- **完全响应式**: 适配桌面端与移动端操作习惯。
- **AI 辅助记录**: 提供“一句话总结”生成与“客观事实”润色功能 (需配置)。

## AI 功能说明

本应用集成了 AI 辅助写作功能，旨在帮助用户更轻松地记录，但严格遵循以下原则：

1.  **仅做辅助**：AI 仅用于文字层面的压缩（总结）与润色（去口语化）。
2.  **绝对中立**：AI 不参与理解、判断、解释、建议或决策。
3.  **用户主导**：所有生成内容仅作为“候选”，必须由用户点击“应用”才会写入。

**支持的 AI 操作：**
- **一句话总结**：基于“客观事实”生成 26 字以内的概括。
- **事实润色**：整理语序，去除口语，保留原意与时间顺序。

**隐私说明**：AI 接口仅在用户点击按钮时调用，且严格使用固定 Prompt 模板，不会发送其他无关字段。

## 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境**
   复制 `.env.example` 为 `.env` (如果不存在)，并配置你的后端 API 地址：
   ```ini
   VITE_API_URL=https://your-worker-url.workers.dev
   
   # AI 功能配置 (支持 OpenAI 兼容接口，如 DeepSeek, Moonshot 等)
   VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
   VITE_AI_API_KEY=sk-your-api-key
   VITE_AI_MODEL=gpt-3.5-turbo
   ```

   > **注意**: AI 功能默认关闭，仅当配置了 API Key 后才会显示相关按钮。

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 部署

本项目构建产物位于 `dist/` 目录。
该目录默认被 git 忽略，部署时请基于构建流程重新生成，或手动上传该文件夹内容到静态托管服务。

## 目录结构

- `src/components`: UI 组件
- `src/composables`: 业务逻辑 (Auth, Theme, Data)
- `src/assets`: 静态资源与样式
