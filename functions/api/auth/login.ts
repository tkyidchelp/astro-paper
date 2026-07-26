interface Env {
  BLOG_KV: KVNamespace;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return name.slice(0, 1) + "***" + name.slice(-1) + "@" + domain;
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

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    const { username, password, code } = await request.json() as { username: string; password: string; code?: string };
    if (!username || !password) {
      return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    const key = "user:" + username.toLowerCase();
    const raw = await env.BLOG_KV.get(key);
    if (!raw) {
      return Response.json({ error: "用户名不存在" }, { status: 401 });
    }

    const user = JSON.parse(raw) as { password: string; email: string; createdAt?: number };
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username + ":" + password));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (hashHex !== user.password) {
      return Response.json({ error: "密码错误" }, { status: 401 });
    }

    if (!code) {
      return Response.json({ needCode: true, maskedEmail: maskEmail(user.email) });
    }

    const codeKey = "code:" + user.email.toLowerCase();
    const storedRaw = await env.BLOG_KV.get(codeKey);
    if (!storedRaw) {
      return Response.json({ error: "请先发送验证码" }, { status: 400 });
    }
    const stored = JSON.parse(storedRaw) as { code: string; exp: number; tries: number };
    if (Date.now() > stored.exp) return Response.json({ error: "验证码已过期" }, { status: 400 });
    if (stored.tries >= 3) return Response.json({ error: "验证码错误次数过多，请重新获取" }, { status: 400 });
    if (stored.code !== code) {
      stored.tries++;
      await env.BLOG_KV.put(codeKey, JSON.stringify(stored));
      return Response.json({ error: "验证码错误" }, { status: 400 });
    }

    await env.BLOG_KV.delete(codeKey);

    const payload = JSON.stringify({ username, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const cKey = await crypto.subtle.importKey("raw", encoder.encode(hashHex.slice(0, 32)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cKey, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    const token = btoa(payload) + "." + sigHex;

    return Response.json({ success: true, token, username, createdAt: user.createdAt || null });
  } catch (e) {
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  const username = await verifyToken(token, env);
  return Response.json({ username });
}
