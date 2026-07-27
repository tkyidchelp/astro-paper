interface Env {
  BLOG_KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

interface Post {
  slug: string;
  title: string;
  author: string;
  description: string;
  pubDatetime: string;
  tags: string[];
  featured: boolean;
  content: string;
}

async function checkAdmin(request: Request, env: Env): Promise<boolean> {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return false;
  try {
    const [payloadB64, sigHex] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return false;
    const pwd = env.ADMIN_PASSWORD || "admin123";
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pwd), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadB64));
  } catch {
    return false;
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const subType = url.searchParams.get("type");

  if (subType === "submissions") {
    if (!await checkAdmin(request, env)) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }
    const subIndexRaw = await env.BLOG_KV.get("submissions");
    const subSlugs: string[] = subIndexRaw ? JSON.parse(subIndexRaw) : [];
    const subs: Array<Record<string, unknown>> = [];
    for (const s of subSlugs) {
      const raw = await env.BLOG_KV.get("submission:" + s);
      if (raw) subs.push(JSON.parse(raw));
    }
    subs.sort((a, b) => Number(new Date(b.pubDatetime as string)) - Number(new Date(a.pubDatetime as string)));
    return Response.json(subs);
  }

  const slug = url.searchParams.get("slug");

  if (!slug) {
    const indexRaw = await env.BLOG_KV.get("admin:posts");
    const slugs: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    const posts: Partial<Post>[] = [];
    for (const s of slugs) {
      const raw = await env.BLOG_KV.get("admin:post:" + s);
      if (raw) {
        const post = JSON.parse(raw) as Post;
        posts.push({ slug: post.slug, title: post.title, description: post.description, pubDatetime: post.pubDatetime, tags: post.tags, featured: post.featured });
      }
    }
    const subIndexRaw = await env.BLOG_KV.get("submissions");
    const subSlugs: string[] = subIndexRaw ? JSON.parse(subIndexRaw) : [];
    for (const s of subSlugs) {
      const raw = await env.BLOG_KV.get("submission:" + s);
      if (raw) {
        const sub = JSON.parse(raw) as { slug: string; title: string; description: string; pubDatetime: string; tags: string[]; status: string; username: string; content: string };
        if (sub.status === "approved") {
          posts.push({ slug: sub.slug, title: "[投稿] " + sub.title, description: sub.description, pubDatetime: sub.pubDatetime, tags: sub.tags, featured: false });
        }
      }
    }
    posts.sort((a, b) => new Date(b.pubDatetime!).getTime() - new Date(a.pubDatetime!).getTime());
    return Response.json(posts);
  }

  const raw = await env.BLOG_KV.get("admin:post:" + slug);
  if (!raw) {
    const subRaw = await env.BLOG_KV.get("submission:" + slug);
    if (!subRaw) return Response.json({ error: "未找到" }, { status: 404 });
    return Response.json(JSON.parse(subRaw));
  }
  return Response.json(JSON.parse(raw));
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (!await checkAdmin(request, env)) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;

  if (body.action === "review") {
    const slug = body.slug as string;
    const status = body.status as string;
    if (!slug || !status) return Response.json({ error: "缺少 slug 或 status" }, { status: 400 });
    const subRaw = await env.BLOG_KV.get("submission:" + slug);
    if (!subRaw) return Response.json({ error: "投稿不存在" }, { status: 404 });
    const sub = JSON.parse(subRaw);
    sub.status = status;
    await env.BLOG_KV.put("submission:" + slug, JSON.stringify(sub));
    return Response.json({ success: true });
  }

  const post = body as unknown as Post;
  if (!post.slug || !post.title || !post.content) {
    return Response.json({ error: "slug、标题和内容不能为空" }, { status: 400 });
  }

  post.pubDatetime = post.pubDatetime || new Date().toISOString();
  post.author = post.author || "杨宏轩";
  post.tags = post.tags || [];
  post.featured = post.featured || false;

  const exists = await env.BLOG_KV.get("admin:post:" + post.slug);
  await env.BLOG_KV.put("admin:post:" + post.slug, JSON.stringify(post));

  if (!exists) {
    const indexRaw = await env.BLOG_KV.get("admin:posts");
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    index.push(post.slug);
    await env.BLOG_KV.put("admin:posts", JSON.stringify(index));
  }

  return Response.json({ success: true, slug: post.slug });
}

export async function onRequestDelete(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (!await checkAdmin(request, env)) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return Response.json({ error: "缺少 slug" }, { status: 400 });

  await env.BLOG_KV.delete("admin:post:" + slug);
  const indexRaw = await env.BLOG_KV.get("admin:posts");
  if (indexRaw) {
    const index: string[] = JSON.parse(indexRaw);
    await env.BLOG_KV.put("admin:posts", JSON.stringify(index.filter(s => s !== slug)));
  }

  return Response.json({ success: true });
}
