# SOI / 打工人一生 — 开发机接手说明

**结论先说：设计文档和代码都在 Git 仓库里，换电脑一般不用再「导出文件」。**  
拉分支 + 按本文重装 Maker 环境即可。玩法总览见 `tapDev/design/DESIGN_BRIEF.md`。

---

## 1. 仓库

| 项 | 值 |
|----|-----|
| GitHub | `https://github.com/HypnosC/SOI` |
| 建议分支 | `cursor/tapdev-taptap-maker-120b`（或合并后的 `main`） |
| Maker 游戏目录 | 仓库内 `tapDev/` |
| 设计总览 | `tapDev/design/DESIGN_BRIEF.md` |
| 入口脚本（旧原型） | `tapDev/scripts/main.lua` |
| Maker app_id | `2f7e12ed-4b6e-4ba4-a650-5c89e1481784` |
| 项目名 | 打工人塔防 / 打工人一生（`tapDev/project.json`） |

```bash
git clone https://github.com/HypnosC/SOI.git
cd SOI
git checkout cursor/tapdev-taptap-maker-120b
git pull
```

仓库建议设为 **Private**（Settings → Danger Zone → Change visibility）。

### 要不要导出？

| 内容 | 是否在仓库 | 你要做什么 |
|------|------------|------------|
| 设计 md / 线框 html / 脚本 | ✅ 已在 git | `git pull` |
| Maker PAT、本机登录态 | ❌ | 新电脑重新 `pat set` |
| MCP 配置 | ❌（在用户目录） | 重新 `maker install` |
| urhox-libs 等 AI kit | ❌（gitignore） | `tapDev` 里再 `init --app-id` |
| Cursor 聊天记录 | ❌ | 以 `DESIGN_BRIEF.md` 为准 |
---

## 2. 开发机一次性环境（必做）

需要：Node.js（含 `npx`）、Git。

### 2.1 安装 Maker MCP（Cursor）

```bash
npx -y @taptap/maker install --ide cursor
```

装完后 **重启 Cursor**（或重载 MCP），否则工具可能不出现。

### 2.2 登录 Maker（PAT 不要写进本文件 / 不要提交 git）

在本机浏览器打开 TapTap Maker，创建 PAT，然后：

```bash
printf '%s' '粘贴你的PAT' | npx -y @taptap/maker pat set --pat-stdin
```

PAT 只存在本机 `~/.taptap-maker/`，**禁止**写进仓库或本说明的副本里长期保存明文。

### 2.3 绑定并拉齐本地 AI 套件

`urhox-libs/`、skills、engine-docs 等 **不进 git**，新机器必须再拉一次：

```bash
cd tapDev
npx -y @taptap/maker init \
  --app-id 2f7e12ed-4b6e-4ba4-a650-5c89e1481784 \
  --target-dir "$(pwd)" \
  --skip-confirm \
  --skip-mcp-install
```

成功后应能看到 `urhox-libs/`、`AGENTS.md`、`templates/` 等。  
日常以 `tapDev/AGENTS.md` 和 Maker MCP 为准，不要用别的 TapTap 文档替代。

### 2.4 自检（可选）

```bash
cd tapDev
lua scripts/check_path.lua    # 或 lua5.4
```

应输出 `check_path.lua OK`。

---

## 3. 当前已有内容

**先读：** `tapDev/design/DESIGN_BRIEF.md`（交流定案总览）。

| 文件 | 作用 |
|------|------|
| `design/DESIGN_BRIEF.md` | 产品/玩法定案总览 |
| `design/battlefield_center_defense.md` | 中心防守 + 建造 |
| `design/core_me_family_support.md` | 核=我；家=场外 |
| `design/life_endings.md` | 结局图鉴表 |
| `design/towers_enemies_balance.md` | 塔/敌人数值骨架 |
| `design/ui_screens.md` | 界面信息架构 |
| `design/ui_wireframe.html` | 可点选线框（旧折线示意） |
| `scripts/main.lua` | 早期塔防原型（技术参考，玩法已迭代） |
| `project.json` / `.maker-mcp/config.json` | Maker 绑定 |

正式开发以 DESIGN_BRIEF 为准；`main.lua` 办公室固定路线原型可逐步替换为中心防守。

预览 / 构建用 Maker（`taptap-maker preview` / MCP），以 `tapDev/AGENTS.md` 为准。

---

## 4. 换机后怎么继续聊 / 继续写

1. 开发机 Cursor 打开本仓库的 `tapDev` 目录（或整个 SOI）。
2. 确认 MCP 里有 `taptap-maker`。
3. **思路**可继续在任意 Cursor 会话里聊；**改代码、预览、构建**优先在已装好 Maker 的开发机做。
4. 提交时只提交 `scripts/`、`assets/`、`project.json`、`.maker-mcp/config.json` 等业务文件；不要提交 `~/.taptap-maker`、不要提交带 PAT 的 git remote URL。

---

## 5. 一键检查清单

- [ ] 已 clone / pull 最新分支  
- [ ] `npx @taptap/maker install --ide cursor` + 重启 Cursor  
- [ ] `pat set` 登录成功  
- [ ] 在 `tapDev` 用 `--app-id 2f7e12ed-...` 跑过 `init`  
- [ ] 存在 `tapDev/urhox-libs/` 与 `tapDev/scripts/main.lua`  
- [ ] （可选）`lua scripts/check_path.lua` 通过  

全部勾完后：打开 `tapDev/design/DESIGN_BRIEF.md`，在开发机正式开发「打工人一生」。
