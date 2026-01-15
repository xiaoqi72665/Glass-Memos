<script setup>
import { useNotes } from '../composables/useNotes'
import { ref, reactive, watch } from 'vue'
import { aiService } from '../services/aiService'

const { notes, addOrUpdateNote, deleteNote: removeNote } = useNotes()

const isOpen = ref(false)
const isEditMode = ref(false)

const form = reactive({
    id: '',
    date: '',
    weather: '☀️',
    mood: '😐',
    summary: '',
    fact: '',
    reaction: '',
    pattern: '',
    experiment: '',
    tags: ''
})

// AI State
const aiState = reactive({
    summaryLoading: false,
    summaryCandidate: null,
    polishLoading: false,
    polishCandidate: null
})

const weatherOptions = [
    { value: '☀️', label: '☀️ 晴朗' },
    { value: '⛅', label: '⛅ 多云' },
    { value: '☁️', label: '☁️ 阴天' },
    { value: '🌧️', label: '🌧️ 雨天' },
    { value: '⛈️', label: '⛈️ 雷雨' },
    { value: '❄️', label: '❄️ 雪天' },
    { value: '🌬️', label: '🌬️ 大风' },
    { value: '🌫️', label: '🌫️ 雾霾' }
]

const moodOptions = [
    { value: '😐', label: '😐 平淡' },
    { value: '😄', label: '😄 很好' },
    { value: '🙂', label: '🙂 不错' },
    { value: '😕', label: '😕 低落' },
    { value: '😣', label: '😣 很糟' }
]

const FIXED_TAGS = ['工作', '学习', '创作', '关系', '家庭', '健康', '生活', '情绪', '金钱', '自我']

function open(id = null) {
    isOpen.value = true
    // Reset AI state
    resetAiState()
    
    if (id) {
        isEditMode.value = true
        const note = notes.value.find(n => n.id === id)
        if (note) {
            form.id = note.id
            form.date = note.date
            
            form.weather = note.weather || '☀️'
            form.mood = note.mood || '😐'
            
            form.summary = note.summary || note.title || ''
            form.fact = note.fact || note.content || ''
            form.reaction = note.reaction || ''
            form.pattern = note.pattern || ''
            form.experiment = note.experiment || ''
            form.tags = note.tags.join(', ')
        }
    } else {
        isEditMode.value = false
        form.id = ''
        form.date = new Date().toISOString().split('T')[0]
        form.weather = '☀️ 晴朗' // Default
        form.mood = '😐 平淡'
        
        form.summary = ''
        form.fact = ''
        form.reaction = ''
        form.pattern = ''
        form.experiment = ''
        form.tags = ''
    }
}

function close() {
    isOpen.value = false
    resetAiState()
}

// Note: Reset AI state logic remains same
function resetAiState() {
    aiState.processing = false
    aiState.summaryCandidate = null
    aiState.polishCandidate = null
}

async function handleAIProcess() {
    if (!form.fact) {
        alert('请先填写"发生了什么"')
        return
    }
    
    // Reset previous candidates
    aiState.summaryCandidate = null
    aiState.polishCandidate = null
    aiState.processing = true
    
    const res = await aiService.processNote(form.fact)
    aiState.processing = false
    
    if (res.ok) {
        aiState.summaryCandidate = res.summary
        aiState.polishCandidate = res.polishedFact
    } else {
        alert('AI 处理失败: ' + res.reason)
    }
}

function applySummary() {
    if (aiState.summaryCandidate) {
        form.summary = aiState.summaryCandidate
        aiState.summaryCandidate = null
    }
}

function discardSummary() {
    aiState.summaryCandidate = null
}

function applyPolish() {
    if (aiState.polishCandidate) {
        form.fact = aiState.polishCandidate
        aiState.polishCandidate = null
    }
}

function discardPolish() {
    aiState.polishCandidate = null
}

