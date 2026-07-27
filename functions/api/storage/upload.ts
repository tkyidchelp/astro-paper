interface Env {
  BLOG_R2: R2Bucket;
}

async function getUser(request: Request): Promise<string | null | "admin" | { username: string } | undefined> {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;

  const parts = token.split(".");
  const payloadB64 = parts[0];
  const sigHex = parts[1];

  try {
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return null;

    // 尝试验证 admin-token（使用 ADMIN_PASSWORD 环境变量）
    const pwd = process.env.ADMIN_PASSWORD || "adminQw123456789";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(pwd), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const valid = await crypto.subtle.verify("HMAC", key, new TextEncoder().encode(payloadB64), sigBytes);
    if (valid && !payload.username) return "admin";

    // 尝试验证用户 blog-token（用户名从 payload 读取）
    const username = payload.username || null;
    if (username) return { username };

    return null;
  } catch {
    return null;
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const userRaw = await getUser(request);
  if (userRaw === null) return Response.json({ error: "未登录或权限不足" }, { status: 401 });

  let adminUser: string | null = null;
  if (typeof userRaw === "string") { // admin-token 返回 "admin"
    if (userRaw === "admin") adminUser = "admin";
    else return Response.json({ error: "仅管理员可上传" }, { status: 403 });
  } else if (typeof userRaw === "object" && userRaw.username) { // blog-token
    if (userRaw.username === "admin") adminUser = userRaw.username;
    else return Response.json({ error: "仅管理员可上传" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "未选择文件" }, { status: 400 });

    const key = file.name;
    await env.BLOG_R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { uploadedBy: adminUser || "admin" },
    });

    return Response.json({ success: true, key, size: file.size });
  } catch {
    return Response.json({ error: "上传失败" }, { status: 500 });
  }
}

export async function onRequestDelete(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const userRaw = await getUser(request);
  if (userRaw === null) return Response.json({ error: "未登录或权限不足" }, { status: 401 });

  let adminUser: string | null = null;
  if (typeof userRaw === "string") { // admin-token 返回 "admin"
    if (userRaw === "admin") adminUser = "admin";
    else return Response.json({ error: "仅管理员可删除" }, { status: 403 });
  } else if (typeof userRaw === "object" && userRaw.username) { // blog-token
    if (userRaw.username === "admin") adminUser = userRaw.username;
    else return Response.json({ error: "仅管理员可删除" }, { status: 403 });
  }

  try {
    const { key } = await request.json() as { key: string };
    if (!key) return Response.json({ error: "缺少文件名" }, { status: 400 });
    await env.BLOG_R2.delete(key);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
