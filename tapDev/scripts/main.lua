-- ============================================================================
-- 打工人塔防 — UrhoX 2D（基于 scaffold-2d）
-- 路径保卫工位：拦住需求/会议/画饼，别让它们冲进老板办公室。
-- ============================================================================

local UI = require("urhox-libs/UI")
local Path = require("DagongrenTD.path")

local uiRoot_ = nil
local state = "menu" -- menu | playing | gameover | win

local CONFIG = {
    Title = "打工人塔防",
    StartMoney = 120,
    StartLives = 8,
    MaxWaves = 8,
}

-- 路径拐点（逻辑坐标，相对游戏区 0..W / 0..H，在 Start 后按屏宽换算）
local PATH_NORM = {
    { 0.02, 0.55 }, { 0.22, 0.55 }, { 0.22, 0.22 }, { 0.48, 0.22 },
    { 0.48, 0.78 }, { 0.72, 0.78 }, { 0.72, 0.38 }, { 0.98, 0.38 },
}

local TOWER_DEFS = {
    coffee = {
        id = "coffee", name = "咖啡机", cost = 50, range = 1.1, damage = 12, range = 110,
        color = { 92, 64, 51, 255 }, desc = "单点，续命起步",
    },
    senior = {
        id = "senior", name = "老鸟", cost = 90, range = 0.55, damage = 18, range = 130,
        color = { 45, 90, 120, 255 }, desc = "射速高，专治催更",
    },
    blame = {
        id = "blame", name = "甩锅侠", cost = 140, range = 1.4, damage = 22, range = 100,
        splash = 55, color = { 160, 70, 50, 255 }, desc = "溅射，会议团战法宝",
    },
}

local ENEMY_DEFS = {
    { id = "ticket", name = "需求单", hp = 40, speed = 55, reward = 12, color = { 220, 200, 80, 255 } },
    { id = "meeting", name = "紧急会议", hp = 28, speed = 95, reward = 16, color = { 230, 120, 90, 255 } },
    { id = "pie", name = "画饼", hp = 110, speed = 38, reward = 28, color = { 180, 140, 220, 255 } },
}

local money, lives, wave, selectedTower
local path = {}
local slots = {}
local enemies = {}
local projectiles = {}
local spawnQueue = {}
local spawnTimer = 0
local waveClearTimer = 0
local playArea = { x = 0, y = 72, w = 800, h = 480 }
local timeAcc = 0

-- ---------------------------------------------------------------------------
-- 纯逻辑委托 DagongrenTD.path
-- ---------------------------------------------------------------------------

local dist = Path.dist
local advanceAlongPath = Path.advanceAlongPath

local function buildWave(n)
    local q = {}
    local count = 4 + n * 2
    for i = 1, count do
        local def
        if n >= 5 and i % 5 == 0 then
            def = ENEMY_DEFS[3]
        elseif n >= 3 and i % 3 == 0 then
            def = ENEMY_DEFS[2]
        else
            def = ENEMY_DEFS[1]
        end
        local scale = 1 + (n - 1) * 0.18
        q[#q + 1] = {
            def = def,
            hp = math.floor(def.hp * scale),
            maxHp = math.floor(def.hp * scale),
            speed = def.speed * (1 + (n - 1) * 0.04),
            reward = math.floor(def.reward * (1 + n * 0.05)),
        }
    end
    return q
end

-- ---------------------------------------------------------------------------
-- 布局
-- ---------------------------------------------------------------------------

local function rebuildGeometry()
    -- UI 基像素坐标（与 NanoVG beginFrame / 点击换算一致）
    local w = (UI.GetWidth and UI.GetWidth()) or graphics.width
    local h = (UI.GetHeight and UI.GetHeight()) or graphics.height
    playArea.x = 12
    playArea.y = 64
    playArea.w = math.max(120, w - 24)
    playArea.h = math.max(120, h - 150)

    path = {}
    for _, p in ipairs(PATH_NORM) do
        path[#path + 1] = {
            x = playArea.x + p[1] * playArea.w,
            y = playArea.y + p[2] * playArea.h,
        }
    end

    local norms = {
        { 0.12, 0.38 }, { 0.12, 0.70 }, { 0.34, 0.38 }, { 0.34, 0.70 },
        { 0.58, 0.10 }, { 0.58, 0.55 }, { 0.84, 0.55 }, { 0.84, 0.22 },
    }
    local oldTowers = {}
    for _, s in ipairs(slots) do
        if s.tower then oldTowers[s.id] = s.tower end
    end
    slots = {}
    for i, n in ipairs(norms) do
        slots[i] = {
            id = i,
            x = playArea.x + n[1] * playArea.w,
            y = playArea.y + n[2] * playArea.h,
            tower = oldTowers[i],
            cooldown = 0,
        }
    end