function handleSave() {
    if (!form.fact && !form.summary) {
        alert('请至少记录发生了什么，或者写一个总结。')
        return
    }

    const tagsArray = form.tags.split(/[,，]/).map(t => t.trim()).filter(t => t)
    const combinedContent = `[事实]: ${form.fact}\n[反应]: ${form.reaction}\n[模式]: ${form.pattern}\n[实验]: ${form.experiment}`.trim()

    const noteData = {
        id: form.id || Date.now().toString(),
        date: form.date,
        weather: form.weather,
        mood: form.mood,
        tags: [...new Set(tagsArray)],
        updatedAt: new Date().toISOString(),
        summary: form.summary,
        fact: form.fact,
        reaction: form.reaction,
        pattern: form.pattern,
        experiment: form.experiment,
        title: form.summary || '无标题',
        content: combinedContent
    }

    addOrUpdateNote(noteData)
    close()
}

function handleDelete() {
    if (!confirm('确定删除这条记录吗？')) return
    removeNote(form.id)
    close()
}

function addTag(tag) {
    const currentTags = form.tags.split(/[,，]/).map(t => t.trim()).filter(t => t)
    if (!currentTags.includes(tag)) {
        currentTags.push(tag)
        form.tags = currentTags.join(', ')
    }
}

defineExpose({ open, close })
</script>

<template>
    <div class="modal-overlay" :class="{ open: isOpen }" @click.self="close">
        <div class="modal-card glass-modal">
            <div class="modal-header">
                <span id="modalTitle">{{ isEditMode ? '编辑观察' : '新建观察' }}</span>
                <span class="header-hint">用于看见，而非评判</span>
                <button class="close-btn" @click="close">✕</button>
            </div>

            <div class="modal-body">
                <div class="form-section">
                    <div class="date-weather-row">
                        <input type="date" v-model="form.date" class="input-field date-input">

                        <select v-model="form.weather" class="input-field meta-select">
                            <option v-for="opt in weatherOptions" :key="opt.value" :value="opt.label">{{ opt.label }}</option>
                        </select>

                        <select v-model="form.mood" class="input-field meta-select mood-select">
                            <option v-for="opt in moodOptions" :key="opt.value" :value="opt.label">{{ opt.label }}</option>
                        </select>
                    </div>
                </div>

                <!-- Summary Section -->
                <div class="form-section">
                    <label class="form-label">一句话总结</label>
                    
                    <input type="text" v-model="form.summary" class="input-field title-input" placeholder="概括这次记录...">
                    
                    <!-- Candidate View for Summary -->
                    <div v-if="aiState.summaryCandidate" class="ai-candidate-box">
                        <div class="candidate-header">
                            <span class="ai-badge">🔮 AI 对本次记录的总结建议</span>
                            <div class="candidate-actions">
                                <button class="action-btn apply" @click="applySummary">✓ 采纳</button>
                                <button class="action-btn discard" @click="discardSummary">✕ 忽略</button>
                            </div>
                        </div>
                        <div class="candidate-content">{{ aiState.summaryCandidate }}</div>
                    </div>
                </div>

                <!-- Fact Section -->
                <div class="form-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label class="form-label" style="margin-bottom:0">发生了什么（客观事实）</label>
                        <button class="ai-btn" @click="handleAIProcess" :disabled="aiState.processing">
                            {{ aiState.processing ? '✨ 正在思考...' : '✨ AI 辅助润色' }}
                        </button>
                    </div>

                    <textarea v-model="form.fact" class="input-field content-input small-area"
                        placeholder="今天发生了哪些关键事情？&#10;在什么场景，和谁？"></textarea>
                        
                    <!-- Candidate View for Polish -->
                    <div v-if="aiState.polishCandidate" class="ai-candidate-box polish-box">
                        <div class="candidate-header">
                            <span class="ai-badge">✨ AI 润色后的事实</span>
                            <div class="candidate-actions">
                                <button class="action-btn apply" @click="applyPolish">✓ 覆盖原文</button>
                                <button class="action-btn discard" @click="discardPolish">✕ 忽略</button>
                            </div>
                        </div>
                        <div class="candidate-content">{{ aiState.polishCandidate }}</div>
                    </div>
                </div>

                <div class="form-section">
                    <label class="form-label">我当时的第一反应</label>
                    <textarea v-model="form.reaction" class="input-field content-input small-area"
                        placeholder="我当时在想什么？&#10;情绪反应是怎样的？"></textarea>
                </div>
                <div class="form-section">
                    <label class="form-label">这反映了什么模式</label>
                    <input type="text" v-model="form.pattern" class="input-field" placeholder="比如：我总是习惯先责怪自己">
                </div>
                <div class="form-section highlight-section">
                    <label class="form-label highlight-label">✨ 下次我准备试试这样做（实验）</label>
                    <input type="text" v-model="form.experiment" class="input-field highlight-input"
                        placeholder="下次遇到类似情况时，尝试一个小改变...">
                </div>
                <div class="form-section">
                    <label class="form-label">标签</label>
                    <div class="fixed-tags">
                        <span v-for="tag in FIXED_TAGS" :key="tag" class="tag-pill" @click="addTag(tag)">
                            {{ tag }}
                        </span>
                    </div>
                    <input type="text" v-model="form.tags" class="input-field tags-input" placeholder="工作, 情绪 (逗号分隔)">
                </div>
                
                <!-- Hint for mobile keyboard space -->
                <div style="height: 100px;"></div>
            </div>

            <div class="modal-footer">
                <button v-if="isEditMode" @click="handleDelete" class="danger-btn">删除</button>
                <button v-else style="display:none"></button> <!-- Spacer -->
                
                <div style="margin-left:auto; display:flex; gap:10px;">
                    <button class="secondary-btn" @click="close">取消</button>
                    <button class="primary-btn save-btn" @click="handleSave">保存记录</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* AI Specific Styles - Enhanced */
