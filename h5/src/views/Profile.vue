<template>
  <div class="profile">
    <header class="profile__header">
      <div class="profile__avatar-wrap">
        <img v-if="user.avatar_url" :src="user.avatar_url" class="profile__avatar" />
        <span v-else class="profile__avatar profile__avatar--empty">{{ avatarInitial }}</span>
      </div>
      <h2 class="profile__name">{{ user.nickname || '用户' }}</h2>
      <p class="profile__member" v-if="user.member_no">{{ user.level_name || '普通会员' }} · {{ user.points || 0 }} 积分</p>
    </header>

    <section class="profile__menu">
      <div class="profile__menu-item" @click="goTo('/member')">
        <span>会员中心</span>
        <span class="profile__arrow">›</span>
      </div>
      <div class="profile__menu-item" @click="goTo('/wallet')">
        <span>我的钱包</span>
        <span class="profile__arrow">›</span>
      </div>
      <div class="profile__menu-item" @click="goTo('/mall')">
        <span>积分商城</span>
        <span class="profile__arrow">›</span>
      </div>
      <div class="profile__menu-item" @click="goTo('/profile/edit')">
        <span>编辑资料</span>
        <span class="profile__arrow">›</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../utils/api.js';

const router = useRouter();
const user = ref({});

const avatarInitial = computed(() => (user.value.nickname || '用')[0]);

onMounted(async () => {
  try {
    const res = await api.getProfile();
    user.value = res.data || {};
  } catch {
    // ignore
  }
});

function goTo(path) { router.push(path); }
</script>

<style scoped>
.profile__header {
  background: linear-gradient(135deg, #1a56db, #2563eb);
  color: #fff;
  padding: 30px 20px;
  text-align: center;
}
.profile__avatar-wrap { margin-bottom: 12px; }
.profile__avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255, 255, 255, .3); }
.profile__avatar--empty { display: inline-flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, .2); font-size: 28px; }
.profile__name { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.profile__member { font-size: 13px; opacity: .85; }
.profile__menu { margin: 12px 12px 0; background: #fff; border-radius: 12px; overflow: hidden; }
.profile__menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  font-size: 15px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}
.profile__menu-item:last-child { border-bottom: 0; }
.profile__arrow { font-size: 20px; color: #ccc; }
</style>
