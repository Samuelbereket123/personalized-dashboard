<template>
  <div v-if="modelValue" class="pin-overlay" @click.self="$emit('update:modelValue', false)">
    <div class="pin-box">
      <div class="pin-icon">
        <Lock :size="20" />
      </div>
      <div class="pin-title">{{ isSet ? 'Enter PIN' : 'Set a PIN' }}</div>
      <div class="pin-sub">{{ isSet ? 'This entry is locked' : 'Choose a 4–6 digit PIN to lock this entry' }}</div>

      <div class="pin-inputs">
        <input
          ref="pinRef"
          v-model="pin"
          type="password"
          inputmode="numeric"
          maxlength="6"
          placeholder="••••"
          class="pin-input"
          @keyup.enter="submit"
        />
        <div v-if="error" class="pin-error">{{ error }}</div>
      </div>

      <div class="pin-actions">
        <button class="btn btn-ghost" @click="$emit('update:modelValue', false)">Cancel</button>
        <button class="btn btn-primary" @click="submit">{{ isSet ? 'Unlock' : 'Set PIN' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Lock } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean; isSet: boolean; correctPin?: string }>()
const emit = defineEmits(['update:modelValue', 'unlocked', 'pinSet'])

const pin = ref('')
const error = ref('')
const pinRef = ref<HTMLInputElement | null>(null)

watch(() => props.modelValue, (v) => {
  if (v) {
    pin.value = ''
    error.value = ''
    nextTick(() => pinRef.value?.focus())
  }
})

function submit() {
  if (pin.value.length < 4) {
    error.value = 'PIN must be at least 4 digits'
    return
  }
  if (props.isSet) {
    if (pin.value === props.correctPin) {
      emit('unlocked')
      emit('update:modelValue', false)
    } else {
      error.value = 'Wrong PIN'
      pin.value = ''
    }
  } else {
    emit('pinSet', pin.value)
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
.pin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.pin-box {
  background: var(--white);
  border-radius: 16px;
  padding: 28px 24px 20px;
  width: 100%;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.pin-icon {
  width: 48px;
  height: 48px;
  background: var(--green-100);
  color: var(--green-700);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}

.pin-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.pin-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.pin-inputs {
  margin-bottom: 20px;
}

.pin-input {
  text-align: center;
  font-size: 22px !important;
  letter-spacing: 6px;
  width: 100% !important;
  padding: 12px !important;
}

.pin-error {
  font-size: 12px;
  color: #dc2626;
  margin-top: 6px;
}

.pin-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
