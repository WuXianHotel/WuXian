'use strict';
/**
 * 管理后台 · 房型管理
 * GET    /api/admin/rooms          房型列表
 * POST   /api/admin/rooms          新增房型
 * GET    /api/admin/rooms/:id      房型详情
 * PUT    /api/admin/rooms/:id      编辑房型
 * PATCH  /api/admin/rooms/:id/status  上架/下架
 * DELETE /api/admin/rooms/:id      删除房型
 * POST   /api/admin/rooms/upload   上传图片
 * GET    /api/admin/rooms/calendar 价格日历列表
 * POST   /api/admin/rooms/calendar 批量设置价格日历
 * GET    /api/admin/rooms/:id/rooms  具体房间列表
 * POST   /api/admin/rooms/:id/rooms  新增具体房间
 */
const router = require('express').Router();
const { body, param } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');
const upload = require('../../middleware/upload');
const { signUrls } = require('../../config/cos');

const canEdit = adminAuth('super', 'operation');

// ── GET /  房型列表 ───────────────────────────────────────────────────────────
router.get('/', adminAuth(), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { keyword, status, bedType } = req.query;
    const cond = []; const params = [];
    if (keyword)  { cond.push('name LIKE ?');    params.push(`%${keyword}%`); }
    if (status !== undefined && status !== '') { cond.push('status = ?'); params.push(Number(status)); }
    if (bedType)  { cond.push('bed_type = ?');   params.push(bedType); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM room_types ${where}`, params),
      query(
        `SELECT id, name, area, bed_type, floor_info, view, max_guests,
                smoke, breakfast, base_price, holiday_price, total_rooms,
                images, rating, review_count, sort_order, status, created_at,
                (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = room_types.id) AS room_count
         FROM room_types ${where}
         ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    // 签名 images 中的 COS URL
    for (const item of list) {
      if (item.images) {
        try {
          const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
          item.images = JSON.stringify(signUrls(Array.isArray(imgs) ? imgs : []));
        } catch {}
      }
    }
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── POST /  新增房型 ──────────────────────────────────────────────────────────
router.post('/',
  canEdit,
  body('name').notEmpty().isLength({ max: 60 }),
  body('basePrice').isFloat({ min: 0 }),
  body('totalRooms').isInt({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      const f = req.body;
      const [{ insertId }] = await query(
        `INSERT INTO room_types
          (name,area,bed_type,floor_info,view,max_guests,pc_count,pc_configs,smoke,breakfast,
           base_price,holiday_price,total_rooms,images,facilities,description,sort_order,status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [f.name, f.area||null, f.bedType||null, f.floorInfo||null, f.view||null,
         f.maxGuests||2, f.pcCount||1, JSON.stringify(f.pcConfigs||[]), f.smoke?1:0, f.breakfast?1:0,
         f.basePrice, f.holidayPrice||null, f.totalRooms,
         JSON.stringify(f.images||[]), JSON.stringify(f.facilities||[]),
         f.description||null, f.sortOrder||0, f.status??1],
      );
      return ok(res, { id: insertId }, '新增成功');
    } catch (err) { next(err); }
  },
);

// ── GET /calendar  价格日历 ───────────────────────────────────────────────────
router.get('/calendar', adminAuth(), async (req, res, next) => {
  try {
    const { roomTypeId, start, end } = req.query;
    if (!roomTypeId || !start || !end) return res.status(400).json({ code: 400, msg: '缺少参数' });
    const list = await query(
      'SELECT * FROM price_calendar WHERE room_type_id = ? AND date BETWEEN ? AND ? ORDER BY date',
      [roomTypeId, start, end],
    );
    return ok(res, list);
  } catch (err) { next(err); }
});

// ── POST /calendar  批量设置价格 ──────────────────────────────────────────────
router.post('/calendar', canEdit,
  body('roomTypeId').isInt({ min: 1 }),
  body('dates').isArray({ min: 1 }),
  body('price').isFloat({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      const { roomTypeId, dates, price, type = 1, available = 0 } = req.body;
      await transaction(async conn => {
        for (const date of dates) {
          await conn.execute(
            `INSERT INTO price_calendar (room_type_id, date, price, type, available)
             VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE price=VALUES(price), type=VALUES(type), available=VALUES(available)`,
            [roomTypeId, date, price, type, available],
          );
        }
      });
      return ok(res, null, `已设置 ${dates.length} 个日期的价格`);
    } catch (err) { next(err); }
  },
);

// ── GET /all-rooms  全量房间列表（跨房型）─支持按楼层、状态、房型筛选 ─────────
// 注意：必须在 /:id 和 /:id/rooms 之前注册，否则会被 :id 路由匹配走
router.get('/all-rooms', adminAuth(), async (req, res, next) => {
  try {
    const { floor, status, roomTypeId } = req.query;

    // 1) list 条件：应用全部筛选（楼层 + 状态 + 房型）
    const listConds = [];
    const listParams = [];
    if (floor)       { listConds.push('r.floor = ?');         listParams.push(Number(floor)); }
    if (status !== undefined && status !== '') { listConds.push('r.status = ?'); listParams.push(Number(status)); }
    if (roomTypeId)  { listConds.push('r.room_type_id = ?');  listParams.push(Number(roomTypeId)); }
    const listWhere = listConds.length ? 'WHERE ' + listConds.join(' AND ') : '';

    // 2) floorStats 条件：忽略 floor，保留 status/roomTypeId（使所有楼层 chip 始终可见）
    const statsConds = [];
    const statsParams = [];
    if (status !== undefined && status !== '') { statsConds.push('r.status = ?'); statsParams.push(Number(status)); }
    if (roomTypeId) { statsConds.push('r.room_type_id = ?'); statsParams.push(Number(roomTypeId)); }
    const statsWhere = statsConds.length ? 'WHERE ' + statsConds.join(' AND ') : '';

    const [rooms, statsRows] = await Promise.all([
      query(
        `SELECT r.id, r.room_no, r.floor, r.status, r.remark,
                r.room_type_id, rt.name AS room_type_name
           FROM rooms r
           LEFT JOIN room_types rt ON rt.id = r.room_type_id
           ${listWhere}
           ORDER BY r.floor ASC, r.room_no ASC`,
        listParams,
      ),
      query(
        `SELECT r.floor, r.status FROM rooms r ${statsWhere}`,
        statsParams,
      ),
    ]);

    // 按楼层分组统计（全部楼层都展示）
    const byFloor = {};
    for (const r of statsRows) {
      if (!byFloor[r.floor]) byFloor[r.floor] = { floor: r.floor, total: 0, free: 0, checkin: 0, cleaning: 0, repair: 0, reserved: 0 };
      byFloor[r.floor].total++;
      if (r.status === 0) byFloor[r.floor].free++;
      else if (r.status === 1) byFloor[r.floor].checkin++;
      else if (r.status === 2) byFloor[r.floor].reserved++;
      else if (r.status === 3) byFloor[r.floor].repair++;
      else if (r.status === 4) byFloor[r.floor].cleaning++;
    }
    const floorStats = Object.values(byFloor).sort((a, b) => a.floor - b.floor);

    return ok(res, { list: rooms, floorStats, total: rooms.length });
  } catch (err) { next(err); }
});

// ── GET /:id  房型详情 ────────────────────────────────────────────────────────
router.get('/:id', adminAuth(), async (req, res, next) => {
  try {
    const [room] = await query('SELECT * FROM room_types WHERE id = ? LIMIT 1', [req.params.id]);
    if (!room) return res.status(404).json({ code: 404, msg: '房型不存在' });
    return ok(res, room);
  } catch (err) { next(err); }
});

// ── PUT /:id  编辑房型 ────────────────────────────────────────────────────────
router.put('/:id', canEdit, async (req, res, next) => {
  try {
    const f = req.body;
    await query(
      `UPDATE room_types SET
         name=COALESCE(?,name), area=COALESCE(?,area), bed_type=COALESCE(?,bed_type),
         floor_info=COALESCE(?,floor_info), view=COALESCE(?,view),
         max_guests=COALESCE(?,max_guests), pc_count=COALESCE(?,pc_count), pc_configs=COALESCE(?,pc_configs),
         smoke=COALESCE(?,smoke), breakfast=COALESCE(?,breakfast),
         base_price=COALESCE(?,base_price), holiday_price=COALESCE(?,holiday_price),
         total_rooms=COALESCE(?,total_rooms), images=COALESCE(?,images),
         facilities=COALESCE(?,facilities), description=COALESCE(?,description),
         sort_order=COALESCE(?,sort_order)
       WHERE id = ?`,
      [f.name??null, f.area??null, f.bedType??null, f.floorInfo??null, f.view??null,
       f.maxGuests??null, f.pcCount??null, f.pcConfigs?JSON.stringify(f.pcConfigs):null,
       f.smoke!=null?Number(f.smoke):null, f.breakfast!=null?Number(f.breakfast):null,
       f.basePrice??null, f.holidayPrice??null, f.totalRooms??null,
       f.images?JSON.stringify(f.images):null, f.facilities?JSON.stringify(f.facilities):null,
       f.description??null, f.sortOrder??null, req.params.id],
    );
    return ok(res, null, '更新成功');
  } catch (err) { next(err); }
});

// ── PATCH /:id/status  上架/下架 ──────────────────────────────────────────────
router.patch('/:id/status', canEdit,
  body('status').isIn([0, 1]).withMessage('status 必须为 0 或 1'),
  validate,
  async (req, res, next) => {
    try {
      await query('UPDATE room_types SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
      return ok(res, null, req.body.status === 1 ? '已上架' : '已下架');
    } catch (err) { next(err); }
  },
);

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', adminAuth('super'), async (req, res, next) => {
  try {
    const [{ cnt }] = await query(
      "SELECT COUNT(*) AS cnt FROM orders WHERE room_type_id = ? AND status NOT IN (4,6)", [req.params.id]
    );
    if (cnt > 0) return res.status(400).json({ code: 400, msg: '存在进行中的订单，不能删除' });
    await query('DELETE FROM room_types WHERE id = ?', [req.params.id]);
    return ok(res, null, '删除成功');
  } catch (err) { next(err); }
});

// ── POST /upload  图片上传 ────────────────────────────────────────────────────
router.post('/upload', canEdit, upload.array('images', 10), (req, res) => {
  const urls = (req.files || []).map(f => `/uploads/${f.path.split('uploads/')[1].replace(/\\/g, '/')}`);
  return ok(res, { urls });
});

// ── GET /:id/rooms  具体房间列表 ──────────────────────────────────────────────
router.get('/:id/rooms', adminAuth(), async (req, res, next) => {
  try {
    const rooms = await query(
      'SELECT id, room_no, floor, status, remark FROM rooms WHERE room_type_id = ? ORDER BY room_no',
      [req.params.id],
    );
    return ok(res, rooms);
  } catch (err) { next(err); }
});

// ── POST /:id/rooms  新增房间 ─────────────────────────────────────────────────
router.post('/:id/rooms', canEdit,
  body('roomNo').notEmpty(),
  body('floor').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { roomNo, floor, remark } = req.body;
      await query(
        'INSERT INTO rooms (room_type_id, room_no, floor, remark) VALUES (?,?,?,?)',
        [req.params.id, roomNo, floor, remark || null],
      );
      return ok(res, null, '房间新增成功');
    } catch (err) { next(err); }
  },
);

// ── PATCH /:id/rooms/:roomId/status  修改房间状态 ────────────────────────────
router.patch('/:id/rooms/:roomId/status', canEdit,
  body('status').isIn([0, 1, 2, 3, 4]).withMessage('status 必须为 0-4'),
  validate,
  async (req, res, next) => {
    try {
      const labels = ['空闲', '入住中', '已预订', '维修', '清洁'];
      await query(
        'UPDATE rooms SET status = ? WHERE id = ? AND room_type_id = ?',
        [req.body.status, req.params.roomId, req.params.id],
      );
      return ok(res, null, `已设为「${labels[req.body.status]}」`);
    } catch (err) { next(err); }
  },
);

// ── DELETE /:id/rooms/:roomId  删除房间 ──────────────────────────────────────
router.delete('/:id/rooms/:roomId', canEdit, async (req, res, next) => {
  try {
    // 入住中的房间不允许删除
    const [room] = await query('SELECT status FROM rooms WHERE id = ? AND room_type_id = ? LIMIT 1',
      [req.params.roomId, req.params.id]);
    if (!room) return res.status(404).json({ code: 404, msg: '房间不存在' });
    if (room.status === 1) return res.status(400).json({ code: 400, msg: '入住中的房间不能删除' });
    await query('DELETE FROM rooms WHERE id = ? AND room_type_id = ?',
      [req.params.roomId, req.params.id]);
    return ok(res, null, '房间已删除');
  } catch (err) { next(err); }
});

module.exports = router;
