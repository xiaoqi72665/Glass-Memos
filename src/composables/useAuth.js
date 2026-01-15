import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'growth_memos_token'

// Global state
const isAuthenticated = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')

export function useAuth() {

    async function checkAuth() {
        const token = localStorage.getItem(TOKEN_KEY)
        if (!token) return false

        if (API_URL) {
            try {
                const res = await fetch(`${API_URL}/auth/verify`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (!data.ok) {
                    localStorage.removeItem(TOKEN_KEY)
                    isAuthenticated.value = false
                    return false
                }
                isAuthenticated.value = true
                return true
            } catch (e) {
                // If offline but token exists, maybe allow? 
                // Original logic: catch -> return false.
                isAuthenticated.value = false
                return false
            }
        }
        isAuthenticated.value = true
        return true // Demo mode logic
    }

    async function login(password) {
        if (!password) return

        isLoading.value = true
        errorMsg.value = ''

        if (API_URL) {
            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                })
                const data = await res.json()
                if (data.ok && data.token) {
                    localStorage.setItem(TOKEN_KEY, data.token)
                    isAuthenticated.value = true
                    return true
                } else {
                    errorMsg.value = '密码错误'
                    return false
                }
            } catch (e) {
                errorMsg.value = '网络错误'
                return false
            } finally {
                isLoading.value = false
            }
        } else {
            // Demo mode
            return new Promise(resolve => {
                setTimeout(() => {
                    localStorage.setItem(TOKEN_KEY, "demo")
                    isAuthenticated.value = true
                    isLoading.value = false
                    resolve(true)
                }, 500)
            })
        }
    }

    function logout() {
        if (confirm('确定要锁定并退出吗？')) {
            localStorage.removeItem(TOKEN_KEY)
            isAuthenticated.value = false
            window.location.reload()
        }
    }

    return {
        isAuthenticated,
        isLoading,
        errorMsg,
        API_URL,
        TOKEN_KEY,
        checkAuth,
        login,
        logout
    }
}
