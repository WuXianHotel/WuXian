// pages/test/test.js
// 支付中转页：从 H5 携带 wx.requestPayment 参数跳过来，调起支付后返回 H5
// H5 端通过 wx.miniProgram.navigateTo({ url: '/pages/test/test?p=<encoded>&orderNo=xxx' }) 进入

Page({
  data: {
    statusText: '正在拉起微信支付...',
  },

  onLoad(options) {
    try {
      // 解码 H5 透传过来的支付参数（注意：H5 端用 encodeURIComponent 编码过）
      const raw = options.p ? decodeURIComponent(options.p) : '';
      const orderNo = options.orderNo || '';
      const payParams = raw ? JSON.parse(raw) : null;

      if (!payParams || !payParams.paySign) {
        this.handleResult('error', '支付参数缺失', orderNo);
        return;
      }

      wx.requestPayment({
        timeStamp: String(payParams.timeStamp),
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType || 'RSA',
        paySign: payParams.paySign,
        success: () => {
          this.handleResult('success', '', orderNo);
        },
        fail: (err) => {
          // 用户取消：errMsg = 'requestPayment:fail cancel'
          const isCancel = err && err.errMsg && err.errMsg.indexOf('cancel') >= 0;
          this.handleResult(isCancel ? 'cancel' : 'fail', err && err.errMsg, orderNo);
        },
      });
    } catch (e) {
      console.error('[pay] 拉起支付异常:', e);
      this.handleResult('error', e.message || '调起支付异常', options.orderNo || '');
    }
  },

  // 支付结果回到 H5：通过 navigateBack 返回 web-view 页，
  // 同时把支付结果写到 globalData，h5.js 在 onShow 时下发给 H5（refresh hash 触发）
  handleResult(result, msg, orderNo) {
    const app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.lastPayResult = { result, msg, orderNo, ts: Date.now() };

    this.setData({
      statusText:
        result === 'success' ? '支付成功' :
        result === 'cancel' ? '已取消支付' :
        '支付失败',
    });

    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 500);
  },
});
