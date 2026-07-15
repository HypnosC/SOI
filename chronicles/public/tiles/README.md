# 本地中国地图瓦片

应用启动时读取本目录的 `meta.json`：

- `"ready": true` → 使用本地瓦片：`public/tiles/{z}/{x}/{y}.png`
- `"ready": false` 或文件缺失 → 回退**高德在线**瓦片

## 目录示例

```
public/tiles/
  meta.json          # ready: true
  4/
    12/
      6.png
  5/
    ...
```

建议缩放级别先下 **z=3～8**（全国到省市），体积可控。全中国到街道级会非常大，不要整包塞进 Git。

## 怎么下载（任选）

1. 用地图下载工具把范围裁到中国，导出为 XYZ 瓦片目录，拷到这里。
2. 若已有 `.mbtiles`，可用相关工具抽出 PNG 到 `{z}/{x}/{y}.png`。

改完 `meta.json` 为 `ready: true` 后刷新页面即可。

## GitHub 注意

大瓦片**不要提交**到仓库（见根目录 `.gitignore`）。只提交 `meta.json`（默认 `ready: false`）和本说明即可。
