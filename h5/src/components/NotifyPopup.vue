<template>
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="visible" class="popup" @click.self="$emit('close')">
        <!-- 背景粒子 -->
        <div class="popup__particles">
          <span v-for="i in 12" :key="i" class="popup__particle" :style="particleStyle(i)"></span>
        </div>

        <!-- 卡片 -->
        <div class="popup__card" :class="{ 'popup__card--levelup': !!levelUp }">
          <!-- 升级发光边框 -->
          <div v-if="levelUp" class="popup__glow-ring"></div>

          <!-- 图标区域 -->
          <div class="popup__icon-wrap" :class="{ 'popup__icon-wrap--levelup': !!levelUp }">
            <Gem v-if="!levelUp" :size="36" :stroke-width="1.5" class="popup__icon" />
            <Crown v-else :size="40" :stroke-width="1.5" class="popup__icon popup__icon--crown" />
          </div>

          <!-- 积分奖励 -->
          <template v-if="pointsEarned > 0">
            <p class="popup__label">获得积分</p>
            <div class="popup__points">
              <span class="popup__points-num">+{{ displayPoints }}</span>
            </div>
          </template>

          <!-- 等级升级 -->
          <template v-if="levelUp">
            <div class="popup__level-sep"></div>
            <p class="popup__label">会员升级</p>
            <div class="popup__level-change">
              <span class="popup__level-old">{{ getLevelName(levelUp.oldLevel) }}</span>
              <ArrowRight :size="18" :stroke-width="2.5" class="popup__level-arrow" />
              <span class="popup__level-new">{{ levelUp.newLevelName }}</span>
            </div>
          </template>

          <!-- 确认按钮 -->
          <button class="popup__btn" @click="$emit('close')">
            {{ levelUp ? '太棒了！' : '知道了' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Gem, Crown, ArrowRight } from 'lucide-vue-next';

const props = defineProps({
  visible: { type: Boolean, default: false },
  pointsEarned: { type: Number, default: 0 },
  levelUp: { type: Object, default: null },
});

defineEmits(['close']);

const displayPoints = ref(0);
let countTimer = 0;

// 数字滚动动画
watch(() => props.visible, (val) => {
  if (val && props.pointsEarned > 0) {
    displayPoints.value = 0;
    const duration = 800;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = props.pointsEarned / steps;
    let current = 0;

    clearInterval(countTimer);
    countTimer = setInterval(() => {
      current += increment;
      if (current >= props.pointsEarned) {
        displayPoints.value = props.pointsEarned;
        clearInterval(countTimer);
      } else {
        displayPoints.value = Math.round(current);
      }
    }, stepTime);
  }
});

// 等级名称映射
const levelNames = { 1: '铜牌会员', 2: '银牌会员', 3: '金牌会员', 4: '铂金会员', 5: '钻石会员' };
function getLevelName(lv) { return levelNames[lv] || `${lv}级会员`; }

// 粒子位置随机分布
function particleStyle(i) {
  const angle = (i / 12) * 360;
  const radius = 100 + Math.random() * 80;
  const x = 50 + Math.cos((angle * Math.PI) / 180) * (radius / 100) * 50;
  const y = 50 + Math.sin((angle * Math.PI) / 180) * (radius / 100) * 50;
  const delay = Math.random() * .6;
  const size = 2 + Math.random() * 3;
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
  };
}
</script>

<style scoped>
/* ═══ 遮罩 ═══ */
.popup {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, .6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ═══ 粒子背景 ═══ */
.popup__particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.popup__particle {
  position: absolute;
  border-radius: 50%;
  background: var(--neon-cyan);
  box-shadow: 0 0 6px var(--neon-cyan);
  animation: particleFloat 2s ease-in-out infinite;
  opacity: 0;
}

/* ═══ 卡片 ═══ */
.popup__card {
  position: relative;
  z-index: 1;
  width: 280px;
  padding: var(--space-xl) var(--space-lg);
  background: linear-gradient(160deg, rgba(15, 20, 40, .98), rgba(10, 14, 38, .98));
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: 0 8px 40px rgba(0, 0, 0, .4), var(--shadow-glow-cyan);
}

/* 升级时额外边框辉光 */
.popup__card--levelup {
  border-color: rgba(168, 85, 247, .3);
  box-shadow: 0 8px 40px rgba(0, 0, 0, .4),
              0 0 30px rgba(168, 85, 247, .15),
              0 0 60px rgba(0, 212, 255, .08);
}
.popup__glow-ring {
  position: absolute;
  inset: -2px;
  border-radius: calc(var(--radius-lg) + 2px);
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple), var(--neon-pink), var(--neon-cyan));
  background-size: 300% 300%;
  animation: glowRotate 3s linear infinite;
  z-index: -1;
  opacity: .6;
}

/* ═══ 图标 ═══ */
.popup__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin-bottom: var(--space-md);
  background: rgba(0, 212, 255, .08);
  border: 2px solid rgba(0, 212, 255, .15);
}
.popup__icon-wrap--levelup {
  background: rgba(168, 85, 247, .1);
  border-color: rgba(168, 85, 247, .25);
  animation: iconPulse 2s ease-in-out infinite;
}
.popup__icon {
  color: var(--neon-cyan);
}
.popup__icon--crown {
  color: var(--neon-gold);
  filter: drop-shadow(0 0 8px rgba(245, 158, 11, .4));
}

/* ═══ 积分数字 ═══ */
.popup__label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: var(--space-xs);
}
.popup__points-num {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(180deg, var(--neon-cyan) 0%, #66e3ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 12px rgba(0, 212, 255, .4));
}

/* ═══ 等级升级 ═══ */
.popup__level-sep {
  width: 40px;
  height: 1px;
  margin: var(--space-md) auto;
  background: linear-gradient(90deg, transparent, var(--border-subtle), transparent);
}
.popup__level-change {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}
.popup__level-old {
  font-size: 14px;
  color: var(--text-muted);
}
.popup__level-arrow {
  color: var(--neon-purple);
}
.popup__level-new {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 6px rgba(168, 85, 247, .3));
}

/* ═══ 按钮 ═══ */
.popup__btn {
  display: block;
  width: 100%;
  margin-top: var(--space-lg);
  padding: 12px;
  border: 0;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.popup__btn:active { transform: scale(.97); }

/* ═══ 过渡动画 ═══ */
.popup-enter-active { transition: opacity .3s var(--ease-out); }
.popup-leave-active { transition: opacity .25s ease-in; }
.popup-enter-from,
.popup-leave-to { opacity: 0; }

.popup-enter-active .popup__card {
  animation: cardIn .4s var(--ease-spring);
}
.popup-leave-active .popup__card {
  animation: cardOut .2s ease-in forwards;
}

/* ═══ Keyframes ═══ */
@keyframes cardIn {
  from {
    opacity: 0;
    transform: scale(.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
@keyframes cardOut {
  to {
    opacity: 0;
    transform: scale(.9) translateY(10px);
  }
}
@keyframes particleFloat {
  0%, 100% { opacity: 0; transform: translateY(0) scale(0); }
  30% { opacity: .8; transform: translateY(-12px) scale(1); }
  70% { opacity: .4; transform: translateY(-24px) scale(.6); }
}
@keyframes glowRotate {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes iconPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, .2); }
  50% { box-shadow: 0 0 0 12px rgba(168, 85, 247, 0); }
}
</style>