end

local function resetGame()
    money = CONFIG.StartMoney
    lives = CONFIG.StartLives
    wave = 0
    selectedTower = "coffee"
    enemies = {}
    projectiles = {}
    spawnQueue = {}
    spawnTimer = 0
    waveClearTimer = 0
    rebuildGeometry()
end

-- ---------------------------------------------------------------------------
-- HUD 刷新
-- ---------------------------------------------------------------------------

local function setLabel(id, text)
    if not uiRoot_ then return end
    local label = uiRoot_:FindById(id) --[[@as Label?]]
    if label then label:SetText(text) end
end

local function refreshHud()
    setLabel("hudMoney", "预算 ¥" .. tostring(money))
    setLabel("hudLives", "心态 " .. tostring(lives))
    setLabel("hudWave", "周报第 " .. tostring(wave) .. "/" .. tostring(CONFIG.MaxWaves) .. " 波")
    setLabel("hudSelect", "选中：" .. (TOWER_DEFS[selectedTower] and TOWER_DEFS[selectedTower].name or "-"))
end

local function showOverlay(title, subtitle, showStart)
    local overlay = uiRoot_ and uiRoot_:FindById("overlay")
    if not overlay then return end
    overlay:SetVisible(true)
    setLabel("overlayTitle", title)
    setLabel("overlaySub", subtitle or "")
    local btn = uiRoot_:FindById("startBtn")
    if btn then btn:SetVisible(showStart ~= false) end
end

local function hideOverlay()
    local overlay = uiRoot_ and uiRoot_:FindById("overlay")
    if overlay then overlay:SetVisible(false) end
end

-- ---------------------------------------------------------------------------
-- 玩法
-- ---------------------------------------------------------------------------

local function tryPlaceTower(slot)
    if state ~= "playing" or not slot or slot.tower then return end
    local def = TOWER_DEFS[selectedTower]
    if not def or money < def.cost then return end
    money = money - def.cost
    slot.tower = {
        defId = def.id,
        name = def.name,
        range = def.range,
        damage = def.damage,
        fire = def.fire,
        splash = def.splash,
        color = def.color,
    }
    slot.cooldown = 0
    refreshHud()
    print("建造 " .. def.name .. " @ slot " .. slot.id)
end

