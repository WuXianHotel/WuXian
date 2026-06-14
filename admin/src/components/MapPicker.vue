<template>
  <div class="map-picker">
    <div class="map-picker__coords">
      <span>经度: {{ lat }}</span>
      <span>纬度: {{ lng }}</span>
      <span v-if="addr">地址: {{ addr }}</span>
    </div>
    <div ref="mapEl" class="map-picker__map"></div>
    <p class="map-picker__hint">点击地图选择位置，或拖动标记调整经纬度</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  latitude: { type: Number, default: 24.3282 },
  longitude: { type: Number, default: 109.2622 },
});

const emit = defineEmits(['update:latitude', 'update:longitude', 'update:address']);

const mapEl = ref(null);
const lat = ref(props.latitude);
const lng = ref(props.longitude);
const addr = ref('');

let map = null;
let marker = null;

async function reverseGeocode(latVal, lngVal) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latVal}&lon=${lngVal}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'zh-CN' } });
    const data = await res.json();
    if (data && data.display_name) {
      addr.value = data.display_name;
      emit('update:address', data.display_name);
    }
  } catch { /* ignore */ }
}

function initMap() {
  // 动态加载 Leaflet CSS
  if (!document.querySelector('#leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  // 动态加载 Leaflet JS
  const loadScript = () => new Promise((resolve) => {
    if (window.L) return resolve();
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  loadScript().then(() => {
    if (!mapEl.value) return;
    const L = window.L;

    map = L.map(mapEl.value, {
      center: [props.latitude, props.longitude],
      zoom: 16,
      attributionControl: false,
    });

    // 使用 CartoDB 浅色主题（国内访问顺畅，免 API Key）
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // 添加可拖动标记
    const icon = L.divIcon({
      className: 'map-picker__marker',
      html: '<div style="width:28px;height:28px;background:#e74c3c;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    marker = L.marker([props.latitude, props.longitude], {
      icon,
      draggable: true,
    }).addTo(map);

    // 拖动结束后更新坐标
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      lat.value = +pos.lat.toFixed(6);
      lng.value = +pos.lng.toFixed(6);
      emit('update:latitude', lat.value);
      emit('update:longitude', lng.value);
      reverseGeocode(lat.value, lng.value);
    });

    // 点击地图移动标记
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      lat.value = +e.latlng.lat.toFixed(6);
      lng.value = +e.latlng.lng.toFixed(6);
      emit('update:latitude', lat.value);
      emit('update:longitude', lng.value);
      reverseGeocode(lat.value, lng.value);
    });

    // 初次反向地理编码
    reverseGeocode(props.latitude, props.longitude);
  });
}

// 监听外部经纬度变化更新地图
watch(() => [props.latitude, props.longitude], ([newLat, newLng]) => {
  lat.value = newLat;
  lng.value = newLng;
  if (map && marker) {
    const pos = [newLat, newLng];
    map.setView(pos, map.getZoom());
    marker.setLatLng(pos);
  }
});

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null; }
});
</script>

<style scoped>
.map-picker__coords {
  display: flex; gap: 16px; font-size: 12px; color: #94a3b8;
  margin-bottom: 8px; flex-wrap: wrap;
}
.map-picker__map {
  width: 100%; height: 340px; border-radius: 8px;
  border: 1px solid var(--border, #e4e7ed);
}
.map-picker__hint {
  font-size: 11px; color: #94a3b8; margin-top: 6px;
}
</style>

<style>
/* 全局样式 - Leaflet 需要 */
.map-picker__marker {
  background: transparent !important;
  border: none !important;
}
</style>
