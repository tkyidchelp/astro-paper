---
author: 杨宏轩
title: 免费服务器获取教程：白嫖云主机部署个人项目
pubDatetime: 2026-07-24T00:00:00.000Z
modDatetime: 2026-07-24T00:00:00.000Z
featured: false
draft: false
tags:
  - 服务器
  - 免费
  - VPS
  - 部署
  - 教程
description: 盘点当前可以免费获取的云服务器/VPS 方案，包含 Oracle Cloud、Google Cloud、AWS、Azure 等，附申请步骤和使用注意事项。
---

本文整理当前可免费获取云服务器和 VPS 的方案，适合部署个人项目、搭建代理、跑定时任务等。

---

## 一、永久免费方案

### 1. Oracle Cloud 永久免费

Oracle 提供**永久免费**的云资源，无需信用卡付费。

**免费资源：**

| 资源类型 | 配置 | 数量 |
|---------|------|------|
| AMD 实例 | 1/8 OCPU + 1GB RAM | 最多 2 台 |
| ARM Ampere 实例 | 4 OCPU + 24GB RAM | 合计上限 |
| 块存储 | 200GB 总存储 | 免费 |
| 出站流量 | 每月 10TB | 免费 |

**注册地址**：[signup.cloud.oracle.com](https://signup.cloud.oracle.com/)

**申请步骤：**

1. 选择区域（推荐亚太地区如首尔/东京/新加坡）
2. 填写个人信息、邮箱验证、手机验证
3. 添加信用卡验证身份（不会扣费）
4. 创建 VM 实例即可使用

**注意事项：**
- 需要外币信用卡过验证
- 部分热门区域（首尔、大阪）库存紧张，可能需要反复尝试
- Oracle 可能回收闲置实例，建议装好服务并保持活跃连接

---

### 2. Google Cloud Platform（GCP）

GCP 提供 **90 天免费试用**，赠送美元额度。

**免费试用资源：**

- 300 美元赠金，90 天有效
- 每月 1 台 f1-micro 实例（美国区域）
- Compute Engine、Cloud Storage、Cloud Functions 等均有免费额度

**注册地址**：[console.cloud.google.com](https://console.cloud.google.com/)

---

### 3. Amazon Web Services（AWS）

AWS 提供 **12 个月免费套餐**。

**免费资源：**

- EC2 t2.micro / t3.micro 实例：每月 750 小时
- S3 存储：5GB
- RDS 数据库：20GB
- Lambda：每月 100 万次请求

**注册地址**：[aws.amazon.com/free](https://aws.amazon.com/free/)

---

### 4. Microsoft Azure

Azure 提供 **12 个月免费服务** + 200 美元赠金。

**免费资源：**

- B1s 虚拟机：每月 750 小时
- 200 美元赠金，30 天有效期
- Azure Functions：每月 100 万次请求
- 5GB Blob 存储

**注册地址**：[azure.microsoft.com/free](https://azure.microsoft.com/free/)

---

## 二、学生/教育专项

### 5. GitHub Student Developer Pack

通过 GitHub 学生认证后可获得大量云服务额度：

- **DigitalOcean**：200 美元额度
- **Namecheap**：免费域名一年
- **Microsoft Azure**：无需信用卡，100 美元额度
- **Heroku**：免费 Hobby Dyno

**申请地址**：[education.github.com/pack](https://education.github.com/pack/)

> 需要学校邮箱（edu）或上传学生证验证。

---

## 三、轻量免费方案

### 6. Cloudflare Workers / Pages

完全免费，适合部署前端和无状态 API：

- Workers：每日 10 万次请求
- Pages：无限带宽，每月 500 次构建
- D1 数据库：5GB 存储
- R2 存储：10GB

**入口**：[dash.cloudflare.com](https://dash.cloudflare.com/)

---

### 7. Vercel

前端部署首选，免费额度充裕：

- 每月 100GB 带宽
- 每天 6000 分钟构建时间
- Serverless Functions：每月 100GB-小时

**入口**：[vercel.com](https://vercel.com/)

---

### 8. Netlify

- 每月 100GB 带宽
- 300 分钟构建 / 月
- 每月 125K Serverless 函数调用

**入口**：[netlify.com](https://netlify.com/)

---

### 9. Render

- 免费 Web Service（512MB RAM，休眠机制）
- PostgreSQL 数据库 90 天免费
- 静态站点无限免费

**入口**：[render.com](https://render.com/)

---

## 四、对比总结

| 平台 | 免费类型 | 配置 | 推荐场景 |
|------|---------|------|---------|
| Oracle Cloud | 永久免费 | 4核 24G ARM | 长期运行的后端服务、代理 |
| GCP | 90 天试用 | f1-micro | 短期项目验证 |
| AWS | 12 个月 | t2.micro | 学习 AWS 生态 |
| Azure | 12 个月 + 赠金 | B1s | .NET 和 Windows 项目 |
| GitHub 学生包 | 各种福利 | 多平台 | **学生首选** |
| Workers/Pages | 永久免费 | Serverless | 前端 / 轻量 API |
| Render | 免费（休眠） | 512MB | 轻量后端 |
| Vercel/Netlify | 永久免费 | Serverless | 前端部署 |

---

## 五、实操建议

1. **首选 Oracle Cloud**：4 核 24G ARM 免费，性能吊打其他平台，装个 Docker 跑多个服务绰绰有余
2. **学生优先走 GitHub 学生包**：DigitalOcean 200 刀 + Azure 100 刀，够玩半年
3. **前端项目用 Vercel/CF Pages**：部署快、免费额度足
4. **短期尝鲜用 GCP/AWS 试用**：300 美元随便花，到期前迁移到 Oracle

**Oracle Cloud ARM 实例推荐配置：**

```bash
# SSH 登录后安装基础环境
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose nginx
sudo systemctl enable docker
```

**防火墙开放端口：**

在 Oracle Cloud 控制台「虚拟云网络 → 安全列表」中添加入站规则，开放 80/443/22 端口。

---

## 注意事项

- 所有需要信用卡的平台记得绑定后设置**预算告警**，防止超额扣费
- Oracle Cloud 实例被回收前会发邮件通知，注意检查
- Render 免费 512MB 实例 15 分钟无请求会休眠，可用 UptimeRobot 定时唤醒
- 多个平台组合使用效果最佳：Oracle 跑后端 + Vercel 跑前端
