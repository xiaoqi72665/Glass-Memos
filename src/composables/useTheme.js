import { ref } from 'vue'

const THEME_KEY = 'glass_memos_theme'
const isDark = ref(false)

export function useTheme() {
    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY)

        if (savedTheme === 'dark') {
            setDark(true)
        } else {
            setDark(false)
        }
    }

    function setDark(val) {
        isDark.value = val
        if (val) {
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.removeAttribute('data-theme')
        }
    }

    function toggleTheme() {
        const newState = !isDark.value
        setDark(newState)
        localStorage.setItem(THEME_KEY, newState ? 'dark' : 'light')
    }

    return {
        isDark,
        initTheme,
        toggleTheme
    }
}
