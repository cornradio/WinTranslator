# WinTranslator

选中文字，按快捷键，弹窗直接出翻译结果。  
支持自定义prompt和快捷键，根据自己的需求设置不同的AI分析组合（不只局限于翻译领域）。
[bilibili视频教程](https://www.bilibili.com/video/BV1xnji6pEzj)


## 怎么用

**选中文字 → 按快捷键 → 看结果。** 就这么简单。

- `Alt + T`（`Option + T`）— 翻译 -translate（中英文自动互译）
- `Alt + R`（`Option + R`）— 润色 -refine（同时给出两种改写风格）
- 可以自定义任何快捷键和功能。
- `Esc` — 关掉弹窗
弹窗会在鼠标位置弹出来，翻译完可以点复制按钮。如果没选中文字，会自动翻译剪贴板里的内容。


<img width="509" height="524" alt="image" src="https://github.com/user-attachments/assets/26715728-bba9-40dc-9e69-8dee4752050a" />

## 安装

### Windows

在右侧的 [release](https://github.com/cornradio/WinTranslator/releases) 页面中下载运行 `WinTranslator Setup.exe` 安装。

启动程序后右下角托盘会出现一个图标，说明已经在后台运行了。

### macOS

当前 macOS 包是 unsigned 本地包，没有做 Apple Developer ID 签名和公证。如果系统拦截启动--如提示损坏等，需要执行命令：

```
xattr -cr /Applications/WinTranslator.app
```


## 配置 API Key

第一次使用需要先配一个 AI 接口的 Key，推荐用 DeepSeek，便宜好用。

### 获取 DeepSeek API Key

1. 打开 [https://platform.deepseek.com](https://platform.deepseek.com)，注册/登录
2. 左侧菜单点 **API Keys**
3. 点 **创建 API Key**，复制保存好（只显示一次）
4. 左侧菜单点 **充值**，充个几块钱就够用很久

### 在 WinTranslator 里填写

右键托盘图标 → 点 **Settings** → **AI** 标签页：

- **Provider**：选 `OpenAI Compatible`
- **Base URL**：填 `https://api.deepseek.com`
- **API Key**：粘贴你刚才复制的 Key
- **Model**：填 `deepseek-v4-flash`

点 **Test Connection**，显示成功就可以用了。




### 自定义功能

参考 [functions.md](functions.md) 里的示例.




