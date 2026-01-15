/**
 * Cloudflare Worker - Complete Version (Auth + Data Sync + AI)
 * 
 * 部署说明:
 * 1. 复制此代码到 Cloudflare Worker 编辑器，替换原有全部代码
 * 2. 环境变量 (Settings -> Variables):
 *    - BAIDU_API_KEY: bce-v3/...
 *    - BAIDU_MODEL: ernie-speed-128k (或其他)
 */

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 1. CORS
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        if (url.pathname === "/" || url.pathname === "") {
            return new Response("Worker & Sync Service (+AI V2) is running!", { headers: CORS_HEADERS });
        }

        // ===========================
        // 🔐 Auth Helper
        // ===========================
        async function checkAuth(req) {
            const authHeader = req.headers.get("Authorization");
            if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
            const token = authHeader.split(" ")[1];
            const value = await env.GROWTH_MEMOS_KV.get(`sess_${token}`);
            return value === "valid";
        }

        // ===========================
        // Auth & Data Routes (Unchanged)
        // ===========================
        if (url.pathname.endsWith("/auth/login") && request.method === "POST") {
            try {
                const { password } = await request.json();
                const savedPassword = await env.GROWTH_MEMOS_KV.get("auth:password");
                if (!savedPassword) return new Response(JSON.stringify({ ok: false, error: "Server password not set" }), { status: 500, headers: CORS_HEADERS });
                if (password !== savedPassword) return new Response(JSON.stringify({ ok: false, error: "密码错误" }), { status: 401, headers: CORS_HEADERS });
                const token = crypto.randomUUID();
                await env.GROWTH_MEMOS_KV.put(`sess_${token}`, "valid", { expirationTtl: 2592000 });
                return new Response(JSON.stringify({ ok: true, token }), { headers: CORS_HEADERS });
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400, headers: CORS_HEADERS });
            }
        }

        if (url.pathname.endsWith("/auth/verify") && request.method === "POST") {
            const isValid = await checkAuth(request);
            return new Response(JSON.stringify({ ok: isValid }), { status: isValid ? 200 : 401, headers: CORS_HEADERS });
        }

        if (url.pathname.endsWith("/api/data") && request.method === "GET") {
            if (!await checkAuth(request)) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
            const data = await env.GROWTH_MEMOS_KV.get("memo_data");
            return new Response(data || "[]", { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }

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
        // E. ✨ AI Combined Processing
        // ===========================
        if (url.pathname === '/ai/process') {
            if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
            return await handleAIProcess(request, env);
        }

        return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    },
};

// ===========================
// AI Logic (Single Call, Two Steps)
// ===========================
async function handleAIProcess(request, env) {
    try {
        const { content } = await request.json();
        if (!content) throw new Error('Content is required');

        const apiKey = env.BAIDU_API_KEY;
        const model = env.BAIDU_MODEL || 'ernie-speed-128k';

        if (!apiKey) throw new Error('Server Config Error: Missing BAIDU_API_KEY');

        // Combined Prompt Strategy
        const systemPrompt = `你是一个专业的观察记录辅助AI。请严格按照以下两步处理用户输入的文本，并仅返回JSON格式结果。

【任务步骤】
第一步：事实润色
- 对用户输入的“发生了什么”进行润色。
- 规则：保留时间顺序；仅做语序整理与去口语化；禁止新增事件、原因、情绪或判断；长度不超过原文120%。
- 格式要求：每个独立的时间点或事件，请务必强制换行（使用 \\n），使段落清晰易读。

第二步：一句话总结
- 基于“第一步润色后的内容”生成总结。
- 规则：严格少于26字；仅基于客观事实；禁止情绪和观点。
- 如果内容太短无法总结，摘要字段返回空字符串。

【输出格式】
严格返回以下 JSON 格式，不要包含 markdown 代码块或其他文本：
{
  "ok": true,
  "polishedFact": "润色后的内容...",
  "summary": "一句话总结..."
}`;

        const userPrompt = `用户输入内容：\n${content}`;

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
                response_format: { type: "json_object" } // Try to enforce JSON if model supports
            })
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(`Baidu API Error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        let outputText = result.choices?.[0]?.message?.content;
        if (!outputText) throw new Error('Invalid API Response: No content');

        // Clean up potential markdown code blocks (```json ... ```)
        outputText = outputText.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        let jsonResult;
        try {
            jsonResult = JSON.parse(outputText);
        } catch (e) {
            // Fallback: Try to find JSON object in text
            const match = outputText.match(/\{[\s\S]*\}/);
            if (match) {
                jsonResult = JSON.parse(match[0]);
            } else {
                throw new Error("Failed to parse AI JSON response");
            }
        }

        return new Response(JSON.stringify(jsonResult), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ ok: false, reason: error.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
