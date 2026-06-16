<template>
  <div class="profile">
    <div class="profile__card">
      <div class="profile__card-glow"></div>
      <h2 class="profile__name">{{ user.nickname || '用户' }}</h2>
      <p class="profile__member" v-if="user.member_no">{{ user.level_name||'会员' }} · {{ user.points||0 }}积分</p>
      <div class="profile__stats">
        <div class="profile__stat"><strong>{{ user.total_nights||0 }}</strong><span>间夜</span></div>
        <div class="profile__stat"><strong>{{ user.points||0 }}</strong><span>积分</span></div>
        <div class="profile__stat"><strong>{{ user.discount||100 }}折</strong><span>折扣</span></div>
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
import api from '../utils/api.js';

const router = useRouter();
const user = ref({});
const menuItems = [
  { path: '/member', label: '会员中心' },
  { path: '/wallet', label: '我的钱包' },
  { path: '/mall', label: '积分商城' },
  { path: '/profile/edit', label: '编辑资料' },
];

onMounted(async () => { try { const r = await api.getProfile(); user.value = r.data || {}; } catch {} });
function go(p) { router.push(p); }
</script>

<style scoped>
.profile { padding: 16px 14px; }
.profile__card {
  position: relative; overflow: hidden;
  padding: 28px 20px; border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(0,212,255,.08), rgba(168,85,247,.08));
  border: 1px solid var(--border-subtle);
  text-align: center; margin-bottom: 16px;
}
.profile__card-glow {
  position: absolute; top: -30%; left: -30%; width: 160%; height: 160%;
  background: radial-gradient(circle at 50% 50%, rgba(0,212,255,.06), transparent 60%);
  pointer-events: none;
}
.profile__name { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; position: relative; z-index: 1; }
.profile__member { font-size: 13px; color: var(--neon-cyan); margin-bottom: 18px; position: relative; z-index: 1; opacity: .8; }
.profile__stats { display: flex; justify-content: center; gap: 28px; position: relative; z-index: 1; }
.profile__stat { display: flex; flex-direction: column; }
.profile__stat strong { font-size: 22px; color: var(--neon-cyan); }
.profile__stat span { font-size: 11px; color: var(--text-muted); }

.profile__menu {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); overflow: hidden;
}
.profile__menu-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px; font-size: 15px; color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle); cursor: pointer;
  transition: all var(--dur-fast);
}
.profile__menu-item:last-child { border-bottom: 0; }
.profile__menu-item:hover { background: rgba(0,212,255,.04); }
.profile__menu-arrow { font-size: 16px; color: var(--text-muted); }
</style>
