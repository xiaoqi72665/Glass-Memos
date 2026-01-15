<script setup>
import { useNotes } from '../composables/useNotes'
import { ref } from 'vue'

const { currentFilter, allTags } = useNotes()
const tagsRow = ref(null)

let isDown = false
let startX
let scrollLeft

function startDrag(e) {
    isDown = true
    tagsRow.value.classList.add('active')
    startX = e.pageX - tagsRow.value.offsetLeft
    scrollLeft = tagsRow.value.scrollLeft
}

function stopDrag() {
    isDown = false
    tagsRow.value.classList.remove('active')
}

function doDrag(e) {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - tagsRow.value.offsetLeft
    const walk = (x - startX) * 2 // scroll-fast
    tagsRow.value.scrollLeft = scrollLeft - walk
}
</script>

<template>
    <div id="toolbar-container" class="toolbar-area glass-bar">
        <div class="toolbar-content">
            <div 
                class="tags-row" 
                id="tagsBar" 
                ref="tagsRow"
                @mousedown="startDrag"
                @mouseleave="stopDrag"
                @mouseup="stopDrag"
                @mousemove="doDrag"
            >
                 <button 
                    class="tag-btn" 
                    :class="{ active: currentFilter === null }"
                    @click="currentFilter = null"
                 >全部</button>
                 <button 
                    v-for="tag in allTags" 
                    :key="tag"
                    class="tag-btn" 
                    :class="{ active: currentFilter === tag }"
                    @click="currentFilter = tag"
                 >#{{ tag }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tags-row {
    cursor: grab;
    user-select: none;
}
.tags-row.active {
    cursor: grabbing;
}
</style>
