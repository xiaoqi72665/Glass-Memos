import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

const STORE_KEY = 'glass_memos_v2'
const notes = ref([])
const searchQuery = ref('')
const currentFilter = ref(null)

const filteredNotes = computed(() => {
    return notes.value.filter(n => {
        const matchTag = currentFilter.value ? n.tags.includes(currentFilter.value) : true
        const q = searchQuery.value.toLowerCase()
        const titleStr = n.summary || n.title || ''
        const contentStr = n.content || ''
        return matchTag && (!q || titleStr.toLowerCase().includes(q) || contentStr.toLowerCase().includes(q))
    }).sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id))
})

const allTags = computed(() => {
    const tags = new Set()
    notes.value.forEach(n => n.tags.forEach(t => tags.add(t)))
    return Array.from(tags)
})


export function useNotes() {
    const { API_URL, TOKEN_KEY } = useAuth()

    function loadNotesLocal() {
        const raw = localStorage.getItem(STORE_KEY)
        notes.value = raw ? JSON.parse(raw) : []
    }

    async function syncDataFromCloud() {
        const token = localStorage.getItem(TOKEN_KEY)
        try {
            const res = await fetch(`${API_URL}/api/data`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const cloudData = await res.json()
                if (Array.isArray(cloudData)) {
                    notes.value = cloudData
                    localStorage.setItem(STORE_KEY, JSON.stringify(notes.value))
                    console.log("☁️ 云端数据同步成功")
                } else {
                    loadNotesLocal()
                }
            } else {
                loadNotesLocal()
            }
        } catch (e) {
            console.error("同步失败，加载本地数据", e)
            loadNotesLocal()
        }
    }

    async function pushDataToCloud() {
        if (!API_URL) return
        const token = localStorage.getItem(TOKEN_KEY)
        try {
            await fetch(`${API_URL}/api/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(notes.value)
            })
            console.log("☁️ 数据已保存到云端")
        } catch (e) {
            console.error("保存到云端失败", e)
        }
    }

    function saveStorage() {
        localStorage.setItem(STORE_KEY, JSON.stringify(notes.value))
        pushDataToCloud()
    }

    function addOrUpdateNote(noteData) {
        const id = noteData.id
        const idx = notes.value.findIndex(n => n.id === id)

        if (idx > -1) {
            notes.value[idx] = noteData
        } else {
            notes.value.push(noteData)
        }
        saveStorage()
    }

    function deleteNote(id) {
        notes.value = notes.value.filter(n => n.id !== id)
        saveStorage()
    }

    function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString)
            if (Array.isArray(data)) {
                const map = new Map(notes.value.map(n => [n.id, n]))
                data.forEach(n => map.set(n.id, n))
                notes.value = Array.from(map.values())
                saveStorage()
                return true
            }
            return false
        } catch (e) {
            return false
        }
    }

    return {
        notes,
        filteredNotes,
        searchQuery,
        currentFilter,
        allTags,
        loadNotesLocal,
        syncDataFromCloud,
        saveStorage,
        addOrUpdateNote,
        deleteNote,
        importData
    }
}
