<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="logo-icon" style="margin: 0 auto 16px;">
        <BookOpen :size="20" />
      </div>
      <p style="text-align:center; font-size:14px; color:var(--text-muted);">Confirming your account...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next'
definePageMeta({ layout: false })
const router = useRouter()
onMounted(() => setTimeout(() => router.push('/'), 1500))
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  background: var(--off-white);
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 32px;
  text-align: center;
}
.logo-icon {
  width: 44px;
  height: 44px;
  background: var(--green-700);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
</style>
