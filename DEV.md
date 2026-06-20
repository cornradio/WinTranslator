# Developer Guide

## 本地开发

```bash
npm install
npm run dev
```

启动后 Vite 会编译前端和主进程，Electron 窗口自动弹出。改代码会热重载。

Windows 用户如果 Electron 下载慢，可以设国内镜像：

```bash
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

## 本地打包

```bash
# Windows (NSIS 安装包)
npm run build:win

# macOS (DMG)
npm run build:mac
```

产物在 `release/` 目录。

## 版本号

版本号存在三个地方，用脚本一次性改：

```bash
node bump-version.js 1.2.7
```

会同时更新：

- `package.json` → version
- `package-lock.json` → version
- `src/shared/constants.ts` → APP_VERSION

## 发布流程

改完版本号后，打 tag 推送即可触发 GitHub Actions 自动构建三平台安装包并发布到 Release：

```bash
git add .
git commit -m "v1.2.7"
git tag v1.2.7
git push && git push --tags
```

Actions 会并行编译 Windows / macOS / Linux 三个平台，完成后自动上传到对应 tag 的 GitHub Release 页面。

也可以去 GitHub → Actions → Build and Release → Run workflow 手动触发。
