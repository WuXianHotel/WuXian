<template>
  <span class="ani-num" :class="{ 'ani-num--animating': isAnimating }">
    <span v-if="prefix" class="ani-num__prefix">{{ prefix }}</span>
    <span class="ani-num__value">{{ display }}</span>
    <span v-if="suffix" class="ani-num__suffix">{{ suffix }}</span>
  </span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  value: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 600 },
  animateOnMount: { type: Boolean, default: true },
});

const display = ref(formatValue(0));
const isAnimating = ref(false);
let animFrame = 0;

function formatValue(v) {
  return props.decimals > 0 ? v.toFixed(props.decimals) : String(Math.round(v));
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function animate(from, to) {
  cancelAnimationFrame(animFrame);
  isAnimating.value = true;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / props.duration, 1);
    const eased = easeOutQuart(progress);
    const current = from + (to - from) * eased;
    display.value = formatValue(current);

    if (progress < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      display.value = formatValue(to);
      isAnimating.value = false;
    }
  }

  animFrame = requestAnimationFrame(step);
}

watch(() => props.value, (val, old) => {
  if (val !== undefined && val !== null) {
    const from = old !== undefined && old !== null ? old : 0;
    animate(from, val);
  }
});

onMounted(() => {
  if (props.animateOnMount && props.value) {
    display.value = formatValue(0);
    animate(0, props.value);
  } else {
    display.value = formatValue(props.value || 0);
  }
});
</script>

<style scoped>
.ani-num {
  display: inline-flex;
  align-items: baseline;
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
}
.ani-num__prefix,
.ani-num__suffix {
  font-family: var(--font-body);
}
.ani-num--animating .ani-num__value {
  text-shadow: 0 0 8px rgba(0, 212, 255, .3);
}
</style>
