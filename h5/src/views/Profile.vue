<template>
  <div class="profile">
    <!-- 个人卡片 -->
    <div class="profile__card">
      <div class="profile__avatar-wrap">
        <img v-if="user.avatar_url" :src="user.avatar_url" class="profile__avatar" />
        <span v-else class="profile__avatar profile__avatar--text">{{ (user.nickname || '用')[0] }}</span>
      </div>
      <h2 class="profile__name">{{ user.nickname || '用户' }}</h2>
      <p class="profile__member" v-if="user.member_no">{{ user.level_name || '会员' }} · {{ user.points || 0 }} 积分</p>
      <div class="profile__stats">
        <div class="profile__stat"><strong>{{ user.total_nights || 0 }}</strong><span>间夜</span></div>
        <div class="profile__stat"><strong>{{ user.points || 0 }}</strong><span>积分</span></div>
        <div class="profile__stat"><strong>{{ user.discount || 100 }}折</strong><span>折扣</span></div>
      </div>
    </div>

    <!-- 菜单 -->
    <div class="profile__menu">
      <div class="profile__menu-item" @click="go('/member')"><span>会员中心</span><span class="profile__menu-arrow">›</span></div>
      <div class="profile__menu-item" @click="go('/wallet')"><span>我的钱包</span><span class="profile__menu-arrow">›</span></div>
      <div class="profile__menu-item" @click="go('/mall')"><span>积分商城</span><span class="profile__menu-arrow">›</span></div>
      <div class="profile__menu-item" @click="go('/profile/edit')"><span>编辑资料</span><span class="profile__menu-arrow">›</span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../utils/api.js';

const router = useRouter();
const user = ref({});

onMounted(async () => {
  try { const res = await api.getProfile(); user.value = res.data || {}; } catch { /* ignore */ }
});
function go(p) { router.push(p); }
</script>

<style scoped>
.profile__card {
  margin: 12px;
  padding: 24px 20px;
  background: linear-gradient(135deg, #1a56db, #2563eb);
  border-radius: 16px;
  color: #fff;
  text-align: center;
}
.profile__avatar-wrap { margin-bottom: 10px; }
.profile__avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,.3); }
.profile__avatar--text { display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,.2); font-size: 28px; }
.profile__name { font-size: 19px; font-weight: 700; margin-bottom: 4px; }
.profile__member { font-size: 13px; opacity: .85; margin-bottom: 16px; }
.profile__stats { display: flex; justify-content: center; gap: 24px; }
.profile__stat { display: flex; flex-direction: column; }
.profile__stat strong { font-size: 20px; }
.profile__stat span { font-size: 11px; opacity: .75; }

.profile__menu { margin: 0 12px; background: #fff; border-radius: 12px; overflow: hidden; }
.profile__menu-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; font-size: 15px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.profile__menu-item:last-child { border-bottom: 0; }
.profile__menu-arrow { font-size: 20px; color: #ccc; }
</style>
