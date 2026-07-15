# Chronicles of SOI · 无知编年

时间轴 + 中国地图（时空联动）。React + TypeScript + Vite；桌面壳 Tauri（需本机安装 Rust）。

## 运行

```bash
npm install
npm run dev
```

浏览器打开提示地址（默认 `http://localhost:1420/`）。

桌面端（装好 [Rust](https://www.rust-lang.org/learn/get-started) 与 [Tauri 前置](https://v2.tauri.app/start/prerequisites/) 后）：

```bash
npm run tauri:dev
```

## 地图图源

- **优先本地**：把瓦片放到 `public/tiles/{z}/{x}/{y}.png`，并把 `public/tiles/meta.json` 里 `"ready"` 改为 `true`。说明见 [`public/tiles/README.md`](public/tiles/README.md)。
- **否则回退**：高德在线瓦片（国内可访问）。

大体积瓦片已在 `.gitignore`，**不要提交到 GitHub**。

## 上传 GitHub

可以。建议：

1. 在 GitHub 新建空仓库（不要勾选自动加 README，避免冲突）。
2. 本机：

```bash
cd chronicles-soi-next
git init
git add .
git commit -m "Initial commit: timeline + China map"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

已忽略：`node_modules`、`dist`、`src-tauri/target`、本地瓦片图片等。

## 功能概要

- 时间轴（Canvas）与事件 CRUD，IndexedDB 本地存档
- 普通版：MapLibre + 中国范围底图
- 高级版：Three.js + three-globe 三维地球
- 选中事件 ↔ 地图飞点联动
