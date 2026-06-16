<template>
  <NavBar title="编辑资料" />
  <div class="profile-edit">
    <div class="profile-edit__form">
      <div class="profile-edit__field">
        <label class="profile-edit__label">昵称</label>
        <input v-model="form.nickname" class="profile-edit__input" placeholder="请输入昵称" maxlength="30" />
      </div>
      <div class="profile-edit__field">
        <label class="profile-edit__label">真实姓名</label>
        <input v-model="form.realName" class="profile-edit__input" placeholder="请输入真实姓名" maxlength="20" />
      </div>
      <div class="profile-edit__field">
        <label class="profile-edit__label">性别</label>
        <div class="profile-edit__radio-group">
          <label v-for="g in genders" :key="g.value" class="profile-edit__radio">
            <input type="radio" :value="g.value" v-model="form.gender" />
            <span>{{ g.label }}</span>
          </label>
        </div>
      </div>
      <button class="profile-edit__submit" @click="submit" :disabled="submitting">
        {{ submitting ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';

const router = useRouter();
const submitting = ref(false);
const form = reactive({ nickname: '', realName: '', gender: 0 });
const genders = [
  { value: 0, label: '保密' },
  { value: 1, label: '男' },
  { value: 2, label: '女' },
];

onMounted(async () => {
  try {
    const res = await api.getProfile();
    const u = res.data || {};
    form.nickname = u.nickname || '';
    form.realName = u.real_name || '';
    form.gender = u.gender ?? 0;
  } catch {
    // ignore
  }
});

async function submit() {
  submitting.value = true;
  try {
    await api.updateProfile({ nickname: form.nickname, realName: form.realName, gender: form.gender });
    showToast('保存成功', 'success');
    router.back();
  } catch {
    // error handled by api
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.profile-edit { padding: 12px 14px; }
.profile-edit__form { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; }
.profile-edit__field { margin-bottom: 16px; }
.profile-edit__label { display: block; font-size: 14px; color: var(--text-secondary); margin-bottom: 6px; }
.profile-edit__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 15px;
  background: rgba(255,255,255,.03);
  color: var(--text-primary);
}
.profile-edit__radio-group { display: flex; gap: 20px; }
.profile-edit__radio { display: flex; align-items: center; gap: 4px; font-size: 14px; color: var(--text-secondary); cursor: pointer; }
.profile-edit__submit {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 8px;
}
.profile-edit__submit:disabled { opacity: .6; }
</style>
