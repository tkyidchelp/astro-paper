interface Env {
  BLOG_KV: KVNamespace;
  RESEND_KEY: string;
  TURNSTILE_SECRET: string;
}

async function verifyTurnstile(token: string | undefined, secret: string): Promise<boolean> {
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

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    const { email, code, newPassword, turnstile } = await request.json() as { email?: string; code?: string; newPassword?: string; turnstile?: string };

    if (email && !code) {
      if (!await verifyTurnstile(turnstile, env.TURNSTILE_SECRET)) {
        return Response.json({ error: "人机验证失败" }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
      }

      const foundUser = await findUserByEmail(env, email);
      if (!foundUser) {
        return Response.json({ error: "该邮箱未注册" }, { status: 404 });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      await env.BLOG_KV.put("reset:" + email.toLowerCase(), JSON.stringify({ code: resetCode, username: foundUser, exp: Date.now() + 300000, tries: 0 }));

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.RESEND_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "admin@yangchen.skin",
          to: email,
          subject: "密码重置 - 杨宏轩的个人博客",
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#333;">密码重置</h2>
            <p>您的重置验证码是：</p>
            <p style="font-size:32px;font-weight:bold;color:#2563eb;letter-spacing:4px;margin:16px 0;">${resetCode}</p>
            <p style="color:#666;">验证码 5 分钟内有效，请勿泄露。</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
            <p style="color:#999;font-size:12px;">如非本人操作，请忽略此邮件。</p>
          </div>`
        })
      });

      if (!res.ok) {
        return Response.json({ error: "邮件发送失败" }, { status: 500 });
      }

      return Response.json({ success: true, maskedEmail: email.slice(0, 1) + "***" + email.slice(email.indexOf("@")) });
    }

    if (email && code && newPassword) {
      if (newPassword.length < 6) {
        return Response.json({ error: "密码至少 6 位" }, { status: 400 });
      }

      const key = "reset:" + email.toLowerCase();
      const raw = await env.BLOG_KV.get(key);
      if (!raw) return Response.json({ error: "请先获取验证码" }, { status: 400 });

      const stored = JSON.parse(raw) as { code: string; username: string; exp: number; tries: number };
      if (Date.now() > stored.exp) return Response.json({ error: "验证码已过期" }, { status: 400 });
      if (stored.tries >= 3) return Response.json({ error: "验证码错误次数过多" }, { status: 400 });
      if (stored.code !== code) {
        stored.tries++;
        await env.BLOG_KV.put(key, JSON.stringify(stored));
        return Response.json({ error: "验证码错误" }, { status: 400 });
      }

      await env.BLOG_KV.delete(key);

      const userKey = "user:" + stored.username;
      const userRaw = await env.BLOG_KV.get(userKey);
      if (!userRaw) return Response.json({ error: "用户不存在" }, { status: 404 });

      const user = JSON.parse(userRaw) as { password: string; email: string; createdAt?: number };
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(stored.username + ":" + newPassword));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      user.password = hashHex;
      await env.BLOG_KV.put(userKey, JSON.stringify(user));

      return Response.json({ success: true });
    }

    return Response.json({ error: "无效请求" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

async function findUserByEmail(env: Env, email: string): Promise<string | null> {
  const index = await env.BLOG_KV.get("admin:posts");
  const list = await env.BLOG_KV.list({ prefix: "user:" });
  for (const key of list.keys) {
    const raw = await env.BLOG_KV.get(key.name);
    if (raw) {
      try {
        const user = JSON.parse(raw) as { email?: string };
        if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
          return key.name.replace("user:", "");
        }
      } catch {}
    }
  }
  return null;
}
