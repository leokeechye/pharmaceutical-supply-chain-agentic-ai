import { NextRequest } from "next/server";

// Runtime proxy: forwards /api/* from the frontend to the FastAPI backend.
// BACKEND_URL is read PER REQUEST (runtime), so setting it as a Railway service
// variable on the frontend takes effect on the next deploy without a rebuild.
// This replaces next.config rewrites, whose destinations are baked at build time.
const backendBase = () =>
  (process.env.BACKEND_URL || "http://localhost:1020").replace(/\/+$/, "");

async function proxy(req: NextRequest, path: string[]) {
  const target = `${backendBase()}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ detail: `Proxy error reaching backend: ${(err as Error).message}` }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
