<script setup>
import { onMounted, ref } from 'vue'
import { useTheme } from './composables/useTheme'
import { useAuth } from './composables/useAuth'
import { useNotes } from './composables/useNotes'

import LoginOverlay from './components/LoginOverlay.vue'
import NavBar from './components/NavBar.vue'
import ToolBar from './components/ToolBar.vue'
import MemoList from './components/MemoList.vue'
import DockBar from './components/DockBar.vue'
import PreviewModal from './components/PreviewModal.vue'
import EditModal from './components/EditModal.vue'

const { initTheme } = useTheme()
const { checkAuth } = useAuth()
const { syncDataFromCloud } = useNotes()

const editModalRef = ref(null)
const previewModalRef = ref(null)
const isMobile = ref(window.innerWidth < 820)

onMounted(async () => {
    initTheme()
    const isAuth = await checkAuth()
    if (isAuth) {
        await syncDataFromCloud()
    }
    
    window.addEventListener('resize', () => {
        isMobile.value = window.innerWidth < 820
    })
    
    // Global shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault()
            // In a real Vue app, this save logic should be inside the active modal
            // But for now, we rely on the modal's own button or internal handling if we added keyboard listeners there.
            // The original script.js had a global listener. 
            // We can leave it to the user to click save, or add logic in EditModal onMounted.
        }
    })
})

function openEditor(id = null) {
    if (editModalRef.value) {
        editModalRef.value.open(id)
    }
}

function openPreview(id) {
    if (previewModalRef.value) {
        previewModalRef.value.open(id)
    }
}
</script>

<template>
  <LoginOverlay />
  
  <NavBar @open-edit="openEditor()" />
  
  <ToolBar />

  <MemoList @preview="openPreview" />

  <DockBar @open-edit="openEditor()" />

  <PreviewModal ref="previewModalRef" @edit="openEditor" />
  <EditModal ref="editModalRef" />
</template>
