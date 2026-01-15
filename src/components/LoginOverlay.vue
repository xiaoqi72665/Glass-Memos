<script setup>
import { useAuth } from '../composables/useAuth'
import { useNotes } from '../composables/useNotes'
import { ref } from 'vue'

const { isAuthenticated, login, errorMsg, isLoading, API_URL } = useAuth()
const { syncDataFromCloud, loadNotesLocal } = useNotes()

const password = ref('')

async function handleLogin() {
  if (!password.value) return
  const success = await login(password.value)
  if (success) {
      if (API_URL) {
          await syncDataFromCloud()
      } else {
          loadNotesLocal()
      }
  }
}
</script>

<template>
  <div v-if="!isAuthenticated" class="login-overlay">
    <div class="login-card glass-modal">
        <div class="login-icon-box">
            <img src="/Logo.svg" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;">
        </div>
        <h2 class="login-title">映照</h2>
        <p class="login-subtitle">记录不是为了证明什么，只是为了看清。</p>

        <div class="login-form">
            <input 
                type="password" 
                v-model="password" 
                class="input-field login-input" 
                placeholder="Password"
                @keydown.enter="handleLogin"
            >
            <button 
                class="primary-btn login-btn" 
                :class="{ loading: isLoading }"
                @click="handleLogin"
            >
                {{ isLoading ? '验证中...' : '解锁进入' }}
            </button>
        </div>
        <p class="login-msg">{{ errorMsg }}</p>
    </div>
  </div>
</template>
