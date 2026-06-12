#!/bin/bash

# ============================================================
# 一键部署脚本 - 柳州无限电竞酒店管理系统（前后端）
# 使用方式: chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
ADMIN_DIR="$PROJECT_ROOT/admin"
SERVICE_DIR="$PROJECT_ROOT/service"

# 日志函数
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 分隔线
divider() { echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"; }

# 检查依赖
check_dependencies() {
  divider
  info "检查系统依赖..."

  if ! command -v node &> /dev/null; then
    error "未检测到 Node.js，请先安装 Node.js 18+"
  fi

  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 版本需要 >= 18，当前版本: $(node -v)"
  fi
  success "Node.js $(node -v) ✓"

  if ! command -v npm &> /dev/null; then
    error "未检测到 npm"
  fi
  success "npm $(npm -v) ✓"

  if command -v mysql &> /dev/null; then
    success "MySQL client ✓"
  else
    warn "未检测到 MySQL 客户端，跳过数据库连接检查"
  fi
}

# 部署模式选择
select_mode() {
  divider
  echo ""
  echo -e "${GREEN}请选择部署模式：${NC}"
  echo ""
  echo "  1) 本地开发部署（启动本地服务）"
  echo "  2) 生产构建（构建前端 + H5 + 启动后端）"
  echo "  3) 仅构建前端（管理后台）"
  echo "  4) 仅构建 H5（小程序 WebView）"
  echo "  5) 仅启动后端"
  echo "  6) 初始化项目（安装依赖 + 初始化数据库）"
  echo ""
  read -p "请输入选项 [1-6]: " mode
  echo ""
}

# 安装依赖
install_deps() {
  info "安装后端依赖..."
  cd "$SERVICE_DIR"
  npm install --production=false
  success "后端依赖安装完成"

  info "安装前端依赖..."
  cd "$ADMIN_DIR"
  npm install
  success "前端依赖安装完成"
}

# 检查环境变量
check_env() {
  local dir=$1
  local name=$2

  if [ ! -f "$dir/.env" ]; then
    if [ -f "$dir/.env.example" ]; then
      warn "${name} 未找到 .env 文件，从 .env.example 复制..."
      cp "$dir/.env.example" "$dir/.env"
      warn "请编辑 $dir/.env 填写实际配置"
      return 1
    else
      error "${name} 缺少 .env 和 .env.example 文件"
    fi
  fi
  success "${name} 环境变量文件 ✓"
  return 0
}

# 初始化数据库
init_database() {
  info "初始化数据库..."
  cd "$SERVICE_DIR"

  if npm run init-db; then
    success "数据库初始化完成"
  else
    error "数据库初始化失败，请检查 .env 中的数据库配置"
  fi
}

# 启动后端服务
start_service() {
  info "启动后端服务..."
  cd "$SERVICE_DIR"

  # 检查端口是否被占用
  local port=$(grep "^PORT=" .env 2>/dev/null | cut -d= -f2)
  port=${port:-3000}

  if lsof -i:"$port" &> /dev/null; then
    warn "端口 $port 已被占用，尝试终止..."
    lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi

  if [ "$1" = "production" ]; then
    NODE_ENV=production nohup node app.js > "$PROJECT_ROOT/service.log" 2>&1 &
    echo $! > "$PROJECT_ROOT/.service.pid"
    success "后端服务已启动（PID: $(cat $PROJECT_ROOT/.service.pid)，端口: $port）"
    info "日志文件: $PROJECT_ROOT/service.log"
  else
    info "后端服务启动在端口: $port"
    npm run dev &
    echo $! > "$PROJECT_ROOT/.service.pid"
    success "后端开发服务已启动（PID: $(cat $PROJECT_ROOT/.service.pid)）"
  fi
}

# 构建前端
build_admin() {
  info "构建管理后台..."
  cd "$ADMIN_DIR"

  # 检查 VITE_API_BASE 是否设置
  if [ -f .env ] && grep -q "VITE_API_BASE=" .env; then
    local api_base=$(grep "VITE_API_BASE=" .env | cut -d= -f2)
    if [ -n "$api_base" ]; then
      info "API 地址: $api_base"
    else
      warn "VITE_API_BASE 未设置，前端将使用相对路径"
    fi
  fi

  npm run build
  success "管理后台构建完成，产物目录: $ADMIN_DIR/dist"
}

# 构建 H5（小程序 WebView SPA）
build_h5() {
  info "构建小程序 H5..."
  cd "$PROJECT_ROOT/h5"

  npm install
  npm run build
  success "H5 构建完成，产物目录: $PROJECT_ROOT/h5/dist"
}

# 启动前端开发服务
start_admin_dev() {
  info "启动前端开发服务..."
  cd "$ADMIN_DIR"
  npm run dev &
  echo $! > "$PROJECT_ROOT/.admin.pid"
  success "前端开发服务已启动（PID: $(cat $PROJECT_ROOT/.admin.pid)）"
}

# 停止所有服务
stop_services() {
  info "停止现有服务..."

  if [ -f "$PROJECT_ROOT/.service.pid" ]; then
    local pid=$(cat "$PROJECT_ROOT/.service.pid")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      info "已停止后端服务 (PID: $pid)"
    fi
    rm -f "$PROJECT_ROOT/.service.pid"
  fi

  if [ -f "$PROJECT_ROOT/.admin.pid" ]; then
    local pid=$(cat "$PROJECT_ROOT/.admin.pid")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      info "已停止前端服务 (PID: $pid)"
    fi
    rm -f "$PROJECT_ROOT/.admin.pid"
  fi
}

# 显示部署结果
show_result() {
  divider
  echo ""
  echo -e "${GREEN}  ✅ 部署完成！${NC}"
  echo ""

  if [ "$1" = "local" ]; then
    echo -e "  前端地址: ${BLUE}http://localhost:5173${NC}"
    echo -e "  后端地址: ${BLUE}http://localhost:3000${NC}"
    echo -e "  默认账号: ${YELLOW}admin${NC} / ${YELLOW}Admin@123${NC}"
    echo ""
    echo -e "  停止服务: ${YELLOW}./deploy.sh stop${NC}"
  elif [ "$1" = "production" ]; then
    local port=$(grep "^PORT=" "$SERVICE_DIR/.env" 2>/dev/null | cut -d= -f2)
    port=${port:-3000}
    echo -e "  后端地址: ${BLUE}http://localhost:$port${NC}"
    echo -e "  前端产物: ${BLUE}$ADMIN_DIR/dist${NC}"
    echo ""
    echo -e "  前端部署: 将 dist 目录上传到静态服务器或 Vercel"
    echo -e "  默认账号: ${YELLOW}admin${NC} / ${YELLOW}Admin@123${NC}"
    echo ""
    echo -e "  停止后端: ${YELLOW}./deploy.sh stop${NC}"
  fi

  divider
}

# 主函数
main() {
  echo ""
  divider
  echo -e "${GREEN}  🏨 柳州无限电竞酒店管理系统 - 一键部署${NC}"
  divider

  # 处理 stop 命令
  if [ "${1}" = "stop" ]; then
    stop_services
    success "所有服务已停止"
    exit 0
  fi

  check_dependencies
  select_mode

  case $mode in
    1)
      # 本地开发部署
      install_deps
      check_env "$SERVICE_DIR" "后端"
      check_env "$ADMIN_DIR" "前端"
      stop_services
      start_service "development"
      sleep 2
      start_admin_dev
      sleep 2
      show_result "local"
      ;;
    2)
      # 生产构建
      install_deps
      check_env "$SERVICE_DIR" "后端"
      check_env "$ADMIN_DIR" "前端"
      stop_services
      build_admin
      build_h5
      start_service "production"
      sleep 2
      show_result "production"
      ;;
    3)
      # 仅构建前端（管理后台）
      cd "$ADMIN_DIR"
      npm install
      check_env "$ADMIN_DIR" "前端"
      build_admin
      success "管理后台构建完成: $ADMIN_DIR/dist"
      ;;
    4)
      # 仅构建 H5
      build_h5
      success "H5 构建完成: $PROJECT_ROOT/h5/dist"
      ;;
    5)
      # 仅启动后端
      cd "$SERVICE_DIR"
      npm install --production=false
      check_env "$SERVICE_DIR" "后端"
      stop_services
      start_service "development"
      sleep 2
      local port=$(grep "^PORT=" "$SERVICE_DIR/.env" 2>/dev/null | cut -d= -f2)
      port=${port:-3000}
      success "后端已启动: http://localhost:$port"
      ;;
    6)
      # 初始化项目
      install_deps
      check_env "$SERVICE_DIR" "后端"
      local env_ok=$?
      if [ $env_ok -eq 0 ]; then
        init_database
      else
        warn "请先编辑 $SERVICE_DIR/.env 配置数据库信息，然后运行:"
        echo -e "  ${YELLOW}cd service && npm run init-db${NC}"
      fi
      success "项目初始化完成"
      ;;
    *)
      error "无效的选项: $mode"
      ;;
  esac
}

main "$@"
