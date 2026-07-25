export async function onRequestPost(context: { request: Request; env: { BLOG_KV: KVNamespace } }) {
  const { request, env } = context;
  try {
    const { username, password } = await request.json() as { username: string; password: string };

    if (!username || !password) {
      return Response.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }
    if (username.length < 2 || username.length > 20) {
      return Response.json({ error: "用户名长度 2-20 个字符" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const key = "user:" + username.toLowerCase();
    const exists = await env.BLOG_KV.get(key);
    if (exists) {
      return Response.json({ error: "用户名已存在" }, { status: 409 });
    }

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username + ":" + password));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    await env.BLOG_KV.put(key, JSON.stringify({ password: hashHex, createdAt: Date.now() }));

    const token = await createToken(username, hashHex);

    return Response.json({ success: true, token, username, createdAt: Date.now() });
  } catch (e) {
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

async function createToken(username: string, hash: string): Promise<string> {
  const payload = JSON.stringify({ username, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(hash.slice(0, 32)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return btoa(payload) + "." + sigHex;
}
