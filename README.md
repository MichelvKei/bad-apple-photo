# Bad Apple 人物转换器

照片很正常，出来就不一定了。把照片变成 Bad Apple 剪影，让照片跟着人物的手脚一起扭曲。

## 直接玩

- [在线版本](https://bad-apple-photo-michel-1021.smartzebra2048.chatgpt.site/)：中国大陆访问请使用 VPN；部分网络会被托管平台拦截。
- [离线下载包](https://scie1024.dev/api/v1/files/01a15f44-4ac2-77d7-9658-7802e8a6a8f5)：解压后用 Chrome 或 Edge 打开 `BadApple-双击打开.html`，无需登录，也不依赖原站点。

建议上传一张人脸或单人照片。也可以直接使用默认红黑色块。点击照片选择锚点，点击「开始发癫」，用音量按钮和滑条调声音。浏览器通常需要一次点击才允许播放声音。照片只在浏览器本机处理。

## 本地运行

下载整个仓库，在仓库根目录运行：

```sh
python3 -m http.server 8000 --directory dist
```

打开 http://localhost:8000 。纯静态网页，无需安装前端依赖。部署时将 `dist/` 的全部内容上传到静态托管服务，保留 `motion/` 子目录。

## 开发工具

构建脚本和测试完整保存在 `Developer-Sources.zip` 中。开发时先在仓库根目录解压，它会生成 `scripts/` 与 `tests/` 两个目录；网页运行不需要解压这个包。

## 实现与限制

Canvas 黑白遮罩、锚点裁剪和预计算光流 UV 数据驱动局部形变。连续选图只处理最近一次选择，并先缩小大图以减少卡顿。不是精确的人体骨骼绑定：快速动作、遮挡或切镜可能拉伸、滑动。导出通过浏览器实时录制，需要页面保持运行；推荐 Chrome/Edge。

- `dist/`：网页、视频与动作数据。
- `scripts/build-motion.py`：使用 OpenCV / NumPy 生成动作数据。
- `scripts/build-offline.py`：生成单文件离线版与部署 ZIP。
- `tests/`：裁剪、图片加载和形变逻辑检查。

```sh
node tests/tracking.cjs
node tests/motion-renderer.cjs
node tests/photo-loader.cjs
```

重新生成动作数据需要先安装 `scripts/requirements-motion.txt` 中的依赖。制作离线版本运行 `python3 scripts/build-offline.py`，输出位于仓库同级的 `BadApple-分享包/`。

## 素材与制作说明

这是娱乐互动作品。项目由作者构思并与 ChatGPT / Codex 协作实现。
Bad Apple / 东方 Project 相关视频、音乐和角色属于其各自权利人；视频由作者提供，项目不主张这些素材的版权。第三方素材未在本仓库被重新授予开源许可。当前仓库没有附加开源许可证，请勿将素材用于未经授权的商业用途。
