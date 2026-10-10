# SOI

> ## *I am a beacon of knowledge blazing out across a black sea of ignorance.*
>
> **无知之海 · 探索不止　·　SEA OF IGNORANCE**

「知道自己不知道」，比「以为自己知道」更有用。

SOI 是一条船（春日号），载着几个不同的项目，都指向同一件事：
**把模糊的东西变成清晰的结构。**

打开 **[index.html](index.html)** 就是首页。

---

## 项目

### 01 · 无知编年 CHRONICLES —— 时空笔记本

[`chronicles/`](chronicles/) · **[可运行演示](chronicles/demo/index.html)**

把历史写成你自己的结构。核心判断：

> **时间轴和地图不是两个视图，是同一个「时空块」的两个投影。**
> 一个块 = 一段时间 × 一片地方。在时间轴上是条带，在地图上是色块。

已有的能力：

| 能力 | 说明 |
|---|---|
| **播放** | 时间轴推进，镜头随事件飞到它所在的位置 |
| **事件隧道** | 点一个事件，**上为因、下为果**，两侧列出真正相关的事件 |
| **叙事模式** | 一个事件展开成它自己的子时间线，浮动卡片可拖动 |
| **尺度自适应** | 跨度从「十年 · 全球」到「一天 · 一座城」，同一个机制，不切换模式 |
| **个人记录** | 颗粒度到分钟，地图上会画出**一条闭环**（家 → 学校 → 网吧 → 家） |
| **图层** | 「世界」和「我」可以分开看，个人记录不会被大事淹没 |
| **导入导出** | 一行 JSON 就能加自己的数据；单条也能用表单加 |

演示数据是 2016–2025 的 100 件世界大事 + 一条「我的一天」。
**那只是数据，不是产品本身。**

### 02 · 打工人塔防 TAPDEV —— 游戏

[`tapDev/`](tapDev/)

TapTap Maker（UrhoX 引擎 + Lua 5.4）上的塔防。设计核心是「自我」：
家人是场外奖励，战场围绕一个中心建筑展开。设计稿在 [`tapDev/design/`](tapDev/design/)。

---

## 怎么跑

### 首页
双击根目录的 `index.html`。

### 无知编年演示

```bash
# 最简：直接双击
chronicles/demo/index.html

# 想改代码建议起个本地服务（否则报错看不见）
cd chronicles/demo
python -m http.server 8765
# → http://localhost:8765
```

> **为什么建议起服务？**
> 双击走的是 `file://`，浏览器会隐藏跨源脚本的报错，出问题只显示一句
> `Script error.`。起本地服务后报错完整可见 —— 这个坑踩过一次，记在这里。

---

## 目录

```
SOI/
├── index.html              首页
├── README.md
│
├── chronicles/             无知编年
│   ├── demo/               ★ 可直接运行的网页版（零依赖、零构建）
│   │   ├── index.html
│   │   ├── css/app.css
│   │   ├── js/             core · focus · tunnel · add · boot
│   │   ├── assets/         SOI logo
│   │   ├── events.js       演示数据
│   │   └── world.js        世界轮廓（简化后 45 KB）
│   ├── src/ src-tauri/     Tauri 桌面版（React + TS）
│   ├── design/             设计文档（v2 → v6 的演进）
│   └── data/               历史疆域 GeoJSON（18.7 MB，不入库）
│
└── tapDev/                 打工人塔防
    ├── scripts/            Lua
    └── design/             设计稿
```

---

## demo 的技术说明

**零依赖、零构建。** 没有 npm、没有打包器，就是 HTML + CSS + 原生 JS。
这样十年后还能打开 —— 不会因为某个包消失就跑不起来。

- **拆成 5 个 JS 文件**（`core / focus / tunnel / add / boot`），
  都是普通 `<script>`，共享同一个全局作用域，**加载顺序不能乱**。
- **没有引入任何库**。地图是 Canvas 手画的等距圆柱投影，时间轴也是 Canvas。
- 调试入口：

  | 参数 | 作用 |
  |---|---|
  | `?diag=1` | 把关键元素的实际尺寸打进 `<title>` |
  | `?t=2025-06` | 跳到某个时刻 |
  | `?layer=world\|mine\|all` | 切图层 |
  | `?story=AI` `&node=5` | 直接展开某条叙事 |
  | `?tunnel=俄乌` | 直接打开某个事件的隧道 |

---

## 待办

- [ ] 主时间轴可缩放（年 → 月 → 日 → 时）
- [ ] 拍照 → 读 EXIF 坐标 → 自动生成轨迹（个人记录的录入入口）
- [ ] IndexedDB 持久化（现在刷新就没了）
- [ ] 分享单条叙事为自包含 HTML
- [ ] 隧道改成「水面」形式：上面是因，下面是果的倒影

---

## 命名

```
SOI                  母品牌 · 无知之海
春日号                那条船
无知编年 CHRONICLES   时空笔记本
深海回声 ECHOES       另一个方向
```
