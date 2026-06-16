<template>
  <div class="profile">
    <div class="profile__card">
      <div class="profile__card-glow"></div>
      <h2 class="profile__name">{{ user.nickname || '用户' }}</h2>
      <p class="profile__member" v-if="user.member_no">{{ user.level_name||'会员' }} · <AnimatedNumber :value="user.points || 0" suffix="积分" /></p>
      <div class="profile__stats">
        <div class="profile__stat"><AnimatedNumber :value="user.total_nights || 0" font-size="24px" color="var(--neon-cyan)" /><span>间夜</span></div>
        <div class="profile__stat"><AnimatedNumber :value="user.points || 0" font-size="24px" color="var(--neon-cyan)" /><span>积分</span></div>
        <div class="profile__stat"><strong>{{ fmtDiscount(user.discount) }}</strong><span>折扣</span></div>
      </div>
    </div>

    <div class="profile__menu">
      <div v-for="item in menuItems" :key="item.path" class="profile__menu-item" @click="go(item.path)">
        <span>{{ item.label }}</span>
        <span class="profile__menu-arrow">→</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AnimatedNumber from '../components/AnimatedNumber.vue';
import api from '../utils/api.js';

const router = useRouter();
const user = ref({});
const menuItems = [
  { path: '/member', label: '会员中心' },
  { path: '/wallet', label: '我的钱包' },
  { path: '/mall', label: '积分商城' },
  { path: '/profile/edit', label: '编辑资料' },
];

// DB 存的是倍率（1.00=原价/0.95=九五折），*10 转换为 折
function fmtDiscount(val) {
  const d = (Number(val) || 1) * 10;
  return d % 1 === 0 ? Math.round(d) + '折' : d.toFixed(1) + '折';
}

onMounted(async () => { try { const r = await api.getProfile(); user.value = r.data || {}; } catch {} });
function go(p) { router.push(p); }
</script>

<style scoped>
.profile { padding: var(--space-md); }

/* ═══ 用户卡片 ═══ */
.profile__card {
  position: relative; overflow: hidden;
  padding: var(--space-xl) var(--space-lg);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(0,212,255,.08), rgba(168,85,247,.08));
  border: 1px solid var(--border-subtle);
  text-align: center;
  margin-bottom: var(--space-md);
}
.profile__card-glow {
  position: absolute;
  top: -30%; left: -30%;
  width: 160%; height: 160%;
  background: radial-gradient(circle at 50% 50%, rgba(0,212,255,.06), transparent 60%);
  pointer-events: none;
}

/* ═══ 赛博朋克用户名 ═══ */
.profile__name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: var(--space-xs);
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, var(--neon-cyan) 0%, #66e3ff 40%, var(--neon-purple) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 8px rgba(0, 212, 255, .3))
          drop-shadow(0 0 16px rgba(168, 85, 247, .2));
}

.profile__member {
  font-size: 13px;
  color: var(--neon-cyan);
  margin-bottom: var(--space-lg);
  position: relative;
  z-index: 1;
  opacity: .8;
}

.profile__stats {
  display: flex;
  justify-content: center;
  gap: var(--space-xl);
  position: relative;
  z-index: 1;
}
.profile__stat { display: flex; flex-direction: column; }
.profile__stat strong {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--neon-cyan);
  text-shadow: 0 0 10px rgba(0, 212, 255, .25);
}
.profile__stat span { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

/* ═══ 菜单 ═══ */
.profile__menu {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.profile__menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  font-size: 15px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--dur-fast);
}
.profile__menu-item:last-child { border-bottom: 0; }
.profile__menu-item:hover { background: rgba(0,212,255,.04); }
.profile__menu-arrow { font-size: 16px; color: var(--text-muted); }
</style>
