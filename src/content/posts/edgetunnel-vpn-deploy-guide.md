---
author: 杨宏轩
title: EdgeTunnel（VPN）部署教程
pubDatetime: 2026-06-11T00:00:00.000Z
modDatetime: 2026-05-28T00:00:00.000Z
featured: false
draft: false
tags:
  - EdgeTunnel
  - Cloudflare
  - VPN
  - 代理
  - 教程
description: 利用 Cloudflare 免费服务搭建你自己的代理节点，获取订阅地址。
---

利用 Cloudflare 免费服务搭建你自己的代理节点，获取订阅地址。

---

## 准备工作

搭建前需要准备以下 4 样东西：

| 准备项 | 说明 | 推荐 |
|--------|------|------|
| **域名** | 用于绑定自定义访问地址 | 二级域名（如 `vpn.yourdomain.com`）更简单 |
| **Cloudflare 账号** | 部署和托管平台 | [注册地址](https://dash.cloudflare.com/sign-up) |
| **项目压缩包** | EdgeTunnel 源码 | 从 [GitHub 仓库](https://github.com/cmliu/edgetunnel) 下载 `main.zip` |
| **代理客户端** | 导入订阅地址使用 | v2rayN、Clash、Shadowrocket 等 |

### 架构说明

这套系统的核心组件：

```
Cloudflare Pages   →  部署网页和后台入口
Workers KV         →  保存后台配置数据
自定义域名         →  使用你自己的域名访问
```

后台登录地址：`https://你的域名/admin`

---

## 部署步骤

### 第一步：准备域名

**推荐使用二级域名**，设置更简单，出问题更容易排查。

- 格式：`vpn.yourdomain.com` 或 `edt.yourdomain.com`
- 如果使用**根域名**（如 `yourdomain.com`），需要先将域名托管到 Cloudflare 并修改 nameserver

> **建议**：先用二级域名跑通全流程，确认没问题后再考虑换根域名。

---

### 第二步：下载项目

1.  打开 [GitHub 仓库](https://github.com/cmliu/edgetunnel)
2.  点击 **Code → Download ZIP**
3.  下载 `main.zip` 并保存到桌面

---

### 第三步：创建 Cloudflare Pages 项目

1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2.  进入 **Workers & Pages → 创建应用程序 → Pages → 上传资产**
3.  按要求填写：
    - **项目名称**：建议加上随机数字，避免重名（如 `edt2026052111`）
    - **上传文件**：选择下载的 `main.zip`
4.  点击**部署**

> 如果遇到 **1101 错误**，通常是项目名重复了，换个新名字即可。

部署成功后记下 Cloudflare 给你的 `xxxx.pages.dev` 地址。

---

### 第四步：设置后台密码

1.  进入刚才创建的 Pages 项目
2.  **设置 → 环境变量 → 添加变量**

| 变量名 | 变量值 |
|--------|--------|
| `ADMIN` | 你设置的后台密码（如 `Abc#2026!vpn`） |

> 密码建议设置复杂一点。添加变量后需要**重新部署**才能生效。

---

### 第五步：创建 Workers KV 命名空间

1.  Cloudflare 左侧菜单：**存储和数据库 → Workers KV**
2.  点击 **创建实例**
3.  输入名字（如 `EDT_KV`）

> 这相当于一块专门存储后台配置的"小硬盘"。

---

### 第六步：绑定 KV 到 Pages 项目

1.  回到 Pages 项目：**设置 → 绑定 → 添加绑定**
2.  填写配置：

| 设置项 | 值 |
|--------|-----|
| 变量名称 | `KV`（必须大写） |
| KV 命名空间 | 选择刚才创建的（如 `EDT_KV`） |

3.  保存

---

### 第七步：重新部署

完成以下操作后都需要重新部署：

- 添加/修改了 `ADMIN` 变量
- 绑定了 KV 命名空间

操作：**部署页面 → 创建新部署 → 上传 `main.zip` → 保存并部署**

---

### 第八步：绑定自定义域名

#### 方式一：域名已在 Cloudflare 托管

直接在 Pages 项目中添加自定义域即可。

#### 方式二：域名在其他服务商

在域名服务商后台添加 **CNAME 记录**：

| 设置项 | 值 |
|--------|-----|
| 记录类型 | CNAME |
| 主机记录 | `vpn`（二级域名前缀） |
| 记录内容 | `xxxx.pages.dev` |

> 解析生效一般需要 **10~30 分钟**。

---

### 第九步：登录后台

域名生效后访问：

```
https://vpn.yourdomain.com/admin
```

输入你设置的 `ADMIN` 密码登录。

---

### 第十步：常见情况说明

**如果首页显示 `Welcome to nginx!`**

这是**正常的**，不是部署失败。这个页面只是"伪装首页"，真正需要访问的是 `/admin`。

只要能打开 `/admin` 并登录成功，说明部署正常。

---

## 客户端使用

### 获取订阅地址

登录后台后，找到订阅相关选项，复制订阅链接。

### v2rayN 导入步骤

1.  **订阅 → 订阅设置 → 添加**
    - 地址：粘贴订阅链接
    - 备注：随便填（如 `my-vpn`）
2.  保存后**右键 → 更新订阅**
3.  选中节点 → 回车**启动连接**
4.  状态栏显示 **运行中** 即可使用

---

## 常见问题

### 1. 出现 1101 错误怎么办？

项目名重复了。解决方法：

- 换一个全新的项目名
- 末尾加一串随机数字

### 2. 改了密码，后台还是登不上？

通常是改了 `ADMIN` 变量后**没有重新部署**。回到部署页重新上传 `main.zip` 再部署一次。

### 3. 首页显示 Welcome to nginx! 是失败了吗？

不是！先直接访问 `/admin`，能进后台就说明部署成功。

### 4. 节点延迟很高或全是红色？

- 尝试切换不同节点类型（VMess/VLESS/Trojan）
- 选择延迟较低的节点
- 避开高峰期

---

## 总结

搭建这套系统的**核心三件事**：

1.  把项目传到 Cloudflare
2.  把密码和 KV 配好
3.  把自己的域名绑定上去

---

## 参考资料

- 官方仓库：[https://github.com/cmliu/edgetunnel](https://github.com/cmliu/edgetunnel)
- Cloudflare Pages 自定义域名：[https://developers.cloudflare.com/pages/configuration/custom-domains/](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- Cloudflare Workers KV：[https://developers.cloudflare.com/kv/get-started/](https://developers.cloudflare.com/kv/get-started/)
