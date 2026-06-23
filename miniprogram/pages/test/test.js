// pages/test/test.js
// 支付中转页：从 H5 携带 wx.requestPayment 参数跳过来，调起支付后返回 H5

const app = getApp();

Page({
  data: {
    statusText: '',
  },

  onLoad(options) {
    // 从 globalData 取文案（app.onLaunch 已从服务端拉取）
    const t = app.globalData.payText || {};
    wx.setNavigationBarTitle({ title: t.navTitle || '' });

    try {
      const raw = options.p ? decodeURIComponent(options.p) : '';
      const orderNo = options.orderNo || '';
      const payParams = raw ? JSON.parse(raw) : null;

      if (!payParams || !payParams.paySign) {
        this.handleResult('error', t.paramsError || '', orderNo);
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
          const isCancel = err && err.errMsg && err.errMsg.indexOf('cancel') >= 0;
          this.handleResult(isCancel ? 'cancel' : 'fail', err && err.errMsg, orderNo);
        },
      });
    } catch (e) {
      console.error('[pay] 拉起支付异常:', e);
      this.handleResult('error', e.message || t.payError || '', options.orderNo || '');
    }
  },

  handleResult(result, msg, orderNo) {
    const t = app.globalData.payText || {};
    app.globalData.lastPayResult = { result, msg, orderNo, ts: Date.now() };

    this.setData({
      statusText:
        result === 'success' ? (t.success || '') :
        result === 'cancel' ? (t.cancel || '') :
        (t.fail || ''),
    });

    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 500);
  },
});
