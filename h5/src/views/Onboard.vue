<template>
  <div class="onboard">
    <div class="onboard__card">
      <div class="onboard__logo">WUXIAN</div>
      <h1 class="onboard__title">完善信息</h1>
      <p class="onboard__sub">首次使用需填写以下信息</p>

      <div class="onboard__form">
        <div class="onboard__field">
          <label class="onboard__label">手机号 <span class="onboard__required">*</span></label>
          <input v-model="form.phone" class="onboard__input" type="tel" placeholder="请输入手机号" maxlength="11" />
          <p v-if="phoneErr" class="onboard__err">{{ phoneErr }}</p>
        </div>

        <div class="onboard__field">
          <label class="onboard__label">真实姓名 <span class="onboard__required">*</span></label>
          <input v-model="form.realName" class="onboard__input" placeholder="请输入真实姓名" maxlength="20" />
        </div>

        <div class="onboard__field">
          <label class="onboard__label">身份证号 <span class="onboard__required">*</span></label>
          <input v-model="form.idNumber" class="onboard__input" :class="{ 'onboard__input--error': idErr }" placeholder="请输入18位身份证号" maxlength="18" @input="parseIdCard" />
          <p v-if="idErr" class="onboard__err">{{ idErr }}</p>
          <p v-else-if="form.idNumber && idAge !== null" class="onboard__hint">出生 {{ idBirth }} · {{ idAge }}岁</p>
        </div>

        <div class="onboard__field">
          <label class="onboard__label">昵称 <span class="onboard__hint-label">（选填）</span></label>
          <input v-model="form.nickname" class="onboard__input" placeholder="给自己取个昵称" maxlength="20" />
        </div>
      </div>

      <!-- 隐私协议 -->
      <div class="onboard__agree" @click="agreed = !agreed">
        <div class="onboard__checkbox" :class="{ 'onboard__checkbox--checked': agreed }">
          <Check v-if="agreed" :size="12" :stroke-width="3" />
        </div>
        <span class="onboard__agree-text">
          我已阅读并同意
          <a href="javascript:;" @click.stop="showPrivacy" class="onboard__link">《隐私政策》</a>
          和
          <a href="javascript:;" @click.stop="showTerms" class="onboard__link">《用户协议》</a>
        </span>
      </div>

      <button class="onboard__btn" @click="submit" :disabled="submitting || !canSubmit">
        {{ submitting ? '保存中...' : '开始使用' }}
      </button>
    </div>

    <!-- 隐私政策/用户协议弹窗 -->
    <Teleport to="body">
      <Transition name="obo-modal">
        <div v-if="showModal" class="onboard__overlay" @click.self="showModal = false">
          <div class="onboard__modal">
            <div class="onboard__modal-head">
              <h3>{{ modalTitle }}</h3>
              <button @click="showModal = false" class="onboard__modal-close">✕</button>
            </div>
            <div class="onboard__modal-body">
              <template v-if="modalType === 'privacy'">
                <h4>隐私政策</h4>
                <p>柳州无限电竞酒店（以下简称"我们"）深知个人信息对您的重要性，我们将按法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。</p>
                <h4>一、我们收集哪些信息</h4>
                <p>当您使用本小程序时，我们会收集您的手机号码、真实姓名、身份证号码等必要信息，用于完成酒店预订和入住登记。</p>
                <h4>二、信息如何使用</h4>
                <p>您的个人信息仅用于酒店预订、入住办理、会员积分等核心业务功能，我们不会将您的信息用于其他用途。</p>
                <h4>三、信息存储与保护</h4>
                <p>我们采用业界通行的安全技术和管理措施来保护您的个人信息免受未经授权的访问、使用或泄露。</p>
              </template>
              <template v-else>
                <h4>用户协议</h4>
                <p>欢迎使用柳州无限电竞酒店预订服务。在使用本小程序前，请您仔细阅读以下条款：</p>
                <h4>一、服务说明</h4>
                <p>本小程序提供酒店房间查询、预订、支付、订单管理等功能。预订成功后请按时到店办理入住。</p>
                <h4>二、用户义务</h4>
                <p>您承诺提供的个人信息真实有效，未满18岁人士请勿使用本服务预订房间。</p>
                <h4>三、取消政策</h4>
                <p>入住前24小时可免费取消订单；入住前24小时内取消，将收取首晚房费；未入住不退款。</p>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { Check } from 'lucide-vue-next';
import { verify } from 'idcard-verify';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';

const form = reactive({ phone: '', realName: '', idNumber: '', nickname: '' });
const agreed = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const modalType = ref('privacy');
const modalTitle = computed(() => modalType.value === 'privacy' ? '隐私政策' : '用户协议');

// 身份证解析
const idBirth = ref('');
const idAge = ref(null);
const idErr = ref('');
const phoneErr = ref('');

