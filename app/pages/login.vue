<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="logo-icon">
          <BookOpen :size="20" />
        </div>
        <span class="logo-text">StudyDesk</span>
      </div>

      <div class="auth-tabs">
        <button :class="['auth-tab', { active: mode === 'login' }]" @click="mode = 'login'">Sign In</button>
        <button :class="['auth-tab', { active: mode === 'signup' }]" @click="mode = 'signup'">Create Account</button>
      </div>

      <form @submit.prevent="submit" class="auth-form">
        <div v-if="mode === 'signup'" class="form-group">
          <label>Full Name</label>
          <input v-model="name" type="text" placeholder="Samuel Bereket" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="you@email.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" required minlength="6" />
        </div>

        <div v-if="error" class="auth-error">{{ error }}</div>
        <div v-if="success" class="auth-success">{{ success }}</div>

        <button type="submit" class="btn btn-primary auth-btn" :disabled="loading">
          {{ loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const mode = ref<'login' | 'signup'>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  success.value = ''

  if (mode.value === 'signup') {
    const { error: err } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: { data: { full_name: name.value } }
    })
    if (err) { error.value = err.message }
    else { success.value = 'Account created! Check your email to confirm, then sign in.' }
  } else {
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (err) { error.value = err.message }
    else { router.push('/') }
  }

  loading.value = false
}
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  background: var(--off-white);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  justify-content: center;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--green-700);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.auth-tabs {
  display: flex;
  background: var(--gray-100);
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 24px;
}

.auth-tab {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.auth-tab.active {
  background: var(--white);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-btn {
  width: 100%;
  justify-content: center;
  padding: 11px;
  font-size: 15px;
  margin-top: 4px;
}

.auth-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.auth-success {
  background: var(--green-50);
  color: var(--green-700);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}
</style>
