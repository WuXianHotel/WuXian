# 酒店小程序项目 交付文档

> 柳州无限电竞酒店 · 智慧酒店管理系统  
> 交付日期：2026-06-14

---

## 一、项目架构

```
GitHub → GitHub Actions → 腾讯云 Ubuntu 22.04 (42.193.192.228)
                              ├── Nginx 反向代理
                              ├── PM2 管理 Node.js 进程
                              └── MySQL 8.0 数据库

域名：https://wuxian-hotel.online
├── /api/*     → Node.js 后端 :3000
├── /admin/*   → 管理后台 SPA（Vue3 + Element Plus）
├── /h5/*      → 小程序 H5 SPA（Vue3 + Vite）
└── /          → 301 → /admin/
```

**小程序**：`app.json` 仅 `pages/h5/h5` 一个 WebView 页面，所有 UI 由 H5 承载。

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| **后端** | Node.js 18+ · Express · MySQL2 · JWT · bcryptjs |
| **管理后台** | Vue 3 · Element Plus · Vite · Pinia · Chart.js |
| **小程序 H5** | Vue 3 · Vite · Vue Router · Lucide 图标 |
| **部署** | GitHub Actions · PM2 · Nginx · 腾讯云 COS（图片存储） |
| **地图** | 高德 JS API 2.0（管理后台选点） + Leaflet 备用 |

---

## 三、服务器信息

- **IP**: `42.193.192.228`
- **SSH 用户**: `ubuntu` / `deploy`（统一用 `ubuntu`，`deploy` 有授权）
- **部署路径**: `/opt/hotel/`
  - `service/current` → 后端（PM2 运行）
  - `admin/current` → 管理后台静态文件
  - `h5/current` → H5 静态文件
  - `service/uploads/` → 上传文件
- **MySQL**: `root` 无密码 / socket 认证，数据库名 `hotel_miniprogram`
- **Nginx 配置**: `/etc/nginx/conf.d/hotel.conf`
- **PM2 进程**: `hotel-service`

---

## 四、需要重新配置的高德地图 Key

文件：`admin/src/components/MapPicker.vue`

当前 Key 为 `8061c1eacdcbc43c9323446963de754b`，安全密钥 `6cdeb4d9f4349e120981661822d98e45`。

若需更换，修改文件中以下两行：
```js
window._AMapSecurityConfig = { securityJsCode: '新安全密钥' };
const key = '新Key';
```

---

## 五、服务器上需要执行的 SQL 迁移

部署代码后，需 SSH 到服务器手动执行以下迁移（按此顺序）：

```bash
sudo mysql hotel_miniprogram < /opt/hotel/service/current/sql/migrate_member_levels.sql
sudo mysql hotel_miniprogram < /opt/hotel/service/current/sql/migrate_mall_type.sql
sudo mysql hotel_miniprogram < /opt/hotel/service/current/sql/migrate_banners.sql
```

首次部署时运行完整建表（已有数据不要执行）：
```bash
sudo mysql hotel_miniprogram < /opt/hotel/service/current/sql/schema.sql
```

---

## 六、常用运维命令

```bash
# 查看 PM2 状态
pm2 status

# 重启后端
pm2 restart hotel-service

# 查看后端日志
pm2 logs hotel-service

# 重载 Nginx
sudo nginx -t && sudo systemctl reload nginx

# 查看磁盘
df -h

# 数据库直连
sudo mysql hotel_miniprogram
```

---

## 七、CI/CD 自动部署

- 推送到 `main` 分支触发自动部署
- `admin/**` 文件变更 → 仅部署管理后台
- `h5/**` 文件变更 → 仅部署 H5
- `service/**` 文件变更 → 仅部署后端 + PM2 reload
- 每次部署保留最近 5 个版本，支持软链回滚

---

## 八、小程序上线前检查清单

| 检查项 | 状态 |
|---|---|
| 小程序后台业务域名白名单添加 `wuxian-hotel.online` | ☐ |
| 高德地图 Key 可用 | ☐ |
| 酒店基本信息已配置（名称/地址/电话/经纬度） | ☐ |
| Banner 轮播图已上传 | ☐ |
| SQL 迁移已执行 | ☐ |
| 审核模式切换为 `1.0.0`（正常模式） | ☐ |
| H5 页面所有接口正常访问 | ☐ |
| `index.html` 标题为「无限住」 | ☐ |
| vConsole 已关闭（`ENABLE_VCONSOLE=false`） | ☐ |

---

## 九、审核模式

在管理后台「系统设置 → 版本控制」中切换：
- `0.0.1` — 审核模式：隐藏 tabbar、搜索栏、快捷入口、预订按钮、房型跳转，仅展示酒店位置和 Banner
- `1.0.0` — 正常模式：全部功能

切换无需改代码或重新提交小程序。

---

## 十、账号密码

| 角色 | 默认账号 | 说明 |
|---|---|---|
| 超级管理员 | admin / 你修改后的密码 | 管理后台登录 |

> 管理员密码可在「系统设置 → 管理员列表 → 重置密码」修改。

---

## 十一、项目结构速览

```
hotel/
├── service/          # Node.js 后端
│   ├── routes/       # API 路由（admin/mp）
│   ├── config/       # DB/COS/log 配置
│   ├── middleware/    # 鉴权/日志/校验
│   └── sql/          # 建表 & 迁移脚本
├── admin/            # 管理后台（Vue3 + Element Plus）
│   └── src/views/    # 仪表盘/房型/订单/会员/商城/Banner/系统设置
├── h5/               # 小程序 WebView H5（Vue3 + Vite）
│   └── src/views/    # 首页/房型列表/详情/订单/会员/钱包/积分商城
├── miniprogram/      # 微信小程序壳
│   └── pages/h5/     # 单 WebView 页面 + 位置中转页
├── ops/              # 运维（Nginx/脚本/文档）
└── .github/workflows/ # CI/CD 工作流（6个）
```
