import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin/auth";
import { cookieSecure, isSameOrigin } from "@/lib/admin/request";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers.get("origin"), req.headers.get("host"), req.headers.get("x-forwarded-host"), req.headers.get("sec-fetch-site"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const res = new NextResponse(null, { status: 303, headers: { Location: "/admin", "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure(req.headers.get("host"), process.env.NODE_ENV),
    path: "/admin",
    maxAge: 0,
  });
  return res;
}
