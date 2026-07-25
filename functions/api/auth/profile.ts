interface Env {
  BLOG_KV: KVNamespace;
}

async function verifyToken(token: string, env: Env): Promise<string | null> {
  try {
    const [payloadB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return null;

    const key = "user:" + payload.username.toLowerCase();
    const raw = await env.BLOG_KV.get(key);
    if (!raw) return null;
    const user = JSON.parse(raw) as { password: string };

    const encoder = new TextEncoder();
    const cKey = await crypto.subtle.importKey("raw", encoder.encode(user.password.slice(0, 32)), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigHex = token.split(".")[1];
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const valid = await crypto.subtle.verify("HMAC", cKey, sigBytes, encoder.encode(payloadB64));
    return valid ? payload.username : null;
  } catch {
    return null;
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  
  if (!token) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const username = await verifyToken(token, env);
  if (!username) {
    return Response.json({ error: "登录已过期" }, { status: 401 });
  }

  const key = "user:" + username.toLowerCase();
  const raw = await env.BLOG_KV.get(key);
  if (!raw) {
    return Response.json({ error: "用户不存在" }, { status: 404 });
  }

  const user = JSON.parse(raw) as { password: string; createdAt?: number };
  return Response.json({ 
    username: username,
    createdAt: user.createdAt || null
  });
}
