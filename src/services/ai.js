
const API_URL = import.meta.env.VITE_AI_API_URL;
const API_KEY = import.meta.env.VITE_AI_API_KEY;
const MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo';

export const isAIConfigured = () => !!API_URL && !!API_KEY;

/**
 * 通用 AI 调用函数
 * 遵循 OpenAI Chat Completion API 标准
 */
async function callAI(systemPrompt, userContent, maxTokens = 500) {
    if (!isAIConfigured()) {
        return { ok: false, reason: 'AI 服务未配置，请检查设置。' };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                // 为了最大限度兼容（部分模型不支持 system role），将 system prompt 拼接到 user content 中
                messages: [
                    { role: 'user', content: systemPrompt + '\n\n<content>\n' + userContent + '\n</content>' }
                ],
                temperature: 0.3,
                max_tokens: maxTokens,
                // 为了兼容性，不强制 response_format: "json_object"，完全依赖 Prompt 约束
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            let reason = `请求失败 (${response.status})`;
            try {
                const errJson = JSON.parse(errText);
                if (errJson.error && errJson.error.message) {
                    reason += `: ${errJson.error.message}`;
                }
            } catch (e) {
                reason += `: ${errText.slice(0, 100)}`;
            }
            return { ok: false, reason };
        }

        const data = await response.json();
        console.log('[AI Debug] Raw Response:', data); // Debug log

        // 兼容不同的 API 返回格式
        // 1. OpenAI 标准: choices[0].message.content
        // 2. 部分国产模型/代理: result 或 output.text
        let content = data.choices?.[0]?.message?.content;
        if (!content && data.result) content = data.result;
        if (!content && typeof data.result === 'object') content = JSON.stringify(data.result); // 某些极端情况

        content = content ? content.trim() : '';

        if (!content) {
            return { ok: false, reason: 'AI 返回内容为空' };
        }

        // 尝试解析 JSON
        try {
            // 终极清理方案：只提取第一个 { 和最后一个 } 之间的内容
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');

            if (firstBrace === -1 || lastBrace === -1) {
                throw new Error('未找到有效的 JSON 对象');
            }

            const jsonStr = content.substring(firstBrace, lastBrace + 1);

            const result = JSON.parse(jsonStr);

            // 验证字段
            if (typeof result.ok !== 'boolean') {
                return { ok: false, reason: 'AI 返回格式不符合规范 (缺少 ok 字段)' };
            }
            return result;
        } catch (e) {
            console.error('JSON Parse Error:', e, content);
            return { ok: false, reason: 'AI 返回数据无法解析', raw: content };
        }

    } catch (e) {
        console.error('AI Service Error:', e);
        return { ok: false, reason: `网络或未知错误: ${e.message}` };
    }
}

// ----------------------------------------------------------------------
// 固定 Prompt 模板
// ----------------------------------------------------------------------

const PROMPT_PROCESS = `
你是一个辅助写作的 AI，只负责语言层处理，不参与理解、判断或解释意义。

请严格按以下步骤处理 <content> 中的“客观事实”文本：

【步骤一：事实润色】
- 仅做语序整理与去口语化
- 严格保留原有时间顺序
- 将不同事件分行描述，每行只写一个独立事件
- 禁止新增任何事件、原因、情绪、判断
- 输出长度不超过原文的 120%

【步骤二：一句话总结】
- 仅基于“步骤一得到的润色事实”进行语言压缩
- 生成一句不超过 26 个汉字的总结句
- 禁止解释意义、禁止评价情绪、禁止抽象概念

【输出要求】
- 必须返回合法 JSON
- 格式如下：
{
  "ok": true,
  "polishedFact": "...",
  "summary": "..."
}
- 若无法生成 summary，可返回空字符串
- 不要输出任何 Markdown、说明文字或多余内容
`.trim();

// ----------------------------------------------------------------------
// 导出方法
// ----------------------------------------------------------------------

export async function processNote(factText) {
    if (!factText || !factText.trim()) {
        return { ok: false, reason: '没有输入事实内容' };
    }
    return callAI(PROMPT_PROCESS, factText, 2000);
}
