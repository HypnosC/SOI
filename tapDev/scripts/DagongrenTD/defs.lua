-- ============================================================================
-- DagongrenTD.defs — 塔 / 敌人 数值定义（纯数据，不依赖引擎）
--
-- 放在这里的意义：不 require urhox-libs，所以能在本机用 lua 直接跑测试。
-- 运行：lua scripts/check_defs.lua   （在 tapDev/ 目录下）
--
-- 注意：以下数值是「办公室塔防原型」的临时占位，
--       正式数值以 design/towers_enemies_balance.md 的 10 塔 / 18 敌表替换。
-- ============================================================================

local M = {}

-- 字段约定（缺失会在 check_defs.lua 里报错）：
--   id / name / cost / damage / fire(攻击间隔秒) / range(像素) / color / desc
--   可选：splash(溅射半径像素)
M.TOWER_DEFS = {
    coffee = {
        id = "coffee", name = "咖啡机", cost = 50, damage = 12, fire = 0.90, range = 110,
        color = { 92, 64, 51, 255 }, desc = "单点，续命起步",
    },
    senior = {
        id = "senior", name = "老鸟", cost = 90, damage = 18, fire = 0.55, range = 130,
        color = { 45, 90, 120, 255 }, desc = "射速高，专治催更",
    },
    blame = {
        id = "blame", name = "甩锅侠", cost = 140, damage = 22, fire = 1.30, range = 100,
        splash = 55, color = { 160, 70, 50, 255 }, desc = "溅射，会议团战法宝",
    },
}

-- 塔的建造顺序（UI 与快捷键都用这个顺序，避免三处各写一遍）
M.TOWER_ORDER = { "coffee", "senior", "blame" }

-- 字段约定：id / name / hp / speed / reward / color
M.ENEMY_DEFS = {
    ticket  = { id = "ticket",  name = "需求单",   hp = 40,  speed = 55, reward = 12, color = { 220, 200, 80, 255 } },
    meeting = { id = "meeting", name = "紧急会议", hp = 28,  speed = 95, reward = 16, color = { 230, 120, 90, 255 } },
    pie     = { id = "pie",     name = "画饼",     hp = 110, speed = 38, reward = 28, color = { 180, 140, 220, 255 } },
}

-- 敌人按强度的顺序（buildWave 里挑精英用）
M.ENEMY_ORDER = { "ticket", "meeting", "pie" }

--- 每秒伤害
function M.dps(def)
    if not def.fire or def.fire <= 0 then return 0 end
    return def.damage / def.fire
end

--- 性价比 = 每块钱买到的 DPS
function M.efficiency(def)
    if not def.cost or def.cost <= 0 then return 0 end
    return M.dps(def) / def.cost
end

return M
