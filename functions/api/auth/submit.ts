interface Env {
  BLOG_KV: KVNamespace;
  AGNES_API_KEY: string;
}

interface Submission {
  slug: string;
  title: string;
  author: string;
  description: string;
  pubDatetime: string;
  tags: string[];
  content: string;
  status: "pending" | "approved" | "rejected";
  username: string;
  aiReview?: string;
}

async function getUser(request: Request): Promise<string | null> {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  try {
    const [payloadB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return null;
    return payload.username || null;
  } catch {
    return null;
  }
}

async function aiReview(title: string, content: string, tags: string[], apiKey: string): Promise<string> {
  try {
    const prompt = `你是一个博客内容审核助手。请审核以下用户投稿，判断是否适合发布在技术博客上。

审核标准：
1. 内容是否有实质价值（不是灌水、广告、无意义内容）
2. 是否涉及政治敏感、色情、暴力等违规内容
3. 是否基本通顺可读

标题：${title}
标签：${tags.join(", ")}
内容（前500字）：${content.slice(0, 500)}

请以 JSON 格式回复：{"approved": true/false, "reason": "审核意见（中文，30字以内）"}。只返回 JSON，不要其他内容。`;

    const res = await fetch("https://apihub.agnes-ai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "agnes-2.0-flash",
        messages: [
          { role: "system", content: "你是内容审核助手，只回复 JSON。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return JSON.stringify({ approved: false, reason: "AI 审核异常，留待人工审核" });
    return jsonMatch[0];
  } catch {
    return JSON.stringify({ approved: false, reason: "AI 服务不可用，留待人工审核" });
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const username = await getUser(request);
  if (!username) return Response.json({ error: "请先登录" }, { status: 401 });

  try {
    const { title, content, description, tags } = await request.json() as { title: string; content: string; description?: string; tags?: string[] };
    if (!title || !content) {
      return Response.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    const slug = username + "-" + Date.now().toString(36) + "-" + title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40);

    const apiKey = env.AGNES_API_KEY || "sk-PgeyxlzEeR5dl8P564bchKOemwXfKkwqmQCustpcCIp9axfc";

    const reviewRaw = await aiReview(title, content, tags || [], apiKey);
    let reviewResult: { approved: boolean; reason: string };
    try {
      reviewResult = JSON.parse(reviewRaw);
    } catch {
      reviewResult = { approved: false, reason: "AI 审核异常" };
    }

    const status: Submission["status"] = reviewResult.approved ? "approved" : "pending";

    const sub: Submission = {
      slug,
      title,
      content,
      author: username,
      description: description || content.slice(0, 100).replace(/[#*`\n]/g, ""),
      pubDatetime: new Date().toISOString(),
      tags: tags || [],
      username,
      status,
      aiReview: reviewResult.reason
    };

    await env.BLOG_KV.put("submission:" + slug, JSON.stringify(sub));

    const indexRaw = await env.BLOG_KV.get("submissions");
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    index.push(slug);
    await env.BLOG_KV.put("submissions", JSON.stringify(index));

    const userIndexRaw = await env.BLOG_KV.get("user:" + username + ":submissions");
    const userIndex: string[] = userIndexRaw ? JSON.parse(userIndexRaw) : [];
    userIndex.push(slug);
    await env.BLOG_KV.put("user:" + username + ":submissions", JSON.stringify(userIndex));

    return Response.json({
      success: true,
      slug,
      status,
      aiReview: reviewResult.reason
    });
  } catch {
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const username = await getUser(request);
  if (!username) return Response.json({ error: "请先登录" }, { status: 401 });

  const userIndexRaw = await env.BLOG_KV.get("user:" + username + ":submissions");
  const slugs: string[] = userIndexRaw ? JSON.parse(userIndexRaw) : [];
  const subs: Partial<Submission>[] = [];
  for (const s of slugs) {
    const raw = await env.BLOG_KV.get("submission:" + s);
    if (raw) {
      const sub = JSON.parse(raw) as Submission;
      subs.push({ slug: sub.slug, title: sub.title, description: sub.description, pubDatetime: sub.pubDatetime, status: sub.status, aiReview: sub.aiReview });
    }
  }
  subs.sort((a, b) => new Date(b.pubDatetime!).getTime() - new Date(a.pubDatetime!).getTime());
  return Response.json(subs);
}
