# SOI / 打工人塔防 — 开发机接手说明

把本文件拷到开发机即可按下面步骤恢复环境。  
**游戏玩法先在 Cursor 里沟通思路，具体实现放到开发机做。**

---

## 1. 仓库

| 项 | 值 |
|----|-----|
| GitHub | `https://github.com/HypnosC/SOI` |
| 建议分支 | `cursor/tapdev-taptap-maker-120b`（或合并后的 `main`） |
| Maker 游戏目录 | 仓库内 `tapDev/` |
| 入口脚本 | `tapDev/scripts/main.lua` |
| Maker app_id | `2f7e12ed-4b6e-4ba4-a650-5c89e1481784` |
| 项目名 | 打工人塔防（`tapDev/project.json`） |

```bash
git clone https://github.com/HypnosC/SOI.git
cd SOI
git checkout cursor/tapdev-taptap-maker-120b   # 若尚未合入 main
```

仓库请设为 **Private**（Settings → Danger Zone → Change visibility）。  
Cloud Agent / 换机不改变「谁有权限」——Private 后只有你和邀请的人能访问。

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

## 3. 当前已有内容（原型，非终版）

| 文件 | 作用 |
|------|------|
| `scripts/main.lua` | 打工人塔防可玩原型入口 |
| `scripts/DagongrenTD/path.lua` | 路径折线推进数学 |
| `scripts/check_path.lua` | 路径逻辑自检 |
| `project.json` | 子项目元数据 |
| `.maker-mcp/config.json` | Maker 项目绑定（已入库） |

**原型玩法摘要（便于对思路，实现可推翻）：**

- 塔：咖啡机 / 老鸟 / 甩锅侠（花费、射速、溅射不同）
- 怪：需求单 / 紧急会议 / 画饼（沿路径走向「老板办」）
- 资源：预算（钱）、心态（命）、共 8 波
- 操作：底栏选塔 → 点空位建造；「放波」或空格开下一波

预览 / 远端构建用 Maker 流程（`taptap-maker preview` / Maker MCP `maker_build_*`），以项目内 AGENTS 为准。

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

全部勾完即可在开发机继续做「打工人塔防」。
