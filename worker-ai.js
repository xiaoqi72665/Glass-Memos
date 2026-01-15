/**
 * Cloudflare Worker for AI Proxy (Baidu V2 - OpenAI Compatible)
 * 
 * 部署说明 / Deployment Instructions:
 * 1. 复制此代码到 Cloudflare Worker 编辑器 / Copy this code to Cloudflare Worker editor
 * 2. 在 Settings -> Variables 中添加以下环境变量 / Add these environment variables:
 *    - BAIDU_API_KEY: 你的 bce-v3 开头的长 Key (原 .env 中的 VITE_AI_API_KEY)
 *    - BAIDU_MODEL: (可选) 模型名称，例如 "ernie-speed-128k" 或 "ernie-4.0-turbo-8k"。默认使用 "ernie-speed-128k"
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === '/ai/summary' || path === '/ai/polish') {
                return await handleAIRequest(request, env, path);
            }

            return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
        } catch (error) {
            return new Response(JSON.stringify({ ok: false, reason: error.message }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }
    }
};

async function handleAIRequest(request, env, path) {
    const { content } = await request.json();

    if (!content) {
        throw new Error('Content is required');
    }

    // 1. Get Config
    const apiKey = env.BAIDU_API_KEY; // The bce-v3/... key
    const model = env.BAIDU_MODEL || 'ernie-speed-128k'; // Default cost-effective model

    if (!apiKey) {
        throw new Error('Server Config Error: Missing BAIDU_API_KEY');
    }

    // 2. Select Prompt based on path
    let systemPrompt = "";
    let userPrompt = "";

    if (path === '/ai/summary') {
        // 摘要: 客观发生什么 -> 一句话 (<=26字)
        systemPrompt = "你是一个文字压缩工具。严格遵守：1.仅基于输入内容 2.禁止新增信息、情绪 3.输出≤26字 4.直接输出结果，不要解释。";
        userPrompt = `请将以下内容压缩为一句话总结(发生什么)，严格少于26字：\n${content}`;
    } else {
        // 润色: 事实描述 -> 语序整理
        systemPrompt = "你是一个文字润色工具。严格遵守：1.保留时间顺序 2.仅做语序整理与去口语化 3.禁止新增事件/原因/情绪/判断 4.输出不超过原文120% 5.直接输出结果。";
        userPrompt = `请润色以下事实描述：\n${content}`;
    }

    // 3. Call Baidu API (V2 OpenAI Compatible)
    // Base URL: https://qianfan.baidubce.com/v2/chat/completions
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
        // OpenAI compatible error format usually has 'error' object
        throw new Error(`Baidu API Error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    // OpenAI format: choices[0].message.content
    const outputText = result.choices?.[0]?.message?.content;

    if (!outputText) {
        throw new Error('Invalid API Response: No content');
    }

    return new Response(JSON.stringify({
        ok: true,
        text: outputText
    }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}
