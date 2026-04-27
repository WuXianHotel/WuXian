'use strict';
/**
 * 会员等级自动升级检查
 * 根据 members 表的 total_nights / points_total 和 member_levels 表的阈值，
 * 自动将会员升到满足条件的最高等级（只升不降）。
 */
const { query } = require('../config/db');

/**
 * 检查并升级指定用户的会员等级
 * @param {number} userId - users 表的 id
 * @returns {object|null} 升级信息 { oldLevel, newLevel, newLevelName } 或 null（无变化）
 */
async function checkLevelUpgrade(userId) {
  const [member] = await query(
    'SELECT id, level, total_nights, points_total FROM members WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!member) return null;

  // 获取所有等级，按 level 降序（从高到低匹配）
  const levels = await query('SELECT level, name, min_nights, min_points FROM member_levels ORDER BY level DESC');

  let targetLevel = 1; // 默认最低级
  let targetName = '';
  for (const lv of levels) {
    // 满足任一条件即可升级到该等级
    if (member.total_nights >= lv.min_nights || member.points_total >= lv.min_points) {
      targetLevel = lv.level;
      targetName = lv.name;
      break;
    }
  }

  // 只升不降
  if (targetLevel > member.level) {
    await query('UPDATE members SET level = ? WHERE id = ?', [targetLevel, member.id]);
    console.log(`[level-upgrade] userId=${userId} 升级: ${member.level} → ${targetLevel} (${targetName})`);
    return { oldLevel: member.level, newLevel: targetLevel, newLevelName: targetName };
  }

  return null;
}

module.exports = { checkLevelUpgrade };