local function startNextWave()
    if state ~= "playing" then return end
    if #spawnQueue > 0 or #enemies > 0 then return end
    if wave >= CONFIG.MaxWaves then
        state = "win"
        showOverlay("绩效达标！", "你守住了工位，本周活下来了。", true)
        return
    end
    wave = wave + 1
    spawnQueue = buildWave(wave)
    spawnTimer = 0.4
    refreshHud()
    print("第 " .. wave .. " 波来了，队列 " .. #spawnQueue)
end

local function spawnOne(spec)
    local p0 = path[1]
    enemies[#enemies + 1] = {
        name = spec.def.name,
        color = spec.def.color,
        hp = spec.hp,
        maxHp = spec.maxHp,
        speed = spec.speed,
        reward = spec.reward,
        traveled = 0,
        x = p0.x,
        y = p0.y,
        r = 12,
    }
end

local function damageEnemy(e, amount)
    e.hp = e.hp - amount
    if e.hp <= 0 then
        money = money + e.reward
        e.dead = true
        refreshHud()
    end
end

local function fireTower(slot, dt)
    local t = slot.tower
    if not t then return end
    slot.cooldown = math.max(0, slot.cooldown - dt)
    if slot.cooldown > 0 then return end

    local best, bestD
    for _, e in ipairs(enemies) do
        if not e.dead then
            local d = dist(slot.x, slot.y, e.x, e.y)
            if d <= t.range and (not bestD or d < bestD) then
                best, bestD = e, d
            end
        end
    end
    if not best then return end

    slot.cooldown = t.fire
    projectiles[#projectiles + 1] = {
        x = slot.x, y = slot.y,
        tx = best.x, ty = best.y,
        target = best,
        damage = t.damage,
        splash = t.splash,
        color = t.color,
        life = 0.18,
    }
end

local function updateProjectiles(dt)
    local alive = {}
    for _, p in ipairs(projectiles) do
        p.life = p.life - dt
        local tgt = p.target
        if tgt and not tgt.dead then
            p.tx, p.ty = tgt.x, tgt.y
        end
        local d = dist(p.x, p.y, p.tx, p.ty)
        local step = 520 * dt
        if d <= step or p.life <= 0 then
            if tgt and not tgt.dead then
                damageEnemy(tgt, p.damage)
            end
            if p.splash then
                for _, e in ipairs(enemies) do
                    if not e.dead and e ~= tgt and dist(p.tx, p.ty, e.x, e.y) <= p.splash then
                        damageEnemy(e, math.floor(p.damage * 0.55))
                    end
                end
            end
        else
            local t = step / d
            p.x = p.x + (p.tx - p.x) * t
            p.y = p.y + (p.ty - p.y) * t
            alive[#alive + 1] = p
        end
    end
    projectiles = alive
end

local function updateEnemies(dt)
    local alive = {}
    for _, e in ipairs(enemies) do
        if e.dead then
            -- drop
        else
            local _, done, x, y = advanceAlongPath(path, e.traveled, e.speed * dt)
            e.traveled = e.traveled + e.speed * dt
            e.x, e.y = x, y
            if done then
                lives = lives - 1
                refreshHud()
                if lives <= 0 then
                    state = "gameover"
                    showOverlay("心态崩了", "需求冲进老板办公室。加班至死……", true)
                end
            else
                alive[#alive + 1] = e
            end
        end
    end
    enemies = alive
end

local function updatePlaying(dt)
    if #spawnQueue > 0 then
        spawnTimer = spawnTimer - dt
        if spawnTimer <= 0 then
            spawnOne(table.remove(spawnQueue, 1))
            spawnTimer = 0.65
        end
    elseif #enemies == 0 and wave > 0 then
        waveClearTimer = waveClearTimer + dt
        if waveClearTimer > 1.2 then
            waveClearTimer = 0
            money = money + 25 + wave * 8
            refreshHud()
            if wave >= CONFIG.MaxWaves then
                state = "win"
                showOverlay("绩效达标！", "你守住了工位，本周活下来了。", true)
            else
                startNextWave()
            end
        end
    else
        waveClearTimer = 0
    end

    for _, slot in ipairs(slots) do
        fireTower(slot, dt)
    end
    updateProjectiles(dt)
    updateEnemies(dt)
end

-- ---------------------------------------------------------------------------
-- 绘制（UI Custom 层：用 Panel 的装饰 + 每帧同步敌人节点太重；
-- 这里用 NanoVG 跟在 UI 后画战场，模式 B）
-- ---------------------------------------------------------------------------

local function drawPath(vg)
    if #path < 2 then return end
    nvgBeginPath(vg)
    nvgMoveTo(vg, path[1].x, path[1].y)
    for i = 2, #path do
        nvgLineTo(vg, path[i].x, path[i].y)
    end
    nvgStrokeWidth(vg, 36)
    nvgStrokeColor(vg, nvgRGBA(70, 78, 88, 230))
    nvgStroke(vg)

    nvgBeginPath(vg)
    nvgMoveTo(vg, path[1].x, path[1].y)
    for i = 2, #path do
        nvgLineTo(vg, path[i].x, path[i].y)
    end
    nvgStrokeWidth(vg, 22)
    nvgStrokeColor(vg, nvgRGBA(110, 120, 130, 255))
    nvgStroke(vg)

    -- 入口 / 老板办
    local a, b = path[1], path[#path]
    nvgBeginPath(vg)
    nvgCircle(vg, a.x, a.y, 16)
    nvgFillColor(vg, nvgRGBA(80, 160, 120, 255))
    nvgFill(vg)
    nvgBeginPath(vg)
    nvgCircle(vg, b.x, b.y, 18)
    nvgFillColor(vg, nvgRGBA(180, 60, 60, 255))
    nvgFill(vg)
end

local function drawSlots(vg)
    for _, s in ipairs(slots) do
        nvgBeginPath(vg)
        nvgCircle(vg, s.x, s.y, 22)
        if s.tower then
            local c = s.tower.color
            nvgFillColor(vg, nvgRGBA(c[1], c[2], c[3], 255))
            nvgFill(vg)
            nvgBeginPath(vg)
            nvgCircle(vg, s.x, s.y, s.tower.range)
            nvgStrokeWidth(vg, 1)
            nvgStrokeColor(vg, nvgRGBA(c[1], c[2], c[3], 50))
            nvgStroke(vg)
        else
            nvgFillColor(vg, nvgRGBA(40, 48, 58, 180))
            nvgFill(vg)
            nvgStrokeWidth(vg, 2)
            nvgStrokeColor(vg, nvgRGBA(180, 190, 200, 160))
            nvgStroke(vg)
        end
    end
end

local function drawEnemies(vg)
    for _, e in ipairs(enemies) do
        local c = e.color
        nvgBeginPath(vg)
        nvgCircle(vg, e.x, e.y, e.r)
        nvgFillColor(vg, nvgRGBA(c[1], c[2], c[3], 255))
        nvgFill(vg)
        -- hp bar
        local bw = 28
        local ratio = math.max(0, e.hp / e.maxHp)
        nvgBeginPath(vg)
        nvgRect(vg, e.x - bw / 2, e.y - e.r - 8, bw, 4)
        nvgFillColor(vg, nvgRGBA(30, 30, 30, 200))
        nvgFill(vg)
        nvgBeginPath(vg)
        nvgRect(vg, e.x - bw / 2, e.y - e.r - 8, bw * ratio, 4)
        nvgFillColor(vg, nvgRGBA(90, 200, 110, 255))
        nvgFill(vg)
    end
end

local function drawProjectiles(vg)
    for _, p in ipairs(projectiles) do
        local c = p.color
        nvgBeginPath(vg)
        nvgCircle(vg, p.x, p.y, 4)
        nvgFillColor(vg, nvgRGBA(c[1], c[2], c[3], 255))
        nvgFill(vg)
    end
end

local function drawBoard(vg)
    if not vg then return end
    -- 挂在 UI.SetInspectorRenderHook：widgets 画完、nvgEndFrame 之前（同帧、同坐标系）
    nvgSave(vg)
    drawPath(vg)
    drawSlots(vg)
    drawEnemies(vg)
    drawProjectiles(vg)

    nvgFontSize(vg, 13)
    nvgFillColor(vg, nvgRGBA(230, 230, 230, 200))
    nvgTextAlign(vg, NVG_ALIGN_LEFT + NVG_ALIGN_MIDDLE)
    if path[1] then
        nvgText(vg, path[1].x - 8, path[1].y - 28, "前台")
    end
    if path[#path] then
        nvgText(vg, path[#path].x - 28, path[#path].y - 30, "老板办")
    end
    nvgRestore(vg)
end

-- ---------------------------------------------------------------------------
-- UI
-- ---------------------------------------------------------------------------

local function hitSlot(lx, ly)
    for _, s in ipairs(slots) do
        if dist(lx, ly, s.x, s.y) <= 26 then
            return s
        end
    end
end

local function beginPlay()
    resetGame()
    state = "playing"
    hideOverlay()
    refreshHud()
    startNextWave()
end

function Start()
    graphics.windowTitle = CONFIG.Title

    UI.Init({
        fonts = {
            { family = "sans", weights = { normal = "Fonts/MiSans-Regular.ttf" } },
        },
        scale = UI.Scale.DEFAULT,
    })

    resetGame()
    CreateUI()
    SubscribeToEvent("Update", "HandleUpdate")
    SubscribeToEvent("KeyDown", "HandleKeyDown")
    SubscribeToEvent("MouseButtonDown", "HandleMouse")
    SubscribeToEvent("TouchBegin", "HandleTouch")
    SubscribeToEvent("ScreenMode", "HandleScreenMode")

    UI.SetInspectorRenderHook(function(vg)
        if state == "playing" or state == "gameover" or state == "win" then
            drawBoard(vg)
        end
    end)

    state = "menu"
    showOverlay(CONFIG.Title, "拦住需求浪潮，守住工位。点空位建造，选塔再点格子。", true)
    print("=== " .. CONFIG.Title .. " ready ===")
end

function Stop()
    UI.Shutdown()
end

function CreateUI()
    local towerButtons = {}
    for _, key in ipairs({ "coffee", "senior", "blame" }) do
        local def = TOWER_DEFS[key]
        towerButtons[#towerButtons + 1] = UI.Button {
            id = "pick_" .. key,
            text = def.name .. " ¥" .. def.cost,
            variant = key == "coffee" and "primary" or "secondary",
            onClick = function()
                selectedTower = key
                refreshHud()
            end,
        }
    end

    uiRoot_ = UI.Panel {
        id = "gameUI",
        width = "100%",
        height = "100%",
        pointerEvents = "box-none",
        backgroundColor = { 28, 32, 40, 255 },
        children = {
            UI.SafeAreaView {
                width = "100%",
                height = "100%",
                pointerEvents = "box-none",
                children = {
                    -- 顶栏 HUD
                    UI.Panel {
                        id = "hud",
                        position = "absolute",
                        top = 8,
                        left = 12,
                        right = 12,
                        flexDirection = "row",
                        justifyContent = "space-between",
                        gap = 8,
                        pointerEvents = "none",
                        children = {
                            UI.Label { id = "hudMoney", text = "预算 ¥0", fontSize = 15, fontColor = { 240, 220, 120, 255 } },
                            UI.Label { id = "hudWave", text = "周报第 0 波", fontSize = 15, fontColor = { 220, 230, 240, 255 } },
                            UI.Label { id = "hudLives", text = "心态 0", fontSize = 15, fontColor = { 255, 140, 140, 255 } },
                        },
                    },
                    UI.Label {
                        id = "hudSelect",
                        text = "选中：咖啡机",
                        fontSize = 13,
                        fontColor = { 180, 190, 200, 220 },
                        position = "absolute",
                        top = 36,
                        left = 12,
                        pointerEvents = "none",
                    },
                    -- 底栏选塔 + 下一波
                    UI.Panel {
                        position = "absolute",
                        left = 12,
                        right = 12,
                        bottom = 12,
                        flexDirection = "row",
                        gap = 8,
                        alignItems = "center",
                        pointerEvents = "auto",
                        children = {
                            UI.Panel {
                                flexDirection = "row",
                                gap = 8,
                                flexGrow = 1,
                                children = towerButtons,
                            },
                            UI.Button {
                                id = "waveBtn",
                                text = "放波",
                                variant = "primary",
                                onClick = function()
                                    if state == "playing" then startNextWave() end
                                end,
                            },
                        },
                    },
                    -- 覆盖层
                    UI.Panel {
                        id = "overlay",
                        position = "absolute",
                        top = 0, left = 0, right = 0, bottom = 0,
                        justifyContent = "center",
                        alignItems = "center",
                        backgroundColor = { 10, 12, 16, 200 },
                        pointerEvents = "auto",
                        children = {
                            UI.Panel {
                                width = "90%",
                                maxWidth = 380,
                                padding = 28,
                                gap = 12,
                                backgroundColor = { 36, 42, 52, 245 },
                                borderRadius = 14,
                                borderWidth = 1,
                                borderColor = { 90, 100, 120, 120 },
                                alignItems = "center",
                                children = {
                                    UI.Label {
                                        id = "overlayTitle",
                                        text = CONFIG.Title,
                                        fontSize = 24,
                                        fontColor = { 255, 255, 255, 255 },
                                    },
                                    UI.Label {
                                        id = "overlaySub",
                                        text = "",
                                        fontSize = 14,
                                        fontColor = { 180, 190, 200, 230 },
                                        textAlign = "center",
                                    },
                                    UI.Button {
                                        id = "startBtn",
                                        text = "上班 / 再来一局",
                                        variant = "primary",
                                        marginTop = 8,
                                        onClick = beginPlay,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    }
    UI.SetRoot(uiRoot_)
    refreshHud()
end

function HandleScreenMode()
    rebuildGeometry()
end

function HandleUpdate(_, eventData)
    local dt = eventData["TimeStep"]:GetFloat()
    timeAcc = timeAcc + dt
    if state == "playing" then
        updatePlaying(dt)
    end
end

function HandleKeyDown(_, eventData)
    local key = eventData["Key"]:GetInt()
    if key == KEY_1 then selectedTower = "coffee"; refreshHud() end
    if key == KEY_2 then selectedTower = "senior"; refreshHud() end
    if key == KEY_3 then selectedTower = "blame"; refreshHud() end
    if key == KEY_SPACE or key == KEY_RETURN then
        if state == "menu" or state == "gameover" or state == "win" then
            beginPlay()
        elseif state == "playing" then
            startNextWave()
        end
    end
end

local function handlePointer(px, py)
    if state ~= "playing" then return end
    local scale = (UI.GetScale and UI.GetScale()) or graphics:GetDPR() or 1
    local lx, ly = px / scale, py / scale
    local slot = hitSlot(lx, ly)
    if slot then tryPlaceTower(slot) end
end

function HandleMouse(_, eventData)
    local x = eventData["X"]:GetInt()
    local y = eventData["Y"]:GetInt()
    handlePointer(x, y)
end

function HandleTouch(_, eventData)
    local x = eventData["X"]:GetInt()
    local y = eventData["Y"]:GetInt()
    handlePointer(x, y)
end
