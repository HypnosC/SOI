# Chronicles of SOI · 代码评审与完善方案

> 评审日期：2026-10-09
> 评审方式：读完全部 `src/`，`npm install` + `npm run build` **实跑通过**（373 模块，exit=0），
> `npm run dev` 起服务后 HTTP 200 探测成功。
> 本文档的定位：**给下一个接手的 AI / 人看的**，说明这个项目是什么、已修了什么、还缺什么。

---

## 一、这个项目是什么（先明确，避免误改）

**一句话：一个「时空编年」的阅读 + 编辑工具。**

- **上屏**：时间轴 Canvas 2D（世界坐标 `x = 年份 × 4px`，可滚轮缩放、拖拽平移、双击空白按年份新建）
- **下屏**：中国地图，**普通版 = maplibre 2D**（本地瓦片优先 / 高德在线回退），**高级版 = 3D 地球**
- **双向联动**：时间轴选事件 → 地图飞过去；点地图标记 → 时间轴选中
- **数据模型**：`TimelineEventNode { id, kind:'event', title, year(负=公元前), note?, placeName?, lat?, lng? }`
- **持久化**：IndexedDB 自动保存（250ms 防抖）+ JSON 导入/导出，支持合并且
- **编辑**：底部 `EventDock` 表单（标题 / 年份±公元前 / 地名 / 经纬度 / 备注）

**它不属于游戏。** 根目录 `tapDev/` 是游戏（TapTap Maker / UrhoX / Lua），
`chronicles/` 是这个独立的编年工具。**DESIGN_BRIEF 第 8 节「不要用 HTML/React 做正式游戏 UI」
约束的是游戏，不约束本项目。** 建议在 `DEV_CONTINUE.md` 里把这点写清楚，避免下个 AI 误删。

---

## 二、已修复（本轮，构建已通过）

### 1. 🔴 卡片与时间轴重叠（真实视觉缺陷）

**原实现：**
```ts
export const CARD_BASE_Y = 8;        // 卡片从世界坐标 y=8 开始
export const CARD_STACK_DY = 76;     // 同年多事件向下堆叠 76px
export const CARD_H = 68;
export const AXIS_WORLD_Y = 248;     // 轴线在 y=248
```
`wy = 8 + stack × 76`，于是：
```
stack 0 → y   8..76
stack 1 → y  84..152
stack 2 → y 160..228
stack 3 → y 236..304   ← 越过轴线（248），卡片压住轴与刻度文字
```
而且卡片是在画完轴与刻度**之后**绘制的，所以是**直接盖住**。

**改法：** 改为**向上堆叠**，基准贴着轴上方：
```ts
export const CARD_BASE_Y = AXIS_WORLD_Y - CARD_H - 18;   // 248 - 68 - 18 = 162
wy = CARD_BASE_Y - stack * CARD_STACK_DY;
```
这样任何堆叠层数都不会碰轴线（stack 3 → y = -66..2，最多跑出上边界，用户平移即可）。

### 2. 🟠 同年事件顺序是随机的

```ts
g.sort((a, b) => a.id.localeCompare(b.id));
```
`id` 来自 `crypto.randomUUID()`，**用它排序等于顺序无意义**。
编年史里同年多条应当有稳定、可预期的顺序。

**改法：** `a.title.localeCompare(b.title, 'zh-Hans-CN') || a.id.localeCompare(b.id)`
（先用中文标题序，id 只作兜底，保证确定性）

> **进一步建议：** 给 `TimelineEventNode` 加可选 `sortOrder?: number`，
> 让作者能手动决定同年事件的先后（编年史里"一月/三月/七月"这种顺序是内容，不该由标题决定）。

### 3. 🟠 卡片布局被重复计算 3 次

`placeEventCards(events)` 分别在三个地方各调一次：
- `drawTimeline2d.paintTimeline2d()` 内部（每帧绘制）
- `TimelineCanvas.onPointerDown()`（每次点击）
- `TimelineCanvas.onDoubleClick()`

每次都是 `buildYearStackIndex`（Map 分组 + 排序）+ `map`，即 **O(n log n) × 3**。
事件上千时点击会明显掉帧。

**改法：** 在 `TimelineCanvas` 里 `useMemo` 算一份 `cards`，
传给绘制、命中测试、双击判定三处共用；`PaintTimelineOptions` 里 `events` 改为 `cards`。

### 4. 🟡 编辑事件会触发地图重复飞镜头

```ts
useEffect(() => { ...map.flyTo(...) }, [selectedId, events]);
```
`events` 变化（例如改一下已选事件的备注）也会触发 `flyTo`，
于是**拖地图的过程中切一下选中，或改个字，镜头就被拉回去**。

**改法：** 加 `lastFlewRef` 守卫，只在**选中项发生变化**时飞图。

---

## 三、仍存在的问题（按优先级）

### P1 · 阅读体验 —— 这是「阅读展示」定位下最大的缺口

当前它**只有编辑，没有"读"**。面对一条跨三千年的时间轴，读者没有任何导航手段：

