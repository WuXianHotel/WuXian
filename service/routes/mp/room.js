'use strict';
/**
 * 小程序端 · 房型
 * GET  /api/mp/rooms              房型列表（筛选+分页）
 * GET  /api/mp/rooms/:id          房型详情
 * GET  /api/mp/rooms/:id/calendar 价格日历（指定月份）
 */
const router = require('express').Router();
const { query } = require('../../config/db');
const { parsePager, ok, page } = require('../../middleware/helper');
const { mpAuth } = require('../../middleware/auth');
const { signUrls } = require('../../config/cos');

// ── 出口字段归一化（snake_case → camelCase，并平铺常用字段给前端） ───────────
function normalizeRoom(row) {
  if (!row) return row;
  // images 字段可能是 JSON 字符串
  let images = row.images;
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch { images = [images]; }
  }
  images = Array.isArray(images) ? images : [];
  // 签名 COS URL（私有读存储桶需要签名才能访问）
  images = signUrls(images);
  // facilities 同理
  let facilities = row.facilities;
  if (typeof facilities === 'string') {
    try { facilities = JSON.parse(facilities); } catch { facilities = []; }
  }
  facilities = Array.isArray(facilities) ? facilities : [];
  return {
    ...row,
    // 平铺给前端用的 camelCase 别名
    price:           row.base_price !== undefined ? Number(row.base_price) : undefined,
    basePrice:       row.base_price !== undefined ? Number(row.base_price) : undefined,
    holidayPrice:    row.holiday_price !== undefined ? Number(row.holiday_price) : undefined,
    bedType:         row.bed_type,
    floorInfo:       row.floor_info,
    maxGuests:       row.max_guests,
    pcCount:         row.pc_count,
    pcConfig:        row.pc_config,
    smokeFree:       row.smoke === 0 || row.smoke === false, // DB 里 smoke=1 表示允许吸烟，前端要的是"是否禁烟"
    reviewCount:     row.review_count ?? row.review_count_real,
    totalRooms:      row.total_rooms,
    availableRooms:  row.available_today !== undefined ? row.available_today : row.total_rooms,
    images,
    imageUrl:        images[0] || null,
    facilities,
  };
}

// ── GET /  房型列表 ───────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { keyword, bedType, minPrice, maxPrice, checkIn, checkOut, sortBy } = req.query;

    const conditions = ['rt.status = 1'];
    const params = [];

    if (keyword) {
      conditions.push('rt.name LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (bedType) {
      conditions.push('rt.bed_type = ?');
      params.push(bedType);
    }
    if (minPrice) {
      conditions.push('rt.base_price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      conditions.push('rt.base_price <= ?');
      params.push(Number(maxPrice));
    }

    // 检查日期可用性（有入住/离店日期时过滤已无库存的房型）
    if (checkIn && checkOut) {
      conditions.push(`rt.total_rooms > (
        SELECT COUNT(*) FROM orders o
        WHERE o.room_type_id = rt.id
          AND o.status IN (1,2)
          AND o.check_in_date  < ?
          AND o.check_out_date > ?
      )`);
      params.push(checkOut, checkIn);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const orderMap = { price_asc: 'rt.base_price ASC', price_desc: 'rt.base_price DESC', rating: 'rt.rating DESC' };
    const orderBy = orderMap[sortBy] || 'rt.sort_order ASC, rt.id ASC';

    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM room_types rt ${where}`, params),
      query(
        `SELECT rt.id, rt.name, rt.area, rt.bed_type, rt.floor_info, rt.view,
                rt.max_guests, rt.smoke, rt.breakfast,
                rt.base_price, rt.holiday_price,
                rt.images, rt.facilities,
                rt.rating, rt.review_count, rt.total_rooms,
                (rt.total_rooms - COALESCE((
                  SELECT COUNT(*) FROM orders o
                  WHERE o.room_type_id = rt.id
                    AND o.status IN (1,2)
                    AND o.check_in_date  < CURDATE() + INTERVAL 1 DAY
                    AND o.check_out_date > CURDATE()
                ), 0)) AS available_today
         FROM room_types rt ${where}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);

    return page(res, { list: list.map(normalizeRoom), total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /:id  房型详情 ────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [room] = await query(
      `SELECT rt.*,
              (SELECT COUNT(*) FROM reviews rv WHERE rv.room_type_id = rt.id AND rv.status = 1) AS review_count_real,
              (SELECT AVG(rv.score)  FROM reviews rv WHERE rv.room_type_id = rt.id AND rv.status = 1) AS avg_score
       FROM room_types rt
       WHERE rt.id = ? AND rt.status = 1 LIMIT 1`,
      [req.params.id],
    );
    if (!room) return res.status(404).json({ code: 404, msg: '房型不存在' });

    // 评分分布
    const dist = await query(
      `SELECT score, COUNT(*) AS cnt
       FROM reviews WHERE room_type_id = ? AND status = 1
       GROUP BY score ORDER BY score DESC`,
      [req.params.id],
    );

    // 最新3条评价
    const latestReviews = await query(
      `SELECT rv.id, rv.score, rv.content, rv.images, rv.created_at,
              IF(rv.is_anonymous, '匿名用户', u.nickname) AS nickname,
              IF(rv.is_anonymous, NULL, u.avatar_url)     AS avatarUrl
       FROM reviews rv
       LEFT JOIN users u ON u.id = rv.user_id
       WHERE rv.room_type_id = ? AND rv.status = 1
       ORDER BY rv.created_at DESC LIMIT 3`,
      [req.params.id],
    );

    return ok(res, { ...normalizeRoom(room), scoreDist: dist, latestReviews });
  } catch (err) { next(err); }
});

// ── GET /:id/calendar  价格日历 ───────────────────────────────────────────────
router.get('/:id/calendar', async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const dayjs = require('dayjs');
    const start = dayjs(`${year || dayjs().year()}-${month || dayjs().month() + 1}-01`).format('YYYY-MM-DD');
    const end   = dayjs(start).add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD');

    const calendars = await query(
      `SELECT date, price, type, available
       FROM price_calendar
       WHERE room_type_id = ? AND date BETWEEN ? AND ?
       ORDER BY date`,
      [req.params.id, start, end],
    );

    // 对没有特殊价格的日期补充基础价格
    const [room] = await query('SELECT base_price, holiday_price FROM room_types WHERE id = ?', [req.params.id]);
    const result = [];
    const cur = dayjs(start);
    const days = dayjs(end).diff(cur, 'day') + 1;
    const calMap = Object.fromEntries(calendars.map(c => [c.date, c]));
    for (let i = 0; i < days; i++) {
      const d = cur.add(i, 'day').format('YYYY-MM-DD');
      result.push(calMap[d] || { date: d, price: room.base_price, type: 1, available: -1 });
    }
    return ok(res, result);
  } catch (err) { next(err); }
});

module.exports = router;
