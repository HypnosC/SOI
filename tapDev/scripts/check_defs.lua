-- ============================================================================
-- 塔 / 敌人数值自检（纯逻辑，不需要引擎）
-- 运行：lua scripts/check_defs.lua      （在 tapDev/ 目录下）
--
-- 目的：把「塔一开火就崩」那类错误在提交前拦住。
-- 上次的 bug 是 TOWER_DEFS 缺 fire 字段 + 同一张表里 range 写了两遍，
-- 前者由字段校验抓到，后者由第 4 节「表内重复键扫描」抓到。
-- ============================================================================

package.path = package.path .. ";./scripts/?.lua;./scripts/?/init.lua"

local Defs = require("DagongrenTD.defs")

local fails = 0
local function check(cond, msg)
    if cond then
        print("  ok   " .. msg)
    else
        print("  FAIL " .. msg)
        fails = fails + 1
    end
end

-- ---------------------------------------------------------------------------
-- 4 节要用：把源码里的注释与字符串清成空格，只留结构
-- ---------------------------------------------------------------------------
local function strip(src)
    local out, i, n = {}, 1, #src
    local function blank(from, to)
        for p = from, to do
            out[#out + 1] = (src:sub(p, p) == "\n") and "\n" or " "
        end
    end
    while i <= n do
        local c, c2 = src:sub(i, i), src:sub(i + 1, i + 1)
        if c == "-" and c2 == "-" then
            if src:sub(i + 2, i + 3) == "[[" then            -- 长注释
                local k = src:find("]]", i + 4) or n
                blank(i, k + 1); i = k + 2
            else                                              -- 行注释
                local k = (src:find("\n", i) or (n + 1)) - 1
                blank(i, k); i = k + 1
            end
        elseif c == '"' or c == "'" then                      -- 字符串
            local j = i + 1
            while j <= n do
                local d = src:sub(j, j)
                if d == "\\" then j = j + 2
                elseif d == c then break
                else j = j + 1 end
            end
            blank(i, j); i = j + 1
        elseif src:sub(i, i + 1) == "[[" then                 -- 长字符串
            local k = src:find("]]", i + 2) or n
            blank(i, k + 1); i = k + 2
        else
            out[#out + 1] = c; i = i + 1
        end
    end
    return table.concat(out)
end

-- 字符级扫描：用花括号栈定位「同一张表」，记录其中的 `key =` 赋值
local function find_dup_keys(raw, label)
    local src = strip(raw)
    local stack, dups = {}, {}
    local i, n, line = 1, #src, 1
    while i <= n do
        local c = src:sub(i, i)
        if c == "\n" then
            line = line + 1; i = i + 1
        elseif c == "{" then
            stack[#stack + 1] = {}; i = i + 1
        elseif c == "}" then
            if #stack > 0 then table.remove(stack) end
            i = i + 1
        else
            local id = src:match("^([%a_][%w_]*)", i)
            if id then
                local j = i + #id
                while j <= n and src:sub(j, j):match("%s") do j = j + 1 end
                -- 必须是赋值（排除 ==、~=、<=、>=）；且只在意表内部
                if src:sub(j, j) == "=" and src:sub(j + 1, j + 1) ~= "=" then
                    local top = stack[#stack]
                    if top then
                        if top[id] then
                            dups[#dups + 1] = ("%s:%d 表内重复键 '%s'"):format(label, line, id)
                        end
                        top[id] = true
                    end
                end
                i = i + #id
            else
                i = i + 1
            end
        end
    end
    return dups
end

-- ---------------------------------------------------------------------------
print("=== 1. 塔字段完整性 ===")
for _, key in ipairs(Defs.TOWER_ORDER) do
    local t = Defs.TOWER_DEFS[key]
    check(t ~= nil, ("塔 %s 存在"):format(key))
    if t then
        check(type(t.id) == "string", ("%s.id 是字符串"):format(key))
        check(type(t.name) == "string", ("%s.name 是字符串"):format(key))
        check(type(t.cost) == "number" and t.cost > 0, ("%s.cost 是正数"):format(key))
        check(type(t.range) == "number" and t.range > 0, ("%s.range 是正数（像素）"):format(key))
        check(type(t.fire) == "number" and t.fire > 0,
              ("%s.fire 存在且 > 0  ← 上次崩溃的根因"):format(key))
        check(type(t.damage) == "number" and t.damage >= 0, ("%s.damage 是非负数"):format(key))
        check(type(t.color) == "table" and #t.color == 4, ("%s.color 是 4 元组"):format(key))
    end
end

print("")
print("=== 2. 敌人字段完整性 ===")
for _, key in ipairs(Defs.ENEMY_ORDER) do
    local e = Defs.ENEMY_DEFS[key]
    check(e ~= nil, ("敌人 %s 存在"):format(key))
    if e then
        check(type(e.hp) == "number" and e.hp > 0, ("%s.hp 是正数"):format(key))
        check(type(e.speed) == "number" and e.speed > 0, ("%s.speed 是正数"):format(key))
        check(type(e.reward) == "number" and e.reward >= 0, ("%s.reward 是非负数"):format(key))
    end
end

print("")
print("=== 3. 数值画像（给平衡用，不算错） ===")
print(("  %-9s %-8s %6s %6s %6s %8s %9s"):format("id", "name", "cost", "dmg", "fire", "dps", "dps/元"))
for _, key in ipairs(Defs.TOWER_ORDER) do
    local t = Defs.TOWER_DEFS[key]
    if t then
        print(("  %-9s %-8s %6d %6d %6.2f %8.1f %9.3f"):format(
            t.id, t.name, t.cost, t.damage, t.fire, Defs.dps(t), Defs.efficiency(t)))
    end
end
print("")
print("  参考 design/towers_enemies_balance.md：起步期单塔 DPS 约 8~15，")
print("  满编 5 塔裸 DPS 约 45~70。当前 senior 偏高、blame 偏低，等接新塔表时统一调。")

print("")
print("=== 4. 表内重复键扫描（拦住 'range 写两遍' 这类坑） ===")
local targets = { "scripts/main.lua", "scripts/DagongrenTD/defs.lua", "scripts/DagongrenTD/path.lua" }
local scanned = 0
for _, p in ipairs(targets) do
    local f = io.open(p, "r")
    if f then
        local raw = f:read("a"); f:close()
        scanned = scanned + 1
        local dups = find_dup_keys(raw, p)
        if #dups > 0 then
            for _, d in ipairs(dups) do print("  FAIL " .. d) end
            fails = fails + #dups
        else
            print("  ok   " .. p)
        end
    end
end
check(scanned > 0, "至少扫描到一个源文件")

-- 自测：确认扫描器真的能抓到重复键（造一个假阳性样本）
do
    local sample = [[
local T = {
    a = { id = "x", range = 1, range = 110 },
    b = { id = "y", range = 2 },
}
]]
    local dups = find_dup_keys(sample, "self-test")
    check(#dups == 1, ("扫描器自测：能抓到重复键（抓到 %d 个，期望 1 个）"):format(#dups))
end

print("")
if fails == 0 then
    print("check_defs.lua OK — 全部通过")
else
    print(("check_defs.lua 失败 %d 项"):format(fails))
    os.exit(1)
end
