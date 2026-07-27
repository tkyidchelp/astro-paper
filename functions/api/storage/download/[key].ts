interface Env {
  BLOG_R2: R2Bucket;
}

export async function onRequestGet(context: { request: Request; env: Env; params: { key: string } }) {
  const { env, params } = context;
  const key = decodeURIComponent(params.key);
  try {
    const object = await env.BLOG_R2.get(key);
    if (!object) return new Response("文件不存在", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Disposition", 'attachment; filename="' + key + '"');
    headers.set("Cache-Control", "public, max-age=86400");
    return new Response(object.body, { headers });
  } catch {
    return new Response("下载失败", { status: 500 });
  }
}