.ai-btn {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text-color);
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 6px;
}

.ai-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
}

.ai-btn:disabled {
    opacity: 0.6;
    cursor: wait;
}

/* Common Box Style */
.ai-candidate-box {
    margin-top: 16px;
    background: rgba(20, 20, 25, 0.6); /* Deeper dark background */
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px; /* Softer corners */
    padding: 0;
    animation: slideUpFade 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    position: relative;
}

/* Box Polish Gradient Border */
.ai-candidate-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(var(--primary-rgb), 0.6), transparent);
    z-index: 1;
}

.polish-box {
    background: rgba(15, 30, 40, 0.6);
}

.polish-box::before {
    background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.7), transparent);
}

/* Header */
.candidate-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ai-badge {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* Default Badge Color (Summary) */
.ai-badge {
    color: #e2a0ff;
    text-shadow: 0 0 12px rgba(226, 160, 255, 0.3);
}

/* Polish Badge Color */
.polish-box .ai-badge {
    color: #80d0ff;
    text-shadow: 0 0 12px rgba(128, 208, 255, 0.3);
}

/* Actions */
.candidate-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 8px; /* Softer buttons */
    cursor: pointer;
    border: none;
    font-weight: 500;
    transition: all 0.2s;
}

.action-btn.apply {
    background: linear-gradient(135deg, var(--primary-color), #8e44ad);
    color: white;
    box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.3);
}

.polish-box .action-btn.apply {
    background: linear-gradient(135deg, #2196F3, #00BCD4);
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.action-btn.apply:hover {
    transform: translateY(-1px);
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.5);
}

.action-btn.discard {
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
}

.action-btn.discard:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
}

/* Content */
.candidate-content {
    font-size: 14px;
    line-height: 1.7; /* Better readability */
    color: rgba(255, 255, 255, 0.9);
    padding: 16px;
    white-space: pre-wrap;
    background: transparent; /* Clean look */
}

/* Animations */
@keyframes slideUpFade {
    from { 
        opacity: 0; 
        transform: translateY(10px) scale(0.98); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
    }
}

/* Existing styles preserved */
.label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

.fixed-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
}

.tag-pill {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
}

.tag-pill:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
}
/* Safe Area Support (Dynamic Island) */
.modal-header {
    /* Existing styles implicit or inherited */
    padding-top: max(20px, env(safe-area-inset-top)); /* Adapt to notch/island */
}

.modal-footer {
    padding-bottom: max(20px, env(safe-area-inset-bottom)); /* Home indicator */
}

/* Ensure body content doesn't get cut off at bottom scroll */
.modal-body {
    padding-bottom: calc(80px + env(safe-area-inset-bottom)); 
}
</style>

