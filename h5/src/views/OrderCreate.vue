<template>
  <div class="oc">
    <NavBar title="填写订单" />

    <!-- 步骤条 -->
    <div class="oc__steps">
      <div class="oc__step">
        <div class="oc__step-num oc__step-num--done">✓</div>
        <span class="oc__step-label oc__step-label--done">选择日期</span>
      </div>
      <div class="oc__step-line oc__step-line--done"></div>
      <div class="oc__step">
        <div class="oc__step-num oc__step-num--active">2</div>
        <span class="oc__step-label oc__step-label--active">填写信息</span>
      </div>
      <div class="oc__step-line"></div>
      <div class="oc__step">
        <div class="oc__step-num oc__step-num--todo">3</div>
        <span class="oc__step-label">确认支付</span>
      </div>
    </div>

    <div v-if="loading" class="oc__state">加载中...</div>
    <template v-else>
      <!-- 预订信息 -->
      <div class="oc__card">
        <div class="oc__card-title"><BedSingle :size="16" /> 预订信息</div>
        <div class="oc__card-body">
          <div class="oc__room-summary">
            <img :src="room.imageUrl || '/placeholder.jpg'" :alt="room.name" class="oc__room-thumb" />
            <div>
              <h4 class="oc__room-name">{{ room.name }}</h4>
              <p class="oc__room-meta" v-if="room.area || room.bed_type">{{ room.area ? room.area+'㎡' : '' }}{{ room.area && room.bed_type ? ' · ' : '' }}{{ room.bed_type || '' }}</p>
            </div>
          </div>

          <div class="oc__date-row">
            <div class="oc__date-item">
              <span class="oc__date-label">入住</span>
              <span class="oc__date-val">{{ checkIn }}</span>
            </div>
          <ArrowRight :size="16" class="oc__date-arrow" />
          <span class="oc__nights-badge">{{ nights }}晚</span>
          <ArrowRight :size="16" class="oc__date-arrow" />
            <div class="oc__date-item">
              <span class="oc__date-label">退房</span>
              <span class="oc__date-val">{{ checkOut }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 入住人信息 -->
      <div class="oc__card">
        <div class="oc__card-title"><User :size="16" /> 入住人信息</div>
        <div class="oc__card-body">
          <div class="oc__field">
            <label class="oc__label">姓名 <span class="oc__required">*</span></label>
            <input v-model="form.guestName" class="oc__input" :class="{ 'oc__input--filled': form.guestName }" placeholder="请输入入住人姓名" />
          </div>
          <div class="oc__field">
            <label class="oc__label">手机号 <span class="oc__required">*</span></label>
            <input v-model="form.guestPhone" class="oc__input" :class="{ 'oc__input--filled': form.guestPhone }" placeholder="请输入手机号" type="tel" />
          </div>
          <div class="oc__field">
            <label class="oc__label">备注 <span class="oc__label-hint">（选填）</span></label>
            <textarea v-model="form.remark" class="oc__textarea" placeholder="如有特殊需求请在此备注" rows="2"></textarea>
          </div>
        </div>
      </div>

      <!-- 取消政策 -->
      <div class="oc__card">
        <div class="oc__card-title"><FileText :size="16" /> 取消政策</div>
        <div class="oc__card-body oc__policy">
          <p>• 入住前24小时免费取消</p>
          <p>• 入住前24小时内取消，收取首晚房费</p>
          <p>• 不入住不退款</p>
        </div>
      </div>

      <!-- 底部 -->
      <div class="oc__bar">
        <div class="oc__bar-price">合计 <strong>¥{{ roomTotal }}</strong></div>
        <button class="oc__bar-btn" @click="submitOrder" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交订单' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BedSingle, User, FileText, ArrowRight } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';

const route = useRoute();
const router = useRouter();

const room = ref({});
const loading = ref(true);
const submitting = ref(false);
const checkIn = ref('');
const checkOut = ref('');
const nights = ref(1);

const form = reactive({ guestName: '', guestPhone: '', remark: '' });

const roomTotal = computed(() => (room.value.price || 0) * nights.value);

onMounted(async () => {
  const { roomId, checkIn: ci, checkOut: co } = route.query;
  checkIn.value = ci || '';
  checkOut.value = co || '';
  if (ci && co) nights.value = Math.round((new Date(co)-new Date(ci))/86400000);

  try {
    const res = await api.getRoomDetail(roomId);
    room.value = res.data || {};
  } catch { /* ignore */ }
  finally { loading.value = false; }
});

async function submitOrder() {
  if (!form.guestName.trim()) { alert('请输入入住人姓名'); return; }
  if (form.guestPhone && !/^1[3-9]\d{9}$/.test(form.guestPhone)) { alert('请输入正确的手机号'); return; }

  submitting.value = true;
  try {
    const res = await api.createOrder({
      roomId: route.query.roomId,
      checkIn: checkIn.value,
      checkOut: checkOut.value,
      guestName: form.guestName,
      guestPhone: form.guestPhone,
      remark: form.remark,
    });
    const order = res.data || {};
    router.push(`/order/confirm/${order.orderNo}`);
  } catch { /* handled by api */ }
  finally { submitting.value = false; }
}
</script>

<style scoped>
/* 步骤条 */
.oc__steps {
  display: flex; align-items: center; padding: 14px 20px;
  background: var(--bg-card); border-bottom: 1px solid var(--border-subtle);
}
.oc__step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.oc__step-num {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.oc__step-num--done { background: var(--neon-cyan); color: var(--bg-deep); }
.oc__step-num--active { background: var(--neon-cyan); color: var(--bg-deep); box-shadow: 0 0 0 3px rgba(0,212,255,.2); }
.oc__step-num--todo { background: rgba(255,255,255,.06); color: var(--text-muted); }
.oc__step-label { font-size: 11px; color: var(--text-muted); }
.oc__step-label--done { color: var(--neon-cyan); }
.oc__step-label--active { color: var(--neon-cyan); font-weight: 600; }
.oc__step-line { flex: 1; height: 1px; background: var(--border-subtle); margin-bottom: 14px; }
.oc__step-line--done { background: var(--neon-cyan); }

.oc__state { text-align: center; color: var(--text-muted); padding: 60px 0; }

/* 卡片 */
.oc__card { background: var(--bg-card); margin: 8px 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
.oc__card-title { padding: 14px 16px 10px; font-size: 15px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px; }
.oc__card-body { padding: 14px 16px; }

.oc__room-summary { display: flex; gap: 12px; margin-bottom: 14px; }
.oc__room-thumb { width: 80px; height: 60px; border-radius: 8px; object-fit: cover; background: rgba(255,255,255,.03); flex-shrink: 0; }
.oc__room-name { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.oc__room-meta { font-size: 12px; color: var(--text-secondary); }

.oc__date-row { display: flex; align-items: center; justify-content: space-between; }
.oc__date-item { text-align: center; }
.oc__date-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.oc__date-val { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.oc__date-arrow { color: var(--neon-cyan); }
.oc__nights-badge { background: rgba(0,212,255,.1); color: var(--neon-cyan); padding: 4px 12px; border-radius: var(--radius-full); font-size: 12px; font-weight: 600; }

/* 表单 */
.oc__field { margin-bottom: 14px; }
.oc__field:last-child { margin-bottom: 0; }
.oc__label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.oc__required { color: var(--neon-pink); }
.oc__label-hint { font-size: 11px; color: var(--text-muted); }
.oc__input {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--border-subtle); border-radius: 8px;
  font-size: 14px; background: rgba(255,255,255,.03); color: var(--text-primary);
  transition: border-color .2s;
}
.oc__input::placeholder { color: var(--text-muted); }
.oc__input--filled { border-color: var(--neon-cyan); }
.oc__textarea {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--border-subtle); border-radius: 8px;
  font-size: 13px; background: rgba(255,255,255,.03); color: var(--text-primary); resize: none;
}
.oc__textarea::placeholder { color: var(--text-muted); }
.oc__policy { font-size: 12px; color: var(--text-secondary); line-height: 1.8; }

/* 底部固定栏 + 留白防遮挡 */
.oc {
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.oc__bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: calc(64px + env(safe-area-inset-bottom));
  padding: 12px 16px 0; padding-bottom: env(safe-area-inset-bottom);
  background: rgba(10,14,26,.95); backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-subtle);
  display: flex; align-items: center; justify-content: space-between;
  z-index: 20; box-sizing: border-box;
}
.oc__bar-price { font-size: 12px; color: var(--text-muted); }
.oc__bar-price strong { font-size: 20px; color: var(--neon-cyan); }
.oc__bar-btn {
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff; border: none; border-radius: var(--radius-full);
  padding: 12px 32px; font-size: 15px; font-weight: 600;
}
.oc__bar-btn:disabled { opacity: .6; }
</style>
