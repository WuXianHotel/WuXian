// pages/location/location.js
// 中转页：H5 通过 navigateTo 跳过来 → 打开原生地图 → 关闭后自动返回
Page({
  onLoad(options) {
    const lat = parseFloat(options.lat) || 24.315;
    const lng = parseFloat(options.lng) || 109.413;
    const name = decodeURIComponent(options.name || '柳州无限电竞酒店');
    const address = decodeURIComponent(options.addr || '');

    // 打开微信原生地图
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name,
      address,
      scale: 16,
      success: () => {
        // 地图关闭后自动返回 H5
        wx.navigateBack({ delta: 1 });
      },
      fail: () => {
        wx.navigateBack({ delta: 1 });
      },
    });
  },
});
