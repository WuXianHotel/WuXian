// custom-tab-bar/index.js
const app = getApp()

Component({
  data: {
    selected: 0,
    visible: false,      // 版本就绪后才显示
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/tab-home.png',
        selectedIconPath: '/images/tab-home-active.png',
      },
      {
        pagePath: '/pages/rooms/rooms',
        text: '探索',
        iconPath: '/images/tab-explore.png',
        selectedIconPath: '/images/tab-explore-active.png',
      },
      {
        pagePath: '/pages/orders/orders',
        text: '订单',
        iconPath: '/images/tab-order.png',
        selectedIconPath: '/images/tab-order-active.png',
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: '/images/tab-me.png',
        selectedIconPath: '/images/tab-me-active.png',
      },
    ],
  },

  lifetimes: {
    attached() {
      this.checkVersion()
    },
  },

  pageLifetimes: {
    show() {
      this.checkVersion()
    },
  },

  methods: {
    // 检查版本号，决定是否显示 tabBar
    checkVersion() {
      if (app.globalData.versionReady) {
        const show = app.globalData.appVersion !== '0.0.1'
        this.setData({ visible: show })
      } else {
        // 版本未就绪，隐藏
        this.setData({ visible: false })
        // 轮询等待
        let retries = 0
        const check = () => {
          if (app.globalData.versionReady) {
            const show = app.globalData.appVersion !== '0.0.1'
            this.setData({ visible: show })
            return
          }
          if (++retries > 50) return
          setTimeout(check, 100)
        }
        setTimeout(check, 100)
      }
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      if (this.data.selected === index) return
      wx.switchTab({ url: path })
    },
  },
})
