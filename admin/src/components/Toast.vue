<template>
  <div class="toast-container">
    <div
      v-for="t in toasts" :key="t.id"
      :class="['toast', `toast-${t.type}`]"
    >{{ t.msg }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])

function show(msg, type = 'info', duration = 3000) {
  const id = Date.now()
  toasts.value.push({ id, msg, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, duration)
}

defineExpose({ show })
</script>
