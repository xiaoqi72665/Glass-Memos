/**
 * Cloudflare Worker - Complete Version (Auth + Data Sync + AI)
 * 
 * 部署说明 / Deployment Instructions:
 * 1. 复制此代码到 Cloudflare Worker 编辑器，替换原有全部代码。
 * 2. 确保 Settings -> Variables 中有以下变量:
 *    - BAIDU_API_KEY: 你的 bce-v3 开头的长 Key (用于 AI)
 *    - BAIDU_MODEL: (可选) 模型名称，默认 ernie-speed-128k
 * 3. 确保 KV Namespaces 绑定了 GROWTH_MEMOS_KV (你原来应该已经绑好了)
 */

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 1. 跨域配置 / CORS
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        // 根路径检查
        if (url.pathname === "/" || url.pathname === "") {
            return new Response("Worker & Sync Service is running (+AI)!", { headers: CORS_HEADERS });
        }

        // ===========================
        // 🔐 鉴权辅助函数
        // ===========================
        async function checkAuth(req) {
            const authHeader = req.headers.get("Authorization");
            if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
            const token = authHeader.split(" ")[1];
            // 注意：AI 调用时如果没传 token，这里会返回 false。
            // 目前 AI 接口暂时未强制鉴权，以免影响你现有的前端调用。
            // 如果需要保护 AI 接口，请确保前端 aiService.js 发送 Authorization 头。
            const value = await env.GROWTH_MEMOS_KV.get(`sess_${token}`);
            return value === "valid";
        }

        // ===========================
        // A. 登录接口 / Login
        // ===========================
        if (url.pathname.endsWith("/auth/login") && request.method === "POST") {
            try {
                const { password } = await request.json();
                const savedPassword = await env.GROWTH_MEMOS_KV.get("auth:password");

                if (!savedPassword) return new Response(JSON.stringify({ ok: false, error: "Server password not set" }), { status: 500, headers: CORS_HEADERS });
                if (password !== savedPassword) return new Response(JSON.stringify({ ok: false, error: "密码错误" }), { status: 401, headers: CORS_HEADERS });

                const token = crypto.randomUUID();
                await env.GROWTH_MEMOS_KV.put(`sess_${token}`, "valid", { expirationTtl: 2592000 }); // 30天

                return new Response(JSON.stringify({ ok: true, token }), { headers: CORS_HEADERS });
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400, headers: CORS_HEADERS });
            }
        }

        // ===========================
        // B. 校验 Token 接口 / Verify
        // ===========================
        if (url.pathname.endsWith("/auth/verify") && request.method === "POST") {
            const isValid = await checkAuth(request);
            return new Response(JSON.stringify({ ok: isValid }), {
                status: isValid ? 200 : 401,
                headers: CORS_HEADERS
            });
        }

        // ===========================
        // C. 📥 获取数据 / Get Data
        // ===========================
        if (url.pathname.endsWith("/api/data") && request.method === "GET") {
            if (!await checkAuth(request)) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });

            const data = await env.GROWTH_MEMOS_KV.get("memo_data");
            return new Response(data || "[]", {
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
            });
        }

        // ===========================
        // D. 📤 保存数据 / Save Data
        // ===========================
        if (url.pathname.endsWith("/api/data") && request.method === "POST") {
            if (!await checkAuth(request)) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });

            try {
                const data = await request.text();
                await env.GROWTH_MEMOS_KV.put("memo_data", data);
                return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS_HEADERS });
            }
        }

        // ===========================
        // E. ✨ AI 功能接口 / AI Features
        // ===========================
        if (url.pathname === '/ai/summary' || url.pathname === '/ai/polish') {
            if (request.method !== 'POST') {
                return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
            }
            return await handleAIRequest(request, env, url.pathname);
        }

        return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    },
};

// ===========================
// AI 逻辑处理函数
// ===========================
async function handleAIRequest(request, env, path) {
    try {
        const { content } = await request.json();

        if (!content) throw new Error('Content is required');

        // 1. 获取配置 / Get Config
        const apiKey = env.BAIDU_API_KEY; // 需要在 Variable 里设置
        const model = env.BAIDU_MODEL || 'ernie-speed-128k';

        if (!apiKey) throw new Error('Server Config Error: Missing BAIDU_API_KEY');

        // 2. 选择提示词 / Select Prompt
        let systemPrompt = "";
        let userPrompt = "";

        if (path === '/ai/summary') {
            systemPrompt = "你是一个文字压缩工具。严格遵守：1.仅基于输入内容 2.禁止新增信息、情绪 3.输出≤26字 4.直接输出结果，不要解释。";
            userPrompt = `请将以下内容压缩为一句话总结(发生什么)，严格少于26字：\n${content}`;
        } else {
            systemPrompt = "你是一个文字润色工具。严格遵守：1.保留时间顺序 2.仅做语序整理与去口语化 3.禁止新增事件/原因/情绪/判断 4.输出不超过原文120% 5.直接输出结果。";
            userPrompt = `请润色以下事实描述：\n${content}`;
        }

        // 3. 调用百度 API / Call API
        const apiUrl = `https://qianfan.baidubce.com/v2/chat/completions`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                stream: false
            })
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(`Baidu API Error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        const outputText = result.choices?.[0]?.message?.content;
        if (!outputText) throw new Error('Invalid API Response: No content');

        return new Response(JSON.stringify({ ok: true, text: outputText }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, reason: error.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