function parseIdCard() {
  idErr.value = '';
  idBirth.value = '';
  idAge.value = null;
  const val = form.idNumber;
  if (!val) return;
  if (val.length < 18) return;

  // 格式预检
  if (!/^\d{17}[\dxX]$/.test(val)) {
    idErr.value = '身份证号格式不正确';
    return;
  }

  // 校验码验证（idcard-verify 库）
  if (!verify(val)) {
    idErr.value = '身份证号不正确';
    return;
  }

  // 手动提取生日：第7-14位 YYYYMMDD
  const birth = val.slice(6, 14);
  const y = parseInt(birth.slice(0, 4), 10);
  const m = parseInt(birth.slice(4, 6), 10);
  const d = parseInt(birth.slice(6, 8), 10);

  idBirth.value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // 手动计算周岁
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  idAge.value = age;

  if (age < 18) {
    idErr.value = '未满18岁无法预订';
  }
}

function showPrivacy() { modalType.value = 'privacy'; showModal.value = true; }
function showTerms() { modalType.value = 'terms'; showModal.value = true; }

const canSubmit = computed(() => {
  return form.phone.length >= 11
    && form.realName.trim()
    && form.idNumber.length === 18
    && !idErr.value
    && agreed.value;
});

async function submit() {
  if (!canSubmit.value) return;
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    phoneErr.value = '请输入正确的手机号';
    return;
  }
  phoneErr.value = '';

  submitting.value = true;
  try {
    await api.updateProfile({
      phone: form.phone,
      realName: form.realName,
      idNumber: form.idNumber,
      nickname: form.nickname || undefined,
    });
    localStorage.setItem('hotel_h5_onboarded', '1');
    showToast('信息已保存', 'success');
    window.location.replace('/h5/#/');
  } catch {
    showToast('保存失败，请重试', 'error');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.onboard {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}
.onboard__card {
  width: 100%;
  max-width: 360px;
}
.onboard__logo {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 4px;
  text-align: center;
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-md);
}
.onboard__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: var(--space-xs);
}
.onboard__sub {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: var(--space-lg);
}

/* 表单 */
.onboard__form {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}
.onboard__field { margin-bottom: var(--space-md); }
.onboard__field:last-child { margin-bottom: 0; }
.onboard__label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.onboard__required { color: var(--neon-pink); }
.onboard__hint-label { font-size: 11px; color: var(--text-muted); }
.onboard__input {
  width: 100%; height: 44px; padding: 0 12px;
  background: var(--bg-input); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; outline: 0;
  transition: border-color var(--dur-fast);
}
.onboard__input:focus { border-color: var(--border-glow); }
.onboard__input::placeholder { color: var(--text-muted); }
.onboard__input--error { border-color: var(--neon-pink); }
.onboard__err { font-size: 11px; color: var(--neon-pink); margin-top: 4px; }
.onboard__hint { font-size: 11px; color: var(--neon-cyan); margin-top: 4px; }

/* 隐私协议 */
.onboard__agree {
  display: flex; align-items: flex-start; gap: 8px;
  margin-bottom: var(--space-lg); cursor: pointer; user-select: none;
  padding: 0 4px;
}
.onboard__checkbox {
  width: 18px; height: 18px; border-radius: 4px;
  border: 1px solid var(--border-subtle); flex-shrink: 0; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--dur-fast);
}
.onboard__checkbox--checked {
  background: var(--neon-cyan); border-color: var(--neon-cyan);
  color: var(--bg-deep);
}
.onboard__agree-text { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
.onboard__link { color: var(--neon-cyan); text-decoration: none; }

/* 按钮 */
.onboard__btn {
  width: 100%; padding: 14px; border: 0; border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;
  transition: opacity var(--dur-fast);
}
.onboard__btn:disabled { opacity: .5; cursor: default; }

/* 弹窗 */
.onboard__overlay {
  position: fixed; inset: 0; z-index: 800;
  background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-md);
}
.onboard__modal {
  width: 100%; max-width: 400px; max-height: 70vh;
  background: var(--bg-primary); border-radius: var(--radius-lg);
  overflow: hidden; display: flex; flex-direction: column;
}
.onboard__modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-md); border-bottom: 1px solid var(--border-subtle);
}
.onboard__modal-head h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.onboard__modal-close { font-size: 18px; color: var(--text-muted); background: none; border: 0; cursor: pointer; }
.onboard__modal-body {
  padding: var(--space-md); overflow-y: auto; flex: 1;
  font-size: 13px; color: var(--text-secondary); line-height: 1.8;
}
.onboard__modal-body h4 { color: var(--text-primary); font-size: 14px; margin: 12px 0 4px; }
.onboard__modal-body h4:first-child { margin-top: 0; }

/* 弹窗动画 */
.obo-modal-enter-active,
.obo-modal-leave-active { transition: all .25s var(--ease-out); }
.obo-modal-enter-from .onboard__modal,
.obo-modal-leave-to .onboard__modal { transform: scale(.9); opacity: 0; }
.obo-modal-enter-from .onboard__overlay,
.obo-modal-leave-to .onboard__overlay { opacity: 0; }
</style>
