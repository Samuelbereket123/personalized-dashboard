<template>
  <div v-if="modelValue" class="confirm-overlay" @click.self="$emit('update:modelValue', false)">
    <div class="confirm-box">
      <div class="confirm-icon">
        <Trash2 :size="22" />
      </div>
      <div class="confirm-title">{{ title }}</div>
      <div class="confirm-msg">{{ message }}</div>
      <div class="confirm-actions">
        <button class="btn btn-ghost" @click="$emit('update:modelValue', false)">Cancel</button>
        <button class="btn btn-danger-solid" @click="confirm">Yes, clear it</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

defineProps<{ modelValue: boolean; title: string; message: string }>()
const emit = defineEmits(['update:modelValue', 'confirm'])

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.confirm-box {
  background: white;
  border-radius: 14px;
  padding: 28px 24px 20px;
  width: 100%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.18);
}

.confirm-icon {
  width: 48px;
  height: 48px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}

.confirm-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
}

.confirm-msg {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 20px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-danger-solid {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  background: #dc2626;
  color: white;
  transition: background 0.15s;
}

.btn-danger-solid:hover {
  background: #b91c1c;
}
</style>
