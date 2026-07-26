interface Env {
  BLOG_KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    const { password } = await request.json() as { password: string };
    if (password !== env.ADMIN_PASSWORD) {
      return Response.json({ error: "密码错误" }, { status: 401 });
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const payload = JSON.stringify({ exp: Date.now() + 24 * 60 * 60 * 1000 });
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    const token = btoa(payload) + "." + sigHex;
    return Response.json({ success: true, token });
  } catch {
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return Response.json({ valid: false });
  try {
    const [payloadB64, sigHex] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return Response.json({ valid: false });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_PASSWORD), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadB64));
    return Response.json({ valid });
  } catch {
    return Response.json({ valid: false });
  }
}
