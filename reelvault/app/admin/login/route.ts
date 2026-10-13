import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin/auth";
import { attemptLogin } from "@/lib/admin/login";
import { clientAddress, cookieSecure, isSameOrigin } from "@/lib/admin/request";

export const dynamic = "force-dynamic";

const back = (error?: string) =>
  new NextResponse(null, { status: 303, headers: { Location: error ? `/admin?e=${error}` : "/admin", "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers.get("origin"), req.headers.get("host"), req.headers.get("x-forwarded-host"), req.headers.get("sec-fetch-site"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "");
  const password = String(form?.get("password") ?? "");

  const result = await attemptLogin(email, password, clientAddress(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip")));
  if (!result.ok) return back(result.reason);

  const res = back();
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure(req.headers.get("host"), process.env.NODE_ENV),
    path: "/admin",
    maxAge: result.maxAgeSeconds,
  });
  return res;
}
