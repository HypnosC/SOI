# 更新日志

> 记录 SOI 仓库的实质性变化。倒序。

---

## 2026-10-10

**5 次提交 · 贡献图 level 4（最深色）**

这一天把「无知编年」从一个本地原型，变成了**有在线地址、能在手机上打开、有完整文档**的公开项目。

### 新增

- **手机端适配** —— 第一次能在手机上真正使用
  - header 折成两行（隐藏速度 / 回到开头 / 全部显示 / 导入导出）
  - 图例改成顶部可横向滑动的胶囊条
  - 当前事件卡全宽贴底，隧道面板全屏覆盖
  - 浮动卡收窄到 `78vw` / `86vw`
  - 底部时间轴加高到 132px，手指好点
  - **双指捏合缩放地图**（以手指中心为锚点），画布加 `touch-action:none`
  - 桌面端一行没动（全部在 `@media(max-width:860px)` 内）
- **在线演示** —— GitHub Pages 上线
  - <https://hypnosc.github.io/SOI/chronicles/demo/>
  - 因为是 HTTPS，**手机拍照（EXIF）和定位 API 从此可以真跑**
- **SOI 首页** `index.html` —— 深海军蓝 + 暖金，与 logo 同一套语言
- **`chronicles/README.md`** 重写为子项目完整主页：核心判断 + 4 张截图 + 能力表 + 两套运行方式 + 调试参数表
- **`CHANGELOG.md`**（本文件）

### 变更

- **README 分层**：根 README 改成 SOI 母项目门面（Sven 那句 + 子项目列表），详细内容下沉到子项目
- **品牌化**：SOI logo 进 header 与 favicon；配色按 logo 对齐（近黑 + 冷金 → **深海军蓝 + 暖金**，替换 46 处）；字号整体上调（81 处）
- `chronicles/prototype/decade` → **`chronicles/demo`**（它已经不是原型了）
- 截图从根 `docs/` 挪进 `chronicles/docs/`，归子项目所有
- 事件卡改成**按需出现**：点时间轴 / 点事件点显示，点地图空白隐藏，另加 ✕

### 移除

- `tapDev/`（打工人塔防）与 `DEV_CONTINUE.md` —— 该子项目不在此仓库维护，已另存
- 6 个已淘汰的早期原型：`canvas` / `canvas-map` / `palace` / `palace2` / `notebook` / `spacetime`
- 42 张多余的原型截图（省 **12.3 MB**），`design/` 里每个阶段只留一张代表作

### 仓库配置

| 项 | 值 |
|---|---|
| **Topics** | `soi` `chronicles` `spacetime` `history` `timeline` `map` `notebook` `second-brain` `tauri` `typescript` `vanilla-js` `dataviz` |
| **Labels** | `chronicles` `echoes` `demo` `design` |
| **Pages** | 已开（main / 根目录） |
| **默认分支** | `main`（已从 `cursor/tapdev-taptap-maker-120b` 快进） |
| **git 代理** | 写入仓库配置，方便国内网络推送 |

### 踩过的坑（记下来，别再踩）

1. **`file://` 会吞掉跨源脚本的错误** —— 只报 `Script error. @ :0`。改代码务必起本地服务（`python -m http.server`），否则真实报错看不见。
2. **推错分支** —— 仓库默认分支是 `main`，但改动一直推在 `cursor/...` 上，所以 GitHub 主页长时间显示旧内容。**推送前先确认 `git ls-remote --symref origin HEAD`。**
3. **删 CSS 不能用"删行"的正则** —— `^#legtog[^\n]*\n` 会把 `#legtog{` 这一行删掉却留下它的 `}`，导致大括号失衡、后面的媒体查询块整体失效。**要按 `{ ... }` 整体删。**
4. **小东西卡住超过 3 次就换方案** —— 一个图例切换按钮（DOM 在、计算样式为 `display:flex / visible / z-index:999`，但就是不绘制）硬刚了 6 轮，最后改成不需要按钮的方案，10 分钟解决。

---

## 2026-09-24

**重构前的最后一次大改**（历史记录）

- `Restore DEV_CONTINUE handoff with design brief pointers`
- `Add design brief and clarify handoff: pull repo, no file export`
- `Add life ending/archetype table for contemporary China script`
- `Define single core as self; family as off-field rewards`
- `Document center-defense + building battlefield (replace fixed path)`
- `Make UI wireframe fully offline (no Google Fonts)`

---

## 2026-09 及更早

- `chronicles` 从 React + Tauri 桌面版起步（时间轴 Canvas + 中国地图 + IndexedDB）
- 设计演进 v1 → v6 记录在 [`chronicles/design/`](chronicles/design/)：纯时间轴 → 时期带 → 时空块 → 边读边记 → 无限画布 → 记忆宫殿
- 最终收敛到 `chronicles/demo`：**零依赖、零构建的网页版**
