interface Env {
  BLOG_KV: KVNamespace;
}

const SOURCES = [
  { name: "vvhan", url: "https://api.vvhan.com/api/hotlist", key: "data" },
  { name: "tenapi", url: "https://tenapi.cn/v2/hotlist", key: "data" },
];

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;

  const cached = await env.BLOG_KV.get("news:cache");
  if (cached) {
    const obj = JSON.parse(cached) as { time: number; data: Array<{ index?: number; title?: string; desc?: string; url?: string; hot?: string }> };
    if (Date.now() - obj.time < 30 * 60 * 1000) {
      return Response.json({ success: true, data: obj.data, cached: true });
    }
  }

  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const json = await res.json() as Record<string, unknown>;
      const items = extractItems(json, src.key);
      if (items && items.length > 0) {
        await env.BLOG_KV.put("news:cache", JSON.stringify({ time: Date.now(), data: items }));
        return Response.json({ success: true, data: items });
      }
    } catch {}
  }

  const fallback = [
    { index: 1, title: "API 暂不可用，请稍后刷新", url: "#", desc: "" },
  ];
  return Response.json({ success: true, data: fallback });
}

function extractItems(json: Record<string, unknown>, key: string): Array<{ index?: number; title?: string; desc?: string; url?: string; hot?: string }> | null {
  let items: unknown;
  if (key.includes(".")) {
    const parts = key.split(".");
    let current: unknown = json;
    for (const p of parts) {
      if (current && typeof current === "object") current = (current as Record<string, unknown>)[p];
      else return null;
    }
    items = current;
  } else {
    items = json[key];
  }

  if (!Array.isArray(items) || items.length === 0) return null;

  return items.slice(0, 10).map((item: Record<string, unknown>, i: number) => ({
    index: (item.index as number) || (i + 1),
    title: (item.title as string) || (item.desc as string) || "无标题",
    desc: (item.desc as string) || "",
    url: (item.url as string) || "#",
    hot: (item.hot as string) || "",
  }));
}
