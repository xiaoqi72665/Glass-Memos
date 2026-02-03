<script setup>
import { useNotes } from '../composables/useNotes'
import { computed } from 'vue'

const { notes, filteredNotes, currentFilter, allTags, searchQuery } = useNotes()

const emit = defineEmits(['preview'])

function toLocalDateString(dateObj) {
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function normalizeDate(raw) {
    if (!raw) return null
    if (typeof raw === 'string') {
        const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
        if (match) {
            const y = match[1]
            const m = match[2].padStart(2, '0')
            const d = match[3].padStart(2, '0')
            return `${y}-${m}-${d}`
        }
    }
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) {
        return toLocalDateString(parsed)
    }
    return null
}

function dateStrToDayNumber(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

function dayNumberToDateStr(dayNum) {
    const date = new Date(dayNum * 86400000)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const todayStr = toLocalDateString(new Date())

const dateCountMap = computed(() => {
    const map = new Map()
    notes.value.forEach(n => {
        const normalized = normalizeDate(n.date)
        if (!normalized) return
        map.set(normalized, (map.get(normalized) || 0) + 1)
    })
    return map
})

const stats = computed(() => {
    const total = notes.value.length
    const today = dateCountMap.value.get(todayStr) || 0

    const todayDayNum = dateStrToDayNumber(todayStr)
    const monthKey = todayStr.slice(0, 7)

    let weekCount = 0
    let monthCount = 0
    let totalLength = 0

    notes.value.forEach(n => {
        const normalized = normalizeDate(n.date)
        if (!normalized) return
        const dayNum = dateStrToDayNumber(normalized)
        if (dayNum >= todayDayNum - 6) weekCount += 1
        if (normalized.startsWith(monthKey)) monthCount += 1

        const baseText = n.content || [n.summary, n.fact, n.reaction, n.pattern, n.experiment].filter(Boolean).join(' ')
        totalLength += baseText.length
    })

    const avgLength = total ? Math.round(totalLength / total) : 0

    return {
        total,
        today,
        week: weekCount,
        month: monthCount,
        tags: allTags.value.length,
        filtered: filteredNotes.value.length,
        avgLength
    }
})

const tagStats = computed(() => {
    const map = new Map()
    notes.value.forEach(n => {
        const tags = n.tags || []
        tags.forEach(tag => {
            map.set(tag, (map.get(tag) || 0) + 1)
        })
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
})

const streaks = computed(() => {
    const dates = Array.from(dateCountMap.value.keys()).sort()
    if (!dates.length) return { current: 0, best: 0, lastDate: '' }

    let best = 0
    let run = 0
    let prev = null

    dates.forEach(dateStr => {
        const dayNum = dateStrToDayNumber(dateStr)
        if (prev !== null && dayNum === prev + 1) {
            run += 1
        } else {
            run = 1
        }
        best = Math.max(best, run)
        prev = dayNum
    })

    const lastDate = dates[dates.length - 1]
    let current = 0
    let cursor = dateStrToDayNumber(lastDate)
    while (dateCountMap.value.get(dayNumberToDateStr(cursor))) {
        current += 1
        cursor -= 1
    }

    return { current, best, lastDate }
})

const weekSeries = computed(() => {
    const days = []
    const counts = []
    const todayDayNum = dateStrToDayNumber(todayStr)
    for (let i = 6; i >= 0; i -= 1) {
        const dayNum = todayDayNum - i
        const key = dayNumberToDateStr(dayNum)
        const count = dateCountMap.value.get(key) || 0
        const dateObj = new Date(dayNum * 86400000)
        days.push({
            key,
            count,
            label: `${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()}`
        })
        counts.push(count)
    }
    const max = Math.max(1, ...counts)
    return days.map(item => ({
        ...item,
        ratio: item.count / max
    }))
})

function formatDate(d) {
    const normalized = normalizeDate(d)
    if (!normalized) return ''
    return normalized === todayStr ? '今天' : normalized
}

function getPreviewText(note) {
    if (note.experiment) return `🌿 实验：${note.experiment}`
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
        <div class="layout-grid">
            <aside class="side-panel glass-panel">
                <div class="side-section">
                    <div class="section-title">数据记录</div>
                    <div class="stat-grid">
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.total }}</div>
                            <div class="stat-label">累计</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.today }}</div>
                            <div class="stat-label">今日</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.week }}</div>
                            <div class="stat-label">本周</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{{ stats.month }}</div>
                            <div class="stat-label">本月</div>
                        </div>
                    </div>
                    <div class="stat-inline">
                        <span>标签</span>
                        <strong>{{ stats.tags }}</strong>
                    </div>
                    <div class="stat-inline">
                        <span>连续记录</span>
                        <strong>{{ streaks.current }} 天</strong>
                    </div>
                    <div class="stat-inline">
                        <span>最长连续</span>
                        <strong>{{ streaks.best }} 天</strong>
                    </div>
                    <div class="stat-inline">
                        <span>最近记录</span>
                        <strong>{{ streaks.lastDate || '-' }}</strong>
                    </div>
                    <div class="stat-inline">
                        <span>平均字数</span>
                        <strong>{{ stats.avgLength }}</strong>
                    </div>
                    <div v-if="searchQuery || currentFilter !== null" class="stat-inline">
                        <span>当前结果</span>
                        <strong>{{ stats.filtered }}</strong>
                    </div>
                </div>

                <div class="side-section">
                    <div class="section-title">本周节奏</div>
                    <div class="week-activity">
                        <div
                            v-for="day in weekSeries"
                            :key="day.key"
                            class="week-bar"
                            :style="{ '--ratio': day.ratio }"
                            :data-empty="day.count === 0"
                            :title="`${day.label} ${day.count}`"
                        ></div>
                    </div>
                </div>

                <div class="side-section">
                    <div class="section-title">标签</div>
                    <div class="tag-list">
                        <button
                            class="tag-item"
                            :class="{ active: currentFilter === null }"
                            @click="currentFilter = null"
                        >
                            <span>全部</span>
                            <em>{{ stats.total }}</em>
                        </button>
                        <button
                            v-for="[tag, count] in tagStats"
                            :key="tag"
                            class="tag-item"
                            :class="{ active: currentFilter === tag }"
                            @click="currentFilter = tag"
                        >
                            <span>#{{ tag }}</span>
                            <em>{{ count }}</em>
                        </button>
                    </div>
                </div>
            </aside>

            <section class="content-panel">
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
                    <p>🙌 欢迎回来<br>开始今天的自我观察吧</p>
                </div>
            </section>
        </div>
    </main>
</template>
