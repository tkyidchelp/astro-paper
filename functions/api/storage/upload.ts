interface Env {
  BLOG_R2: R2Bucket;
  ADMIN_PASSWORD: string;
}

async function getUser(request: Request, env: Env): Promise<string | null | "admin" | { username: string }> {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;

  const parts = token.split(".");
  const payloadB64 = parts[0];
  const sigHex = parts[1];

  try {
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return null;

    // 尝试验证 admin-token（使用 ADMIN_PASSWORD）
    const pwd = env.ADMIN_PASSWORD || "admin123";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(pwd), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = new UintArray(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const valid = await crypto.subtle.verify("HMAC", key, new TextEncoder().encode(payloadB64), new Uint8Array(sigBytes));
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
  const user = await getUser(request, env);
  if (user === null) return Response.json({ error: "未登录或权限不足" }, { status: 401 });
  if (typeof user === "string") { // admin-token 返回 "admin"
    if (user !== "admin") return Response.json({ error: "仅管理员可上传" }, { status: 403 });
    user = "admin";
  } else {
    if (user.username !== "admin") return Response.json({ error: "仅管理员可上传" }, { status: 403 });
    user = user.username;
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "未选择文件" }, { status: 400 });
    const key = file.name;
    await env.BLOG_R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { uploadedBy: user },
    });
    return Response.json({ success: true, key, size: file.size });
  } catch {
    return Response.json({ error: "上传失败" }, { status: 500 });
  }
}

export async function onRequestDelete(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const user = await getUser(request, env);
  if (user === null) return Response.json({ error: "未登录或权限不足" }, { status: 401 });
  if (typeof user === "string") {
    if (user !== "admin") return Response.json({ error: "仅管理员可删除" }, { status: 403 });
    user = "admin";
  } else {
    if (user.username !== "admin") return Response.json({ error: "仅管理员可删除" }, { status: 403 });
    user = user.username;
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
