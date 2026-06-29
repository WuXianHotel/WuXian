<template>
  <div>
    <!-- 顶部 Tab 切换 -->
    <el-tabs v-model="activeTab" @tab-change="onTabChange" style="margin-bottom:16px">
      <el-tab-pane label="会员列表" name="members" />
      <el-tab-pane label="积分管理" name="points" />
      <el-tab-pane label="余额管理" name="wallet" />
      <el-tab-pane label="等级管理" name="levels" />
    </el-tabs>

    <!-- ===================== 会员列表 Tab ===================== -->
    <template v-if="activeTab === 'members'">
      <!-- Stats -->
      <el-row :gutter="14" style="margin-bottom:16px">
        <el-col :span="6" v-for="k in memberKpis" :key="k.label">
          <el-card shadow="hover" body-style="display:flex;align-items:center;gap:14px;padding:20px">
            <div class="kpi-icon" :style="{background:k.color}">
              <el-icon :size="20"><component :is="k.icon" /></el-icon>
            </div>
            <div>
              <div class="kpi-value">{{ k.value }}</div>
              <div class="kpi-label">{{ k.label }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Filter -->
      <el-card shadow="hover" style="margin-bottom:16px">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <el-input v-model="filter.keyword" placeholder="手机号 / 昵称…" style="width:200px" clearable @keyup.enter="load" />
          <el-select v-model="filter.level" placeholder="全部等级" clearable style="width:120px" @change="load">
            <el-option label="铜卡" value="1" />
            <el-option label="银卡" value="2" />
            <el-option label="金卡" value="3" />
            <el-option label="铂金" value="4" />
          </el-select>
          <el-select v-model="filter.status" placeholder="全部状态" clearable style="width:100px" @change="load">
            <el-option label="正常" value="1" />
            <el-option label="封禁" value="0" />
          </el-select>
          <el-button type="primary" @click="page=1;load()">搜索</el-button>
        </div>
      </el-card>

      <!-- Table -->
      <el-card shadow="hover">
        <el-table :data="members" v-loading="loading" stripe style="width:100%">
          <el-table-column label="会员" min-width="150">
            <template #default="{ row }">
              <div style="display:flex;align-items:center;gap:8px">
                <el-avatar :size="30" style="background:var(--primary-bg);color:var(--primary);font-weight:600;font-size:13px">{{ (row.nickname||row.phone||'?')[0] }}</el-avatar>
                <span>{{ row.nickname || '—' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="手机号" min-width="150">
            <template #default="{ row }">{{ row.phone || '-' }}</template>
          </el-table-column>
          <el-table-column label="等级" min-width="90">
            <template #default="{ row }"><el-tag size="small" :type="levelType(row.level)">{{ row.level_name || levelLabel(row.level) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="points" label="积分" min-width="80" />
          <el-table-column label="余额" min-width="90">
            <template #default="{ row }">
              <span style="font-weight:600;color:var(--primary)">¥{{ Number(row.wallet_balance || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="消费次数" width="90">
            <template #default="{ row }">{{ row.order_count || 0 }}</template>
          </el-table-column>
          <el-table-column label="状态" min-width="80">
            <template #default="{ row }">
              <el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1 ? '正常' : '封禁' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="注册时间" min-width="120">
            <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewMemberOrders(row)">订单</el-button>
              <el-button type="primary" link size="small" @click="openPointsLogs(row)">积分明细</el-button>
              <el-dropdown trigger="click" @command="(cmd) => handleMemberAction(cmd, row)">
                <el-button link size="small" type="info">
                  更多<el-icon style="margin-left:2px"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="points">调积分</el-dropdown-item>
                    <el-dropdown-item command="walletLogs">余额明细</el-dropdown-item>
                    <el-dropdown-item command="wallet">调余额</el-dropdown-item>
                    <el-dropdown-item command="level">调等级</el-dropdown-item>
                    <el-dropdown-item command="ban" :divided="true">{{ row.status===1?'封禁':'解封' }}</el-dropdown-item>
                    <el-dropdown-item command="delete" style="color:var(--el-color-danger)">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
        <div style="display:flex;justify-content:flex-end;margin-top:16px" v-if="total > pageSize">
          <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="load" />
        </div>
      </el-card>
    </template>

    <!-- ===================== 积分管理 Tab ===================== -->
    <template v-if="activeTab === 'points'">
      <!-- 积分统计 KPI -->
      <el-row :gutter="14" style="margin-bottom:16px">
        <el-col :span="6" v-for="k in pointsKpis" :key="k.label">
          <el-card shadow="hover" body-style="display:flex;align-items:center;gap:14px;padding:20px">
            <div class="kpi-icon" :style="{background:k.color}">
              <el-icon :size="20"><component :is="k.icon" /></el-icon>
            </div>
            <div>
              <div class="kpi-value">{{ k.value }}</div>
              <div class="kpi-label">{{ k.label }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 积分规则设置 -->
      <el-card shadow="hover" style="margin-bottom:16px">
        <template #header>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600">积分规则设置</span>
            <el-button type="primary" size="small" @click="savePointsSettings" :loading="savingSettings">保存设置</el-button>
          </div>
        </template>
        <el-form :model="pointsSettings" label-width="160px" v-loading="loadingSettings" style="max-width:600px">
          <el-form-item label="消费积分获取">
            <el-input-number v-model="pointsSettings.points_per_yuan" :min="0" :precision="0" style="width:200px" />
            <span style="margin-left:8px;color:var(--text-secondary);font-size:13px">积分 / 每消费1元</span>
          </el-form-item>
          <el-form-item label="积分抵扣汇率">
            <el-input-number v-model="pointsSettings.points_to_yuan" :min="1" :precision="0" style="width:200px" />
            <span style="margin-left:8px;color:var(--text-secondary);font-size:13px">积分 = 1元</span>
          </el-form-item>
          <el-form-item label="开启积分抵扣">
            <el-switch v-model="pointsSettings.points_deduct_enabled" :active-value="1" :inactive-value="0" active-text="开启" inactive-text="关闭" />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 全局积分流水 -->
      <el-card shadow="hover">
        <template #header>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600">积分流水记录</span>
            <div style="display:flex;gap:10px">
              <el-input v-model="allLogsFilter.keyword" placeholder="昵称 / 手机号" style="width:160px" clearable @keyup.enter="allLogsPage=1;loadAllPointsLogs()" />
              <el-select v-model="allLogsFilter.type" placeholder="全部类型" clearable style="width:120px" @change="allLogsPage=1;loadAllPointsLogs()">
                <el-option label="消费获得" value="earn" />
                <el-option label="积分使用" value="use" />
                <el-option label="人工调整" value="adjust" />
                <el-option label="过期" value="expire" />
              </el-select>
              <el-button type="primary" size="small" @click="allLogsPage=1;loadAllPointsLogs()">搜索</el-button>
            </div>
          </div>
        </template>
        <el-table :data="allPointsLogs" v-loading="allLogsLoading" stripe style="width:100%">
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ fmtDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="用户" width="150">
            <template #default="{ row }">{{ row.nickname || row.phone || '-' }}</template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="logTypeTag(row.type)">{{ logTypeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="积分变动" width="100">
            <template #default="{ row }">
              <span :style="{ color: row.points > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }">
                {{ row.points > 0 ? '+' : '' }}{{ row.points }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="余额" width="80" prop="balance" />
          <el-table-column label="备注" min-width="180">
            <template #default="{ row }">{{ row.remark || '-' }}</template>
          </el-table-column>
          <el-table-column label="关联单号" width="140">
            <template #default="{ row }"><span class="mono">{{ row.ref_id || '-' }}</span></template>
          </el-table-column>
        </el-table>
        <div style="display:flex;justify-content:flex-end;margin-top:16px" v-if="allLogsTotal > allLogsPageSize">
          <el-pagination background layout="prev, pager, next" :total="allLogsTotal" :page-size="allLogsPageSize" v-model:current-page="allLogsPage" @current-change="loadAllPointsLogs" />
        </div>
      </el-card>
    </template>

    <!-- ===================== 余额管理 Tab ===================== -->
    <template v-if="activeTab === 'wallet'">
      <!-- 余额统计 KPI -->
      <el-row :gutter="14" style="margin-bottom:16px">
        <el-col :span="6" v-for="k in walletKpis" :key="k.label">
          <el-card shadow="hover" body-style="display:flex;align-items:center;gap:14px;padding:20px">
            <div class="kpi-icon" :style="{background:k.color}">
              <el-icon :size="20"><component :is="k.icon" /></el-icon>
            </div>
            <div>
              <div class="kpi-value">{{ k.value }}</div>
              <div class="kpi-label">{{ k.label }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 全局余额流水 -->
      <el-card shadow="hover">
        <template #header>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600">余额流水记录</span>
            <div style="display:flex;gap:10px">
              <el-input v-model="walletLogsFilter.keyword" placeholder="昵称 / 手机号" style="width:160px" clearable @keyup.enter="walletLogsPage=1;loadAllWalletLogs()" />
              <el-select v-model="walletLogsFilter.type" placeholder="全部类型" clearable style="width:120px" @change="walletLogsPage=1;loadAllWalletLogs()">
                <el-option label="充值" value="recharge" />
                <el-option label="消费" value="consume" />
                <el-option label="退款" value="refund" />
                <el-option label="赠送" value="bonus" />
              </el-select>
              <el-button type="primary" size="small" @click="walletLogsPage=1;loadAllWalletLogs()">搜索</el-button>
            </div>
          </div>
        </template>
        <el-table :data="allWalletLogs" v-loading="walletLogsLoading" stripe style="width:100%">
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ fmtDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="用户" width="150">
            <template #default="{ row }">{{ row.nickname || row.phone || '-' }}</template>
          </el-table-column>
          <el-table-column label="类型" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="walletTypeTag(row.type)">{{ walletTypeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="金额变动" width="110">
            <template #default="{ row }">
              <span :style="{ color: Number(row.amount) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }">
                {{ Number(row.amount) >= 0 ? '+' : '' }}{{ row.amount }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="余额" width="100">
            <template #default="{ row }">¥{{ row.balance }}</template>
          </el-table-column>
          <el-table-column label="备注" min-width="180">
            <template #default="{ row }">{{ row.remark || '-' }}</template>
          </el-table-column>
          <el-table-column label="关联单号" width="140">
            <template #default="{ row }"><span class="mono">{{ row.ref_order_no || '-' }}</span></template>
          </el-table-column>
        </el-table>
        <div style="display:flex;justify-content:flex-end;margin-top:16px" v-if="walletLogsTotal > walletLogsPageSize">
          <el-pagination background layout="prev, pager, next" :total="walletLogsTotal" :page-size="walletLogsPageSize" v-model:current-page="walletLogsPage" @current-change="loadAllWalletLogs" />
        </div>
      </el-card>
    </template>

    <!-- ===================== 等级管理 Tab ===================== -->
    <template v-if="activeTab === 'levels'">
      <el-card shadow="hover" style="margin-bottom:16px">
        <template #header>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600">会员等级配置</span>
            <el-button type="primary" size="small" @click="openCreateLevel">＋ 新增等级</el-button>
          </div>
        </template>
        <el-table :data="levels" v-loading="levelsLoading" stripe style="width:100%">
          <el-table-column label="等级" width="70" align="center">
            <template #default="{ row }">
              <span style="font-weight:700;font-size:16px">{{ row.level }}</span>
            </template>
          </el-table-column>
          <el-table-column label="图标" width="70" align="center">
            <template #default="{ row }">
              <img v-if="row.icon && /^https?:\/\//.test(row.icon)" :src="row.icon" style="width:28px;height:28px;border-radius:50%;object-fit:cover" />
              <span v-else-if="row.icon" style="font-size:20px">{{ row.icon }}</span>
              <span v-else style="font-size:20px">⭐</span>
            </template>
          </el-table-column>
          <el-table-column label="等级名称" width="120">
            <template #default="{ row }">
              <el-tag :color="row.color" style="color:#fff;border:none">{{ row.name }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="升级条件" min-width="160">
            <template #default="{ row }">
              <span v-if="row.min_nights || row.min_points">累计入住 ≥ {{ row.min_nights }}晚 或 积分 ≥ {{ row.min_points }}</span>
              <span v-else style="color:#94a3b8">默认等级</span>
            </template>
          </el-table-column>
          <el-table-column label="房费折扣" width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.discount < 1" style="color:var(--danger);font-weight:600">{{ (row.discount * 10).toFixed(1) }}折</span>
              <span v-else style="color:#94a3b8">无</span>
            </template>
          </el-table-column>
          <el-table-column label="积分获取倍率" width="110" align="center">
            <template #default="{ row }">
              <span style="font-weight:600">×{{ Number(row.points_rate) || 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="积分抵扣倍率" width="120" align="center">
            <template #default="{ row }">
              <span style="font-weight:600;color:var(--primary)">×{{ Number(row.deduct_rate) || 1 }}</span>
              <div style="font-size:11px;color:#94a3b8">{{ deductDesc(row.deduct_rate) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openEditLevel(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="doDeleteLevel(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 等级说明卡 -->
      <el-card shadow="hover">
        <template #header><span style="font-weight:600">积分抵扣倍率说明</span></template>
        <div style="color:var(--text-secondary);font-size:13px;line-height:2">
          <p>基础汇率由「积分管理」Tab 中的全局设置决定（如 100 积分 = 1 元）。</p>
          <p>每个会员等级有独立的<b style="color:var(--text)">抵扣倍率</b>，实际汇率 = 基础汇率 ÷ 抵扣倍率：</p>
          <ul style="padding-left:20px">
            <li v-for="lv in levels" :key="lv.id">
              <b>{{ lv.name }}</b>（×{{ Number(lv.deduct_rate) || 1 }}）：{{ deductDesc(lv.deduct_rate) }}
            </li>
          </ul>
          <p style="margin-top:8px">倍率越高，同样积分可抵扣越多金额，高等级会员更优惠。</p>
        </div>
      </el-card>
    </template>

    <!-- ===================== 弹窗们 ===================== -->

    <!-- 等级编辑 Dialog -->
    <el-dialog v-model="showLevelModal" :title="editingLevel ? '编辑等级' : '新增等级'" width="600px" destroy-on-close>
      <el-form :model="levelForm" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="等级值" required>
              <el-input-number v-model="levelForm.level" :min="1" :max="99" :disabled="!!editingLevel" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级名称" required>
              <el-input v-model="levelForm.name" placeholder="如：钻石会员" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="图标">
              <div style="display:flex;align-items:center;gap:10px">
                <img v-if="levelForm.icon && isImageUrl(levelForm.icon)" :src="ensureProtocol(levelForm.icon)" style="width:36px;height:36px;border-radius:50%;object-fit:cover" />
                <el-upload
                  :show-file-list="false"
                  :before-upload="handleIconUpload"
                  accept="image/*"
                >
                  <el-button size="small" type="primary" plain>上传图标</el-button>
                </el-upload>
                <el-input v-model="levelForm.icon" placeholder="或粘贴图片URL" style="flex:1" />
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主题色">
              <el-color-picker v-model="levelForm.color" show-alpha />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="最低入住晚数">
              <el-input-number v-model="levelForm.minNights" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最低积分">
              <el-input-number v-model="levelForm.minPoints" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left" style="margin:12px 0 20px">权益配置</el-divider>
        <el-form-item label="房费折扣">
          <el-input-number v-model="levelForm.discount" :min="0.5" :max="1" :step="0.01" :precision="2" style="width:200px" />
          <span class="field-inline-hint">0.95 = 九五折，1.00 = 无折扣</span>
        </el-form-item>
        <el-form-item label="积分获取倍率">
          <el-input-number v-model="levelForm.pointsRate" :min="0.5" :max="10" :step="0.1" :precision="1" style="width:200px" />
          <span class="field-inline-hint">消费获得积分 × 此倍率</span>
        </el-form-item>
        <el-form-item label="积分抵扣倍率">
          <el-input-number v-model="levelForm.deductRate" :min="0.5" :max="10" :step="0.1" :precision="1" style="width:200px" />
          <span class="field-inline-hint">倍率越高，同样积分可抵扣越多金额</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLevelModal=false">取消</el-button>
        <el-button type="primary" @click="saveLevel" :loading="levelSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 单会员余额明细 Dialog -->
    <el-dialog v-model="showWalletLogs" width="650px" destroy-on-close>
      <template #header>
        <span>余额明细 — {{ walletLogsTarget?.nickname || walletLogsTarget?.phone }}</span>
        <el-tag style="margin-left:12px" size="small" type="success">当前余额：¥{{ Number(walletLogsTarget?.wallet_balance || 0).toFixed(2) }}</el-tag>
      </template>
      <el-table :data="memberWalletLogs" v-loading="memberWalletLogsLoading" stripe style="width:100%" max-height="420px">
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ fmtDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="walletTypeTag(row.type)">{{ walletTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额变动" width="100">
          <template #default="{ row }">
            <span :style="{ color: Number(row.amount) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }">
              {{ Number(row.amount) >= 0 ? '+' : '' }}{{ row.amount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="余额" width="90">
          <template #default="{ row }">¥{{ row.balance }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="160">
          <template #default="{ row }">{{ row.remark || '-' }}</template>
        </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
        <el-pagination
          v-if="memberWalletLogsTotal > memberWalletLogsPageSize"
          background layout="prev, pager, next" small
          :total="memberWalletLogsTotal" :page-size="memberWalletLogsPageSize"
          v-model:current-page="memberWalletLogsPage"
          @current-change="loadMemberWalletLogs"
        />
        <el-button @click="showWalletLogs=false" style="margin-left:auto">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 调整余额 Dialog -->
    <el-dialog v-model="showWalletAdjust" width="420px" destroy-on-close>
      <template #header>调整余额 — {{ walletTarget?.nickname || walletTarget?.phone }}</template>
      <el-form label-width="80px">
        <el-form-item label="当前余额">
          <span style="font-weight:600;font-size:16px;color:var(--primary)">¥{{ Number(walletTarget?.wallet_balance || 0).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="调整方式">
          <el-radio-group v-model="walletForm.action">
            <el-radio-button value="add">充值/增加</el-radio-button>
            <el-radio-button value="sub">扣减</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="walletForm.amount" :min="0.01" :precision="2" :step="10" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注说明" required>
          <el-input v-model="walletForm.remark" placeholder="请输入操作原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showWalletAdjust=false">取消</el-button>
        <el-button type="primary" @click="submitWalletAdjust" :loading="walletSaving">确认</el-button>
      </template>
    </el-dialog>

    <!-- 调整会员等级 Dialog -->
    <el-dialog v-model="showLevelAdjust" width="460px" destroy-on-close>
      <template #header>
        <span>调整会员等级 — {{ levelTarget?.nickname || levelTarget?.phone }}</span>
      </template>
      <el-form label-width="80px">
        <el-form-item label="当前等级">
          <el-tag size="default" :type="levelType(levelTarget?.level)">
            {{ levelTarget?.level_name || levelLabel(levelTarget?.level) }}
          </el-tag>
          <span v-if="levelTarget?.level_name && levelTarget?.level !== undefined" style="margin-left:8px;color:var(--text-secondary);font-size:12px">（Lv.{{ levelTarget.level }}）</span>
        </el-form-item>
        <el-form-item label="目标等级" required>
          <el-select v-model="levelAdjForm.targetLevel" placeholder="请选择目标等级" style="width:100%">
            <el-option
              v-for="lv in levels"
              :key="lv.level"
              :label="`${lv.name}（Lv.${lv.level}）`"
              :value="lv.level"
              :disabled="lv.level === levelTarget?.level"
            >
              <span>{{ lv.name }}</span>
              <span style="float:right;color:var(--text-secondary);font-size:12px">Lv.{{ lv.level }}</span>
            </el-option>
          </el-select>
          <div v-if="levelAdjForm.targetLevel && levelTarget" class="level-change-preview">
            <span>{{ levelTarget.level_name || levelLabel(levelTarget.level) }}</span>
            <el-icon style="margin:0 6px"><Right /></el-icon>
            <span>{{ levels.find(l => l.level === levelAdjForm.targetLevel)?.name || '—' }}</span>
            <el-tag
              v-if="levelAdjForm.targetLevel > levelTarget.level"
              size="small"
              type="success"
              style="margin-left:8px"
            >升级</el-tag>
            <el-tag
              v-if="levelAdjForm.targetLevel < levelTarget.level"
              size="small"
              type="danger"
              style="margin-left:8px"
            >降级</el-tag>
          </div>
        </el-form-item>
        <el-form-item label="调整原因" required>
          <el-input
            v-model="levelAdjForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入调整原因（必填，将记录到操作日志）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item v-if="levelAdjForm.targetLevel < levelTarget?.level" label="降级说明">
          <el-alert
            title="请注意：降级后会员将立即失去原等级对应的折扣、积分倍率等权益，已获取的历史积分不会扣除。"
            type="warning"
            show-icon
            :closable="false"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLevelAdjust=false">取消</el-button>
        <el-button type="primary" @click="submitLevelAdjust" :loading="levelAdjSaving">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 单会员积分明细 Dialog -->
    <el-dialog v-model="showPointsLogs" width="650px" destroy-on-close>
      <template #header>
        <span>积分明细 — {{ logsTarget?.nickname || logsTarget?.phone }}</span>
        <el-tag style="margin-left:12px" size="small">当前积分：{{ logsTarget?.points }}</el-tag>
      </template>
      <el-table :data="pointsLogs" v-loading="logsLoading" stripe style="width:100%" max-height="420px">
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ fmtDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="logTypeTag(row.type)">{{ logTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="积分变动" width="100">
          <template #default="{ row }">
            <span :style="{ color: row.points > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }">
              {{ row.points > 0 ? '+' : '' }}{{ row.points }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="余额" width="80" prop="balance" />
        <el-table-column label="备注" min-width="160">
          <template #default="{ row }">{{ row.remark || '-' }}</template>
        </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
        <el-pagination
          v-if="logsTotal > logsPageSize"
          background layout="prev, pager, next" small
          :total="logsTotal" :page-size="logsPageSize"
          v-model:current-page="logsPage"
          @current-change="loadPointsLogs"
        />
        <el-button @click="showPointsLogs=false" style="margin-left:auto">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 调整积分 Dialog -->
    <el-dialog v-model="showPoints" width="420px" destroy-on-close>
      <template #header>调整积分 — {{ pointsTarget?.nickname || pointsTarget?.phone }}</template>
      <el-form label-width="80px">
        <el-form-item label="当前积分">
          <span style="font-weight:600;font-size:16px">{{ pointsTarget?.points }}</span>
        </el-form-item>
        <el-form-item label="调整方式">
          <el-radio-group v-model="pointsForm.action">
            <el-radio-button value="add">增加</el-radio-button>
            <el-radio-button value="sub">扣除</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="积分数量">
          <el-input-number v-model="pointsForm.points" :min="1" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注说明" required>
          <el-input v-model="pointsForm.remark" placeholder="请输入操作原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPoints=false">取消</el-button>
        <el-button type="primary" @click="submitPoints" :loading="pointsSaving">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { User, Plus, Lightning, CreditCard, Coin, TrendCharts, Goods, SetUp, Wallet, Money, Right, ArrowDown } from '@element-plus/icons-vue'
import {
  getMemberStats, getMembers, adjustPoints, setMemberStatus, deleteMember,
  getPointsLogs, getPointsStats, getAllPointsLogs,
  getLevels, createLevel, updateLevel, deleteLevel,
  getWalletStats, getAllWalletLogs, adjustWallet, getMemberWalletLogs,
  adjustLevel
} from '@/api/member'
import { getSettings, saveSettings } from '@/api/system'
import { uploadToCos } from '@/api/upload'

const toast   = inject('toast')
const router  = useRouter()
const activeTab = ref('members')

// ═══════════════════ 会员列表相关 ═══════════════════
const loading = ref(true)
const members = ref([])
const total   = ref(0)
const page    = ref(1)
const pageSize = 15
const stats   = ref({})
const filter  = ref({ keyword: '', level: '', status: '' })

const memberKpis = computed(() => [
  { label: '会员总数', value: stats.value.total ?? '--', icon: markRaw(User), color: '#dbeafe' },
  { label: '本月新增', value: stats.value.newThisMonth ?? '--', icon: markRaw(Plus), color: '#dcfce7' },
  { label: '活跃会员', value: stats.value.active ?? '--', icon: markRaw(Lightning), color: '#fef3c7' },
  { label: '累计消费（元）', value: stats.value.totalRevenue != null ? `¥${Number(stats.value.totalRevenue).toLocaleString()}` : '--', icon: markRaw(CreditCard), color: '#f3e8ff' },
])

const levelMap = { 1: ['铜卡', 'warning'], 2: ['银卡', 'info'], 3: ['金卡', 'warning'], 4: ['铂金', ''] }
const levelLabel = (l) => levelMap[l]?.[0] || '普通'
const levelType = (l) => levelMap[l]?.[1] || 'info'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'
const fmtDateTime = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  const Y = dt.getFullYear()
  const M = String(dt.getMonth() + 1).padStart(2, '0')
  const D = String(dt.getDate()).padStart(2, '0')
  const h = String(dt.getHours()).padStart(2, '0')
  const m = String(dt.getMinutes()).padStart(2, '0')
  const s = String(dt.getSeconds()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

const logTypeLabel = (t) => ({
  earn: '消费获得', use: '积分抵扣', adjust: '人工调整', expire: '积分过期', refund: '退款返还', exchange: '积分兑换'
}[t] || t)
const logTypeTag = (t) => ({
  earn: 'success', use: 'danger', adjust: 'warning', expire: 'info', refund: '', exchange: 'info'
}[t] || 'info')

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize, ...filter.value }
    if (!params.status) delete params.status
    if (!params.level) delete params.level
    const res = await getMembers(params)
    members.value = res.data?.list || []
    total.value   = res.data?.total || 0
  } catch { toast?.error('加载失败') }
  loading.value = false
}

onMounted(async () => {
  try { const s = await getMemberStats(); stats.value = s.data || {} } catch {}
  load()
})

// ═══════════════════ 积分管理 Tab ═══════════════════
const pointsStatsData = ref({})
const loadingSettings = ref(false)
const savingSettings = ref(false)
const pointsSettings = ref({ points_per_yuan: 1, points_to_yuan: 100, points_deduct_enabled: 1 })

// 全局积分流水
const allPointsLogs = ref([])
const allLogsLoading = ref(false)
const allLogsTotal = ref(0)
const allLogsPage = ref(1)
const allLogsPageSize = 15
const allLogsFilter = ref({ keyword: '', type: '' })

const pointsKpis = computed(() => {
  const d = pointsStatsData.value
  return [
    { label: '全平台积分余额', value: d.totalPoints?.toLocaleString() ?? '--', icon: markRaw(Coin), color: '#dbeafe' },
    { label: '累计发放积分', value: d.totalEarned?.toLocaleString() ?? '--', icon: markRaw(TrendCharts), color: '#dcfce7' },
    { label: '累计使用积分', value: d.totalUsed?.toLocaleString() ?? '--', icon: markRaw(Goods), color: '#fef3c7' },
    { label: '人工调整积分', value: d.totalAdjusted?.toLocaleString() ?? '--', icon: markRaw(SetUp), color: '#f3e8ff' },
  ]
})

function onTabChange(tab) {
  if (tab === 'points') {
    loadPointsTab()
  } else if (tab === 'wallet') {
    loadWalletTab()
  } else if (tab === 'levels') {
    loadLevelsData()
  }
}

async function loadPointsTab() {
  // 加载积分统计
  try { const res = await getPointsStats(); pointsStatsData.value = res.data || {} } catch {}
  // 加载积分设置
  loadingSettings.value = true
  try {
    const res = await getSettings()
    const pointsGroup = res.data?.points || []
    for (const item of pointsGroup) {
      if (item.key in pointsSettings.value) {
        pointsSettings.value[item.key] = Number(item.value)
      }
    }
  } catch {}
  loadingSettings.value = false
  // 加载全局流水
  loadAllPointsLogs()
}

async function savePointsSettings() {
  savingSettings.value = true
  try {
    await saveSettings({
      points_per_yuan: String(pointsSettings.value.points_per_yuan),
      points_to_yuan: String(pointsSettings.value.points_to_yuan),
      points_deduct_enabled: String(pointsSettings.value.points_deduct_enabled),
    })
    toast?.success('积分设置已保存')
  } catch (e) { toast?.error(e?.msg || '保存失败') }
  savingSettings.value = false
}

async function loadAllPointsLogs() {
  allLogsLoading.value = true
  try {
    const params = { page: allLogsPage.value, pageSize: allLogsPageSize }
    if (allLogsFilter.value.type) params.type = allLogsFilter.value.type
    if (allLogsFilter.value.keyword) params.keyword = allLogsFilter.value.keyword
    const res = await getAllPointsLogs(params)
    allPointsLogs.value = res.data?.list || []
    allLogsTotal.value = res.data?.total || 0
  } catch { toast?.error('加载积分流水失败') }
  allLogsLoading.value = false
}

// ═══════════════════ 余额管理 Tab ═══════════════════
const walletStatsData = ref({})
const allWalletLogs = ref([])
const walletLogsLoading = ref(false)
const walletLogsTotal = ref(0)
const walletLogsPage = ref(1)
const walletLogsPageSize = 15
const walletLogsFilter = ref({ keyword: '', type: '' })

const walletTypeLabel = (t) => ({
  recharge: '充值', consume: '消费', refund: '退款', bonus: '赠送'
}[t] || t)
const walletTypeTag = (t) => ({
  recharge: 'success', consume: 'danger', refund: 'warning', bonus: ''
}[t] || 'info')

const walletKpis = computed(() => {
  const d = walletStatsData.value
  return [
    { label: '全平台余额总计', value: d.totalBalance != null ? `¥${Number(d.totalBalance).toLocaleString()}` : '--', icon: markRaw(Wallet), color: '#dbeafe' },
    { label: '累计充值', value: d.totalRecharge != null ? `¥${Number(d.totalRecharge).toLocaleString()}` : '--', icon: markRaw(Plus), color: '#dcfce7' },
    { label: '累计消费', value: d.totalConsume != null ? `¥${Number(d.totalConsume).toLocaleString()}` : '--', icon: markRaw(Money), color: '#fef3c7' },
    { label: '累计赠送', value: d.totalBonus != null ? `¥${Number(d.totalBonus).toLocaleString()}` : '--', icon: markRaw(Coin), color: '#f3e8ff' },
  ]
})

async function loadWalletTab() {
  try { const res = await getWalletStats(); walletStatsData.value = res.data || {} } catch {}
  loadAllWalletLogs()
}

async function loadAllWalletLogs() {
  walletLogsLoading.value = true
  try {
    const params = { page: walletLogsPage.value, pageSize: walletLogsPageSize }
    if (walletLogsFilter.value.type) params.type = walletLogsFilter.value.type
    if (walletLogsFilter.value.keyword) params.keyword = walletLogsFilter.value.keyword
    const res = await getAllWalletLogs(params)
    allWalletLogs.value = res.data?.list || []
    walletLogsTotal.value = res.data?.total || 0
  } catch { toast?.error('加载余额流水失败') }
  walletLogsLoading.value = false
}

// 单会员余额明细
const showWalletLogs = ref(false)
const walletLogsTarget = ref(null)
const memberWalletLogs = ref([])
const memberWalletLogsLoading = ref(false)
const memberWalletLogsTotal = ref(0)
const memberWalletLogsPage = ref(1)
const memberWalletLogsPageSize = 15

function openWalletLogs(m) {
  walletLogsTarget.value = m
  memberWalletLogsPage.value = 1
  showWalletLogs.value = true
  loadMemberWalletLogs()
}

async function loadMemberWalletLogs() {
  memberWalletLogsLoading.value = true
  try {
    const res = await getMemberWalletLogs(walletLogsTarget.value.id, { page: memberWalletLogsPage.value, pageSize: memberWalletLogsPageSize })
    memberWalletLogs.value = res.data?.list || []
    memberWalletLogsTotal.value = res.data?.total || 0
  } catch { toast?.error('加载余额明细失败') }
  memberWalletLogsLoading.value = false
}

// 调整余额
const showWalletAdjust = ref(false)
const walletTarget = ref(null)
const walletSaving = ref(false)
const walletForm = ref({ action: 'add', amount: null, remark: '' })

function openWalletAdjust(m) {
  walletTarget.value = m
  walletForm.value = { action: 'add', amount: null, remark: '' }
  showWalletAdjust.value = true
}

async function submitWalletAdjust() {
  if (!walletForm.value.amount) { toast?.error('请输入金额'); return }
  if (!walletForm.value.remark?.trim()) { toast?.error('请输入备注说明'); return }
  walletSaving.value = true
  try {
    await adjustWallet(walletTarget.value.id, {
      action: walletForm.value.action,
      amount: walletForm.value.amount,
      remark: walletForm.value.remark.trim()
    })
    toast?.success('余额调整成功')
    showWalletAdjust.value = false
    load()
    // 同步刷新弹窗
    if (showWalletLogs.value && walletLogsTarget.value?.id === walletTarget.value?.id) {
      loadMemberWalletLogs()
    }
    // 刷新余额管理 Tab 数据
    if (activeTab.value === 'wallet') {
      getWalletStats().then(res => { walletStatsData.value = res.data || {} }).catch(() => {})
      loadAllWalletLogs()
    }
  } catch (e) { toast?.error(e?.msg || '操作失败') }
  walletSaving.value = false
}

// ═══════════════════ 手动调整会员等级 ═══════════════════
const showLevelAdjust = ref(false);
const levelTarget = ref(null);
const levelAdjSaving = ref(false);
const levelAdjForm = ref({ targetLevel: null, remark: '' });

function openLevelAdjust(m) {
  levelTarget.value = m;
  levelAdjForm.value = { targetLevel: null, remark: '' };
  showLevelAdjust.value = true;
  // 确保等级列表已加载
  if (!levels.value.length) loadLevelsData();
}

async function submitLevelAdjust() {
  if (!levelAdjForm.value.targetLevel) { toast?.error('请选择目标等级'); return; }
  if (!levelAdjForm.value.remark?.trim()) { toast?.error('请输入调整原因'); return; }
  levelAdjSaving.value = true;
  try {
    const res = await adjustLevel(levelTarget.value.id, {
      targetLevel: levelAdjForm.value.targetLevel,
      remark: levelAdjForm.value.remark.trim(),
    });
    toast?.success(res.msg || '等级调整成功');
    showLevelAdjust.value = false;
    load(); // 刷新会员列表
  } catch (e) { toast?.error(e?.msg || '操作失败'); }
  levelAdjSaving.value = false;
}

// ═══════════════════ 等级管理 Tab ═══════════════════
const levels = ref([])
const levelsLoading = ref(false)
const showLevelModal = ref(false)
const editingLevel = ref(null)
const levelSaving = ref(false)
const levelForm = ref({})

// 根据基础汇率计算说明文字
const deductDesc = (rate) => {
  const r = Number(rate)
  if (!r || isNaN(r) || r <= 0) return '同基础汇率'
  const base = pointsSettings.value.points_to_yuan || 100
  const effective = Math.round(base / r)
  return `${effective}积分=1元`
}

async function loadLevelsData() {
  levelsLoading.value = true
  try {
    const res = await getLevels()
    levels.value = res.data || []
  } catch { toast?.error('加载等级数据失败') }
  levelsLoading.value = false
  // 确保积分设置已加载（用于 deductDesc 计算）
  try {
    const res = await getSettings()
    const pointsGroup = res.data?.points || []
    for (const item of pointsGroup) {
      if (item.key in pointsSettings.value) {
        pointsSettings.value[item.key] = Number(item.value)
      }
    }
  } catch {}
}

function isImageUrl(str) {
  return /^https?:\/\//.test(str) || /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(str)
}
function ensureProtocol(url) {
  if (!url) return url
  return /^https?:\/\//.test(url) ? url : `https://${url}`
}
async function handleIconUpload(file) {
  try {
    const url = await uploadToCos(file, 'icons/', (p) => console.log('上传进度:', p + '%'))
    levelForm.value.icon = ensureProtocol(url)
    toast?.success('图标上传成功')
  } catch (e) {
    toast?.error('图标上传失败: ' + (e.message || e))
  }
  return false // 阻止 el-upload 默认上传
}
function openCreateLevel() {
  editingLevel.value = null
  levelForm.value = {
    level: (levels.value.length ? Math.max(...levels.value.map(l => l.level)) + 1 : 1),
    name: '', icon: '⭐', color: '#999',
    minNights: 0, minPoints: 0,
    discount: 1.00, pointsRate: 1.0, deductRate: 1.0
  }
  showLevelModal.value = true
}

function openEditLevel(lv) {
  editingLevel.value = lv
  levelForm.value = {
    level: lv.level,
    name: lv.name, icon: lv.icon, color: lv.color,
    minNights: lv.min_nights, minPoints: lv.min_points,
    discount: Number(lv.discount), pointsRate: Number(lv.points_rate), deductRate: Number(lv.deduct_rate)
  }
  showLevelModal.value = true
}

async function saveLevel() {
  if (!levelForm.value.name) { toast?.error('请填写等级名称'); return }
  levelSaving.value = true
  try {
    if (editingLevel.value) {
      await updateLevel(editingLevel.value.id, levelForm.value)
      toast?.success('等级更新成功')
    } else {
      await createLevel(levelForm.value)
      toast?.success('等级创建成功')
    }
    showLevelModal.value = false
    loadLevelsData()
  } catch (e) { toast?.error(e?.msg || '操作失败') }
  levelSaving.value = false
}

async function doDeleteLevel(lv) {
  try {
    await ElMessageBox.confirm(`确定删除等级「${lv.name}」吗？`, '确认删除', { type: 'warning' })
    await deleteLevel(lv.id)
    toast?.success('等级已删除')
    loadLevelsData()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '删除失败') }
}

// ═══════════════════ 单会员积分明细弹窗 ═══════════════════
const showPointsLogs = ref(false)
const logsTarget = ref(null)
const pointsLogs = ref([])
const logsLoading = ref(false)
const logsTotal = ref(0)
const logsPage = ref(1)
const logsPageSize = 15

// 查看会员订单 → 跳转到订单列表页并按用户ID筛选
function viewMemberOrders(m) {
  router.push({ path: '/orders', query: { userId: m.user_id } });
}

// 下拉菜单操作分发
function handleMemberAction(cmd, row) {
  switch (cmd) {
    case 'points':     openPoints(row); break;
    case 'walletLogs': openWalletLogs(row); break;
    case 'wallet':     openWalletAdjust(row); break;
    case 'level':      openLevelAdjust(row); break;
    case 'ban':        toggleBan(row); break;
    case 'delete':     removeMember(row); break;
  }
}

function openPointsLogs(m) {
  logsTarget.value = m
  logsPage.value = 1
  showPointsLogs.value = true
  loadPointsLogs()
}

async function loadPointsLogs() {
  logsLoading.value = true
  try {
    const res = await getPointsLogs(logsTarget.value.id, { page: logsPage.value, pageSize: logsPageSize })
    pointsLogs.value = res.data?.list || []
    logsTotal.value = res.data?.total || 0
  } catch { toast?.error('加载积分明细失败') }
  logsLoading.value = false
}

// ═══════════════════ 调整积分 ═══════════════════
const pointsTarget = ref(null)
const showPoints = ref(false)
const pointsSaving = ref(false)
const pointsForm = ref({ action: 'add', points: null, remark: '' })

function openPoints(m) {
  pointsTarget.value = m
  pointsForm.value = { action: 'add', points: null, remark: '' }
  showPoints.value = true
}

async function submitPoints() {
  if (!pointsForm.value.points) { toast?.error('请输入积分数量'); return }
  if (!pointsForm.value.remark?.trim()) { toast?.error('请输入备注说明'); return }
  pointsSaving.value = true
  try {
    const pts = pointsForm.value.action === 'sub'
      ? -Math.abs(pointsForm.value.points)
      : Math.abs(pointsForm.value.points)
    await adjustPoints(pointsTarget.value.id, {
      points: pts,
      remark: pointsForm.value.remark.trim()
    })
    toast?.success('积分调整成功')
    showPoints.value = false
    load()
    if (showPointsLogs.value && logsTarget.value?.id === pointsTarget.value?.id) {
      loadPointsLogs()
    }
    // 刷新积分管理 Tab 数据
    if (activeTab.value === 'points') {
      getPointsStats().then(res => { pointsStatsData.value = res.data || {} }).catch(() => {})
      loadAllPointsLogs()
    }
  } catch (e) { toast?.error(e?.msg || '操作失败') }
  pointsSaving.value = false
}

// ═══════════════════ 封禁/删除 ═══════════════════
async function toggleBan(m) {
  const action = m.status === 1 ? '封禁' : '解封'
  try {
    await ElMessageBox.confirm(`确认${action}会员 ${m.nickname || m.phone}？`, `${action}确认`, { type: 'warning' })
    await setMemberStatus(m.id, { status: m.status === 1 ? 0 : 1 })
    toast?.success(`${action}成功`); load()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '操作失败') }
}

async function removeMember(m) {
  try {
    await ElMessageBox.confirm(`确定删除会员「${m.nickname || m.phone}」吗？此操作不可撤销，将同时删除该用户账号。`, '确认删除', { type: 'warning' })
    await deleteMember(m.id)
    toast?.success('会员已删除'); load()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '删除失败') }
}
</script>

<style scoped>
/* 操作列按钮与下拉菜单对齐 */
:deep(td .el-dropdown) { vertical-align: middle; }
.kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.kpi-value { font-size: 22px; font-weight: 700; }
.kpi-label { font-size: 12px; color: var(--text-secondary); }
.field-inline-hint { margin-left: 12px; font-size: 12px; color: #94a3b8; }
.level-change-preview {
  display: flex;
  align-items: center;
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
