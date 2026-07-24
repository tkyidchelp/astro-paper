---
author: 杨宏轩
title: 免费 AI API 调用汇总：大模型白嫖指南
pubDatetime: 2026-07-24T00:00:00.000Z
modDatetime: 2026-07-24T00:00:00.000Z
featured: true
draft: false
tags:
  - AI
  - API
  - 大模型
  - 免费
  - 教程
description: 盘点当前可免费调用的主流 AI 大模型 API，包含豆包、DeepSeek、通义千问、智谱 GLM、Gemini 等，附注册入口和免费额度说明。
---

本文整理当前主流 AI 大模型的免费 API 调用方式，适合个人开发者学习和小型项目使用。

---

## 国内厂商

### 1. 豆包 / 火山引擎

字节跳动旗下，响应速度极快，新用户有大量免费额度。

- 注册：[console.volcengine.com](https://console.volcengine.com/)
- 模型：Doubao-lite（免费）、Doubao-pro（付费）
- 免费额度：新用户赠送 Tokens，豆包 Lite 模型长期免费
- 特点：**首 Token 延迟极低**，适合实时对话场景

调用示例：

```python
import requests

url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "model": "doubao-lite",
    "messages": [{"role": "user", "content": "你好"}]
}
resp = requests.post(url, headers=headers, json=data)
print(resp.json())
```

---

### 2. DeepSeek

开源模型标杆，API 价格极低，新用户赠送额度。

- 注册：[platform.deepseek.com](https://platform.deepseek.com/)
- 模型：DeepSeek-V3、DeepSeek-R1
- 免费额度：新用户注册赠送数百万 Tokens
- 特点：推理能力强，支持超长上下文 128K

---

### 3. 通义千问 / 阿里云百炼

阿里旗下大模型，新用户首购极低价。

- 注册：[bailian.console.aliyun.com](https://bailian.console.aliyun.com/)
- 模型：Qwen-Turbo（免费额度多）、Qwen-Plus、Qwen-Max
- 免费额度：百万 Tokens 免费额度，部分模型长期免费
- 特点：**中文理解优秀**，多模态能力强

---

### 4. 智谱 GLM

清华系大模型，开放平台有大量免费额度。

- 注册：[open.bigmodel.cn](https://open.bigmodel.cn/)
- 模型：GLM-4-Flash（免费）、GLM-4-Plus
- 免费额度：Flash 模型完全免费调用
- 特点：复杂推理和长文档处理能力强

调用示例：

```python
from zhipuai import ZhipuAI

client = ZhipuAI(api_key="YOUR_API_KEY")
response = client.chat.completions.create(
    model="glm-4-flash",
    messages=[{"role": "user", "content": "你好"}],
)
print(response.choices[0].message.content)
```

---

## 国外厂商

### 5. Google Gemini

Google 官方大模型，免费额度足够个人使用。

- 获取 Key：[aistudio.google.com](https://aistudio.google.com/apikey)
- 模型：Gemini 2.5 Flash（免费）、Gemini 2.5 Pro
- 免费额度：每分钟数十次请求，完全免费
- 特点：多模态最强，支持图片、视频、音频输入

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

### 6. Groq

基于自研 LPU 芯片推理，速度极快且完全免费。

- 注册：[console.groq.com](https://console.groq.com/)
- 模型：Llama 4、Mixtral、Gemma 等开源模型
- 免费额度：**完全免费**，每分钟有速率限制
- 特点：推理速度极快（500+ tokens/秒），适合大批量任务

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key="YOUR_GROQ_API_KEY"
)
resp = client.chat.completions.create(
    model="llama-4-scout-17b-16e-instruct",
    messages=[{"role": "user", "content": "你好"}]
)
print(resp.choices[0].message.content)
```

---

### 7. Cloudflare Workers AI

Cloudflare 提供的免费推理服务，无需信用卡。

- 入口：[dash.cloudflare.com](https://dash.cloudflare.com/) → AI
- 模型：Llama、Mistral、Gemma、Stable Diffusion 等
- 免费额度：**每天 10 万次推理**（小模型无限制）
- 特点：边缘部署，全球低延迟

---

### 8. OpenRouter

API 聚合网关，部分模型免费。

- 入口：[openrouter.ai](https://openrouter.ai/)
- 免费模型：Llama 系列、Gemma 等开源模型
- 特点：统一 API 格式，一个 Key 调用多厂商模型

---

## 对比总结

| 平台 | 免费额度 | 模型 | 推荐场景 |
|------|---------|------|---------|
| 豆包 | 新用户额度 + Lite 免费 | Doubao-lite | 实时对话 |
| DeepSeek | 新用户百万 Tokens | V3 / R1 | 复杂推理 |
| 通义千问 | 百万 Tokens + Turbo 免费 | Qwen-Turbo | 中文场景 |
| 智谱 GLM | Flash 完全免费 | GLM-4-Flash | 长文档 |
| Gemini | 每分钟数十次 | Flash 系列 | 多模态 |
| Groq | 完全免费 | Llama 系列 | 大批量/高速 |
| CF Workers AI | 每日 10 万次 | 多款开源模型 | 边缘推理 |

---

## 使用建议

1. **中文首选**智谱 GLM-4-Flash 或通义千问 Qwen-Turbo，免费额度充足
2. **英文推理**用 Groq 上的 Llama 系列，完全免费且速度快
3. **多模态任务**用 Gemini Flash，图片视频分析最方便
4. **批量处理**用 DeepSeek V3，价格最低质量不差
5. **快速原型**用 Cloudflare Workers AI，无需绑卡零门槛
