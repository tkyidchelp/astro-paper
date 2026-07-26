interface Env {
  BLOG_KV: KVNamespace;
  TURNSTILE_SECRET: string;
}

async function verifyTurnstile(token: string | undefined, secret: string, env: Env): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`
    });
    const data = await res.json() as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

function verifyCode(code: string, storedRaw: string | null): string | null {
  if (!storedRaw) return "验证码无效";
  const stored = JSON.parse(storedRaw) as { code: string; exp: number; tries: number };
  if (Date.now() > stored.exp) return "验证码已过期";
  if (stored.tries >= 3) return "验证码错误次数过多，请重新获取";
  if (stored.code !== code) return "验证码错误";
  return null;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    const { username, password, email, code, turnstile } = await request.json() as { username: string; password: string; email: string; code: string; turnstile?: string };

    if (!username || !password || !email || !code) {
      return Response.json({ error: "请填写所有字段" }, { status: 400 });
    }

    if (!(await verifyTurnstile(turnstile, env.TURNSTILE_SECRET, env))) {
      return Response.json({ error: "人机验证失败" }, { status: 400 });
    }
    if (username.length < 2 || username.length > 20) {
      return Response.json({ error: "用户名长度 2-20 个字符" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "密码至少 6 位" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const userKey = "user:" + username.toLowerCase();
    const exists = await env.BLOG_KV.get(userKey);
    if (exists) {
      return Response.json({ error: "用户名已存在" }, { status: 409 });
    }

    const codeKey = "code:" + email.toLowerCase();
    const storedRaw = await env.BLOG_KV.get(codeKey);
    const codeErr = verifyCode(code, storedRaw);
    if (codeErr) {
      return Response.json({ error: codeErr }, { status: 400 });
    }

    await env.BLOG_KV.delete(codeKey);

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username + ":" + password));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const createdAt = Date.now();
    await env.BLOG_KV.put(userKey, JSON.stringify({ password: hashHex, email: email.toLowerCase(), createdAt }));

    const token = await createToken(username, hashHex);

    return Response.json({ success: true, token, username, createdAt });
  } catch (e) {
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

async function createToken(username: string, hash: string): Promise<string> {
  const payload = JSON.stringify({ username, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const tokenB64 = btoa(payload);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(hash.slice(0, 32)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(tokenB64));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return tokenB64 + "." + sigHex;
}
