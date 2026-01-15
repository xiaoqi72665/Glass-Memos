<script setup>
import { useNotes } from '../composables/useNotes'
import { ref, computed } from 'vue'

const { notes, deleteNote } = useNotes()
const props = defineProps({
    modelValue: Boolean
})
const emit = defineEmits(['update:modelValue', 'edit'])

const currentId = ref(null)
const isOpen = ref(false)

const note = computed(() => notes.value.find(n => n.id === currentId.value))

function formatDate(d) {
    if (!d) return ''
    const today = new Date().toISOString().split('T')[0]
    return d === today ? '今天' : d
}

function open(id) {
    currentId.value = id
    isOpen.value = true
}

function close() {
    isOpen.value = false
}

function handleDelete() {
    if (confirm('确定要删除这条记录吗？此操作无法撤销。')) {
        deleteNote(currentId.value)
        close()
    }
}

function handleEdit() {
    close()
    setTimeout(() => {
        emit('edit', currentId.value)
    }, 50)
}

defineExpose({ open, close })
</script>

<template>
    <div class="modal-overlay" :class="{ open: isOpen }" @click.self="close">
        <div class="modal-card glass-modal" v-if="note">
            <div class="modal-header preview-header">
                <div class="preview-meta">
                    <span class="meta-date">{{ formatDate(note.date) }}</span>
                    <span class="meta-item">{{ note.weather }}</span>
                    <span class="meta-item">{{ note.mood }}</span>
                </div>
                <div class="header-actions">
                    <button class="icon-btn edit-icon-btn danger-icon-btn" title="删除" @click="handleDelete">🗑️</button>
                    <button class="icon-btn edit-icon-btn" title="编辑" @click="handleEdit">✏️</button>
                    <button class="close-btn btn-close-preview" @click="close">✕</button>
                </div>
            </div>

            <div class="modal-body preview-body">
                <h2 class="preview-title">{{ note.summary || note.title || '无标题' }}</h2>
                
                <div class="preview-content-block">
                    <div v-if="note.experiment" class="experiment-block">
                        <span class="exp-label">✨ 下次尝试</span>
                        <div class="exp-text">{{ note.experiment }}</div>
                    </div>
                    <div v-else class="fact-block">
                        <div class="fact-text">{{ note.fact || note.content }}</div>
                    </div>
                </div>

                <div class="preview-details">
                    <div v-if="note.experiment && note.fact" class="detail-item">
                        <span class="detail-label">发生了什么</span>
                        <div class="detail-content">{{ note.fact }}</div>
                    </div>
                    <div v-if="note.reaction" class="detail-item">
                        <span class="detail-label">第一反应</span>
                        <div class="detail-content">{{ note.reaction }}</div>
                    </div>
                    <div v-if="note.pattern" class="detail-item">
                         <span class="detail-label">潜在模式</span>
                        <div class="detail-content">{{ note.pattern }}</div>
                    </div>
                </div>

                <div class="preview-tags-row">
                    <span v-for="tag in note.tags" :key="tag" class="tag-badge">#{{ tag }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
