interface Env {
  BLOG_KV: KVNamespace;
  RESEND_KEY: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    const { email } = await request.json() as { email: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const code = generateCode();
    const key = "code:" + email.toLowerCase();
    await env.BLOG_KV.put(key, JSON.stringify({ code, exp: Date.now() + 300000, tries: 0 }));

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.RESEND_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "admin@yangchen.skin",
        to: email,
        subject: "验证码 - 杨宏轩的个人博客",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#333;">杨宏轩的个人博客</h2>
          <p>您的验证码是：</p>
          <p style="font-size:32px;font-weight:bold;color:#2563eb;letter-spacing:4px;margin:16px 0;">${code}</p>
          <p style="color:#666;">验证码 5 分钟内有效，请勿泄露。</p>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
          <p style="color:#999;font-size:12px;">如非本人操作，请忽略此邮件。</p>
        </div>`
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return Response.json({ error: "邮件发送失败，请稍后重试" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}
