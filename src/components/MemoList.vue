<script setup>
import { useNotes } from '../composables/useNotes'
import { computed } from 'vue'

const { filteredNotes } = useNotes()

const emit = defineEmits(['preview'])

function formatDate(d) {
    if (!d) return ''
    const today = new Date().toISOString().split('T')[0]
    return d === today ? '今天' : d
}

function getPreviewText(note) {
    if (note.experiment) return `🎯 实验：${note.experiment}`
    if (note.fact) return note.fact
    return note.content || ''
}

function getWeatherIcon(w) {
    if (!w) return ''
    return w.split(' ')[0]
}

function getMoodIcon(m) {
    if (!m) return ''
    return m.split(' ')[0]
}
</script>

<template>
    <main id="app-container">
        <div id="memoList" class="grid-layout" v-if="filteredNotes.length > 0">
            <div 
                v-for="note in filteredNotes" 
                :key="note.id" 
                class="glass memo-card" 
                @click="emit('preview', note.id)"
            >
                <div class="card-date">
                    <span style="margin-right:6px;" v-if="note.weather">{{ getWeatherIcon(note.weather) }}</span>
                    <span style="margin-right:6px;" v-if="note.mood">{{ getMoodIcon(note.mood) }}</span>
                    {{ formatDate(note.date) }}
                </div>
                <h3 class="card-title">{{ note.summary || note.title || '无标题' }}</h3>
                <div class="card-preview">{{ getPreviewText(note) }}</div>
                <div class="card-tags">
                    <span v-for="tag in note.tags" :key="tag" class="tag-badge">#{{ tag }}</span>
                </div>
            </div>
        </div>
        
        <div id="emptyState" class="empty-state" v-else>
            <p>👋 欢迎回来<br>开始今天的自我观察吧</p>
        </div>
    </main>
</template>
