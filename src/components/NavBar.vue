<script setup>
import { useTheme } from '../composables/useTheme'
import { useAuth } from '../composables/useAuth'
import { useNotes } from '../composables/useNotes'
import { ref } from 'vue'

const { isDark, toggleTheme } = useTheme()
const { logout } = useAuth()
const { notes, importData, searchQuery } = useNotes()

function handleExport() {
    const blob = new Blob([JSON.stringify(notes.value, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `growth_memos_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
}

function triggerImport() {
    document.getElementById('importFileNav').click()
}

function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
        if (confirm('导入将合并数据并同步到云端。继续吗？')) {
            if (importData(evt.target.result)) {
                alert('导入成功')
            } else {
                alert('文件格式错误')
            }
        }
        e.target.value = ''
    }
    reader.readAsText(file)
}

const emit = defineEmits(['open-edit'])
</script>

<template>
    <header class="navbar glass-bar">
        <div class="navbar-content">
            <!-- Left: Title -->
            <div class="navbar-left">
                 <h1 class="app-title">映照</h1>
            </div>

            <!-- Middle: Search -->
            <div class="navbar-search">
                 <div class="search-wrapper-nav">
                    <svg class="search-icon-nav" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input type="text" v-model="searchQuery" class="search-input-nav" placeholder="搜索...">
                </div>
            </div>

            <!-- Right: Actions -->
            <div class="navbar-actions">
                <button class="icon-btn secondary-icon" @click="logout" title="锁定/退出" style="margin-right: 4px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </button>

                <button class="icon-btn secondary-icon" @click="toggleTheme" title="切换主题" style="margin-right: 8px;">
                    <svg v-if="!isDark" class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <svg v-else class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                </button>

                <input type="file" id="importFileNav" hidden accept=".json" @change="handleImport">

                <div class="action-group">
                    <button class="icon-btn secondary-icon" @click="triggerImport" title="导入">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>
                    <button class="icon-btn secondary-icon" @click="handleExport" title="导出">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </button>
                </div>

                <button class="primary-btn circle-btn" @click="emit('open-edit')" aria-label="新建">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                        stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
        </div>
    </header>
</template>
