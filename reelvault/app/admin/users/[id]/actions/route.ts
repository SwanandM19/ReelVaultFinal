import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { cleanNote, confirmationMatches, parseAction, readBackendConfig } from "@/lib/admin/actions";
import { runAccountAction } from "@/lib/admin/backend";
import { getUserForAction } from "@/lib/admin/data";
import { isSameOrigin } from "@/lib/admin/request";
import { isUuid } from "@/lib/admin/safe";

export const dynamic = "force-dynamic";

const go = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });

/**
 * Suspend / reinstate / delete one account. Everything is checked here, on the server, in this order: same-site
 * request, signed-in admin, valid target, target is not an admin, the typed confirmation (deletes), then the backend.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req.headers.get("origin"), req.headers.get("host"), req.headers.get("x-forwarded-host"), req.headers.get("sec-fetch-site"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const admin = await getAdmin();
  if (!admin) return go("/admin");

  const { id } = await ctx.params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });
  const back = (error: string) => go(`/admin/users/${id}?error=${error}`);

  const form = await req.formData().catch(() => null);
  const action = parseAction(form?.get("action"));
  if (!form || !action) return back("bad");
  if (!readBackendConfig()) return back("noconfig");

  const target = await getUserForAction(id);
  if (!target) return back("missing");
  if (target.isAdmin) return back("protected");
  if (target.email && target.email.toLowerCase() === admin.email.toLowerCase()) return back("self");
  if (action === "delete" && !confirmationMatches(form.get("confirm_email"), target.email)) {
    return go(`/admin/users/${id}/confirm?action=delete&error=mismatch`);
  }

  const result = await runAccountAction(id, action, admin.email, cleanNote(form.get("note")));
  if (!result.ok) return back(result.error);
  if (action === "delete") return go("/admin/users?done=deleted");
  return go(`/admin/users/${id}?done=${action === "suspend" ? "suspended" : "active"}`);
}
