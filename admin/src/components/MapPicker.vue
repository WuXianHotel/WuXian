<template>
  <div class="map-picker">
    <div class="map-picker__coords">
      <el-tag size="small" type="info">经度: {{ lat }}</el-tag>
      <el-tag size="small" type="info">纬度: {{ lng }}</el-tag>
      <span v-if="addr" class="map-picker__addr">{{ addr }}</span>
    </div>
    <div ref="mapEl" class="map-picker__map"></div>
    <p class="map-picker__hint">点击地图选择位置，拖动标记微调坐标</p>
    <div class="map-picker__search">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索地址..."
        clearable
        @keyup.enter="searchPlace"
        style="width:240px"
      >
        <template #append>
          <el-button @click="searchPlace" :loading="searching">搜索</el-button>
        </template>
      </el-input>
    </div>
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
const searchKeyword = ref('');
const searching = ref(false);

let map = null;
let marker = null;
let geocoder = null;
let autocomplete = null;
let scriptLoaded = false;

function loadAMapScript() {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      scriptLoaded = true;
      return resolve();
    }
    // 高德地图 JS API 2.0 安全密钥（必须在加载 script 前设置）
    window._AMapSecurityConfig = {
      securityJsCode: '6cdeb4d9f4349e120981661822d98e45',
    };
    const key = '8061c1eacdcbc43c9323446963de754b';
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geocoder,AMap.AutoComplete`;
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('高德地图加载失败'));
    document.head.appendChild(script);
  });
}

function reverseGeocode(latVal, lngVal) {
  if (!geocoder) return;
  geocoder.getAddress([lngVal, latVal], (status, result) => {
    if (status === 'complete' && result.info === 'OK') {
      addr.value = result.recomp.formattedAddress;
      emit('update:address', addr.value);
    }
  });
}

async function initMap() {
  try {
    await loadAMapScript();

    if (!mapEl.value) return;

    map = new window.AMap.Map(mapEl.value, {
      center: [props.longitude, props.latitude],
      zoom: 16,
      resizeEnable: true,
    });

    // 地理编码
    window.AMap.plugin('AMap.Geocoder', () => {
      geocoder = new window.AMap.Geocoder({});
      reverseGeocode(props.latitude, props.longitude);
    });

    // 标记
    marker = new window.AMap.Marker({
      position: [props.longitude, props.latitude],
      draggable: true,
      cursor: 'move',
    });
    map.add(marker);

    // 拖动结束后更新
    marker.on('dragend', () => {
      const pos = marker.getPosition();
      lat.value = +pos.lat.toFixed(6);
      lng.value = +pos.lng.toFixed(6);
      emit('update:latitude', lat.value);
      emit('update:longitude', lng.value);
      reverseGeocode(lat.value, lng.value);
    });

    // 点击地图移动标记
    map.on('click', (e) => {
      marker.setPosition(e.lnglat);
      lat.value = +e.lnglat.lat.toFixed(6);
      lng.value = +e.lnglat.lng.toFixed(6);
      emit('update:latitude', lat.value);
      emit('update:longitude', lng.value);
      reverseGeocode(lat.value, lng.value);
    });
  } catch (e) {
    console.warn('[MapPicker] 地图加载失败:', e.message);
  }
}

// 搜索地址
function searchPlace() {
  if (!searchKeyword.value.trim() || !window.AMap) return;
  searching.value = true;

  window.AMap.plugin('AMap.AutoComplete', () => {
    autocomplete = new window.AMap.AutoComplete({
      city: '柳州',
      citylimit: false,
    });
    autocomplete.search(searchKeyword.value, (status, result) => {
      searching.value = false;
      if (status === 'complete' && result.info === 'OK' && result.tips.length) {
        const tip = result.tips[0];
        if (tip.location) {
          const lngVal = +tip.location.lng.toFixed(6);
          const latVal = +tip.location.lat.toFixed(6);
          map.setCenter([lngVal, latVal]);
          marker.setPosition([lngVal, latVal]);
          lat.value = latVal;
          lng.value = lngVal;
          emit('update:latitude', latVal);
          emit('update:longitude', lngVal);
          addr.value = tip.name + (tip.district ? ' ' + tip.district : '');
          emit('update:address', addr.value);
        }
      }
    });
  });
}

// 监听外部经纬度变化
watch(() => [props.latitude, props.longitude], ([newLat, newLng]) => {
  lat.value = newLat;
  lng.value = newLng;
  if (map && marker) {
    map.setCenter([newLng, newLat]);
    marker.setPosition([newLng, newLat]);
    reverseGeocode(newLat, newLng);
  }
});

onMounted(() => { initMap(); });

onBeforeUnmount(() => {
  if (map) { map.destroy(); map = null; }
});
</script>

<style scoped>
.map-picker__coords {
  display: flex; gap: 8px; align-items: center;
  margin-bottom: 8px; flex-wrap: wrap;
}
.map-picker__addr {
  font-size: 12px; color: #94a3b8; max-width: 300px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.map-picker__map {
  width: 100%; height: 360px; border-radius: 8px;
  border: 1px solid var(--border, #e4e7ed);
}
.map-picker__hint {
  font-size: 11px; color: #94a3b8; margin-top: 6px;
}
.map-picker__search {
  margin-top: 10px;
}
</style>