| # | 缺什么 | 影响 |
|---|---|---|
| 1 | **事件目录 / 编年列表**（侧栏，点击跳转） | 没有总览，不知道总共记了什么 |
| 2 | **上一条 / 下一条**（含键盘 ←→） | 阅读编年的自然动作缺失，只能鼠标找 |
| 3 | **按年份跳转输入框** | 想找"公元 105 年"只能手动缩放平移 |
| 4 | **搜索 / 过滤**（按标题、地名、年份区间） | 事件上百后不可用 |
| 5 | **时期 / 朝代分带** | 编年史阅读的基本骨架，一眼看出"这是汉、那是唐" |
| 6 | **分享**（静态导出页 / URL 编码 doc / 只读链接） | 做出来只能自己看，无法给别人 |

> **强烈建议先做 1 + 2 + 3。** 这三个加起来约半天工作量，
> 但它把「一个编辑器」变成「一个能读的编年史」——这正是你说的定位。

### P2 · 数据模型

| # | 问题 | 说明 |
|---|---|---|
| 7 | 只有 `event` 一种节点 | 缺 `period`（时期）、`place`（地点实体）、`person`（人物） |
| 8 | **地点坐标重复输入** | 洛阳输两次、"洛邑"和"洛阳"其实是同一地——应抽 `place` 实体，事件只引用 |
| 9 | 没有事件间关系 | 但 `layoutEvents.ts` 里**已经预留了** `PickHit = { kind:'node' } \| { kind:'edge' }`，注释写着「预留：日后先测边再测点」——说明你早想到了 |

### P3 · 编辑体验

| # | 问题 | 说明 |
|---|---|---|
| 10 | `Backspace` 直接删事件，**无确认、无撤销** | `App.tsx` 的 `onKey` 里直接 filter 掉。**这是实打实的数据丢失风险** |
| 11 | 无法调整同年事件顺序 | 见上文第 2 条 |

### P4 · 可访问性与移动端

| # | 问题 | 说明 |
|---|---|---|
| 12 | Canvas 内容对屏幕阅读器**完全不可见** | 需要一份 DOM 镜像（`aria-hidden` 的列表）或 aria-live 摘要 |
| 13 | 键盘只能删，不能选 | 无法用键盘在事件间移动焦点 |
| 14 | 移动端布局 | 当前 `header + 上下两屏 + dock`，手机上会挤；且 Canvas 的滚轮缩放对应不上触摸手势（`onWheel` 在移动端无效） |

> 第 14 条值得单独说：**`TimelineCanvas` 只绑了 `onWheel` 做缩放，没有双指捏合**。
> 在手机/平板上**根本没法缩放时间轴**。如果这个工具要在移动端读，这是必修项。

---

## 四、建议的推进顺序

```
第 1 批（半天）阅读导航
  · 事件目录侧栏（按年份分组，点击定位 + 高亮当前）
  · 上一条 / 下一条（按钮 + 键盘 ←→）
  · 「跳转到年份」输入框
  → 做完这一批，它就从「编辑器」变成「能读的编年史」

第 2 批（半天）防丢与手感
  · 撤销 / 重做（栈式，Ctrl+Z / Ctrl+Shift+Z）
  · 删除前确认（或至少可撤销）
  · 双指捏合缩放（移动端）

第 3 批（1~2 天）内容骨架
  · 时期 / 朝代分带（数据模型加 period 节点 + 轴上区间着色）
  · place 实体（地点复用，消除重复坐标）
  · 地图标记聚合（同坐标多事件）

第 4 批（可选）分享
  · 只读模式（URL 参数或静态导出单页 HTML）
```

---

## 五、本轮改动清单

| 文件 | 改动 |
|---|---|
| `src/domain/layoutEvents.ts` | 卡片改向上堆叠（修撞轴）；同年排序改标题优先；补注释说明原缺陷 |
| `src/canvas/drawTimeline2d.ts` | `PaintTimelineOptions.events` → `cards`，不再自行计算布局 |
| `src/canvas/TimelineCanvas.tsx` | `useMemo` 缓存 `cards`，绘制/命中/双击三处共用 |
| `src/map/Map2D.tsx` | `flyTo` 加 `lastFlewRef` 守卫，只在选中项变化时触发 |

**验证：**
```
npm install    → added 224 packages in 3s
npm run build  → ✓ built in 691ms  (373 modules, exit 0)
npm run dev    → ready in 136ms, http://localhost:1420/   HTTP 200
```

---

## 六、一句话

**这个项目的架构是清晰的**（domain / canvas / map / ui / persistence 分层干净，
`layoutEvents` 把布局与命中抽成纯函数，`pickAtWorld` 还预留了 edge 的扩展位）——
**比 `tapDev` 那边好得多。**

**它真正缺的不是代码质量，是「阅读」这一半功能。**
现在它是一件很好的**编年编辑器**，但还不是一个**编年展示**。
先补上目录、翻页、跳转这三样，它就成立了。
