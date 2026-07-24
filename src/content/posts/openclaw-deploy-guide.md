---
author: 杨宏轩
title: OpenClaw（小龙虾）AI 智能体部署教程
pubDatetime: 2026-07-24T00:00:00.000Z
modDatetime: 2026-07-24T00:00:00.000Z
featured: false
draft: false
tags:
  - OpenClaw
  - AI
  - 智能体
  - 部署
  - 教程
description: OpenClaw 是一款开源自托管 AI 智能体 Gateway 网关，支持多平台多渠道接入，只需一条命令即可在你的设备上运行个人 AI 助手。
---

OpenClaw（小龙虾）是一款开源自托管 AI 智能体 Gateway 网关，通过渠道插件将你常用的聊天应用（Discord、Telegram、WhatsApp、Signal、Slack 等）接入 AI 模型，实现随时随地向个人 AI 助手发送消息。

---

## 系统要求

- **Node.js 22.22.3+ / 24.15+ / 25.9+**（推荐 24）
- **macOS / Linux / Windows**
- **模型 API Key**（Anthropic、OpenAI、Google 等）

使用 `node --version` 检查当前 Node 版本。

---

## 安装方式

### 方式一：安装脚本（推荐）

这是最快的方式，脚本会自动检测系统、安装 Node（如需要）并安装 OpenClaw。

**macOS / Linux / WSL2：**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

**Windows (PowerShell)：**

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

### 方式二：npm 安装

如果已自行管理 Node 环境：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### 方式三：Docker 部署

适合在服务器或无头环境运行：

```bash
docker run -d \
  --name openclaw \
  -v ~/.openclaw:/root/.openclaw \
  -p 18789:18789 \
  ghcr.io/openclaw/openclaw:latest
```

---

## 初始化配置

### 第一步：运行新手引导

```bash
openclaw onboard --install-daemon
```

向导会引导你完成以下步骤：

1. 选择模型提供商（Anthropic / OpenAI / Google 等）
2. 填写 API Key
3. 配置 Gateway 网关
4. 安装守护进程（macOS 用 LaunchAgent，Linux 用 systemd，Windows 用计划任务）

可以跳过可选步骤，稍后使用 `openclaw configure` 返回继续配置。

### 第二步：验证 Gateway 网关状态

```bash
openclaw gateway status
```

正常输出会显示 Gateway 正在监听端口 `18789`。

### 第三步：打开控制面板

```bash
openclaw dashboard
```

浏览器会自动打开 Control UI 仪表板。如果正常加载，说明安装成功。

本地默认地址：`http://127.0.0.1:18789/`

### 第四步：发送第一条消息

在 Control UI 聊天框中输入消息，应该能收到 AI 回复。

---

## 渠道配置

### 接入 Telegram（最快捷）

1. 在 Telegram 中搜索 `@BotFather`，发送 `/newbot` 创建机器人
2. 获取 Bot Token
3. 运行配置命令：

```bash
openclaw configure
```

选择 Telegram 渠道，粘贴 Token 即可完成配对。

### 其他支持渠道

Discord、iMessage、Signal、Slack、WhatsApp、Matrix、Microsoft Teams、Zalo 等均支持，在 `openclaw configure` 中按提示配置。

---

## 配置文件

配置文件位于 `~/.openclaw/openclaw.json`。示例配置：

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  messages: { groupChat: { mentionPatterns: ["@openclaw"] } },
}
```

常用配置项：
- `channels.<渠道>.allowFrom`：限制允许发送消息的用户
- `channels.<渠道>.groups`：群聊提及规则
- `gateway.controlUi.enabled`：是否启用 Web 控制面板

---

## 常用命令

| 命令 | 功能 |
|------|------|
| `openclaw --version` | 查看版本 |
| `openclaw doctor` | 诊断配置问题 |
| `openclaw gateway status` | 查看 Gateway 状态 |
| `openclaw gateway restart` | 重启 Gateway |
| `openclaw dashboard` | 打开控制面板 |
| `openclaw configure` | 重新进入配置向导 |
| `openclaw update` | 更新 OpenClaw |

---

## 常见问题

### 1. 安装后找不到 `openclaw` 命令

通常是 PATH 问题，npm 全局二进制目录不在 shell 的 PATH 中。

```bash
node -v           # 确认 Node 已安装
npm prefix -g     # 查看全局包安装路径
echo "$PATH"      # 检查 PATH 是否包含全局二进制目录
```

解决：将 `npm prefix -g` 输出的路径添加到 PATH。

### 2. Gateway 无法启动

```bash
openclaw doctor    # 运行诊断
openclaw gateway status  # 查看详细状态
```

检查端口 `18789` 是否被占用。

### 3. 消息发送后无回复

- 确认 API Key 有效且额度充足
- 检查 `openclaw gateway status` 确认 Gateway 正常运行
- 查看日志排查具体错误

### 4. 如何远程访问

- 使用 [Tailscale](/zh-CN/gateway/tailscale) 组网
- 通过 SSH 隧道转发
- 部署到云服务器（支持 DigitalOcean、Hetzner、阿里云等）

---

## 更新与卸载

**更新到最新版：**

```bash
openclaw update
```

**卸载：**

```bash
openclaw uninstall
```

---

## 总结

OpenClaw 的核心价值在于**自托管 + 多渠道**：一个 Gateway 网关同时对接多个聊天平台，数据完全在你自己的设备上。安装流程只有三步：安装 CLI、运行新手引导、接入聊天渠道。

## 参考资料

- 官方文档：[https://docs.openclaw.ai](https://docs.openclaw.ai)
- GitHub 仓库：[https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- 中文社区：[https://openclaw.cc](https://openclaw.cc)
