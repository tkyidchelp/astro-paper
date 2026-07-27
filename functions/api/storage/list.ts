interface Env {
  BLOG_R2: R2Bucket;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;
  try {
    const objects = await env.BLOG_R2.list();
    const files = objects.objects.map(o => ({
      key: o.key,
      size: o.size,
      uploaded: o.uploaded,
    }));
    return Response.json(files);
  } catch {
    return Response.json({ error: "获取文件列表失败" }, { status: 500 });
  }
}
