// Security-critical pure logic of the admin dashboard. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { signSession, verifySession } from "../lib/admin/session.ts";
import { parseAdminEmails, isAdminEmail } from "../lib/admin/allowlist.ts";
import { createLimiter } from "../lib/admin/rate-limit.ts";
import { safeHref, safeSearchTerm, parsePage, pickOne, isUuid } from "../lib/admin/safe.ts";
import { formatMoney, formatDate, humanize, maskToken, timeAgo } from "../lib/admin/format.ts";
import { parseContentRange, buildQuery, orIlike } from "../lib/admin/postgrest.ts";

const SECRET = "x".repeat(40);
const NOW = 1_800_000_000;
const good = { sub: "u1", email: "a@b.co", iat: NOW - 10, exp: NOW + 3600 };

// ── Session cookie ───────────────────────────────────────────────────────────
test("session: a freshly signed session verifies", () => {
  assert.deepEqual(verifySession(signSession(good, SECRET), SECRET, NOW), good);
});
test("session: expired sessions are refused", () => {
  const t = signSession({ ...good, exp: NOW - 1 }, SECRET);
  assert.equal(verifySession(t, SECRET, NOW), null);
});
test("session: a session issued in the future is refused", () => {
  assert.equal(verifySession(signSession({ ...good, iat: NOW + 3600 }, SECRET), SECRET, NOW), null);
});
test("session: wrong secret is refused", () => {
  assert.equal(verifySession(signSession(good, SECRET), "y".repeat(40), NOW), null);
});
test("session: any change to the payload or signature is refused", () => {
  const [body, sig] = signSession(good, SECRET).split(".");
  const forged = Buffer.from(JSON.stringify({ ...good, email: "evil@x.co" })).toString("base64url");
  assert.equal(verifySession(`${forged}.${sig}`, SECRET, NOW), null);
  assert.equal(verifySession(`${body}.${sig.slice(0, -2)}AA`, SECRET, NOW), null);
  assert.equal(verifySession(`${body}.`, SECRET, NOW), null);
  assert.equal(verifySession(`${body}`, SECRET, NOW), null);
});
test("session: garbage never throws and never verifies", () => {
  for (const t of [undefined, null, "", ".", "a.b.c", "not a token", "%%%.%%%", "e30.e30"]) assert.equal(verifySession(t, SECRET, NOW), null);
});
test("session: payload with the wrong shape is refused even if correctly signed", () => {
  for (const bad of [{}, { sub: 1, email: "a@b.co", iat: NOW, exp: NOW + 5 }, { sub: "u", email: "a@b.co", iat: "x", exp: NOW + 5 }]) {
    assert.equal(verifySession(signSession(bad, SECRET), SECRET, NOW), null);
  }
});
test("session: a missing or weak secret disables sessions entirely", () => {
  assert.throws(() => signSession(good, "short"));
  assert.equal(verifySession(signSession(good, SECRET), "", NOW), null);
  assert.equal(verifySession(signSession(good, SECRET), "short", NOW), null);
});

// ── Allowlist ────────────────────────────────────────────────────────────────
test("allowlist: parsing is forgiving, matching is case-insensitive", () => {
  const list = parseAdminEmails(" Admin@Example.com , other@x.io,,not-an-email,admin@example.com ");
  assert.deepEqual(list, ["admin@example.com", "other@x.io"]);
  assert.equal(isAdminEmail("ADMIN@example.COM", list), true);
  assert.equal(isAdminEmail("nobody@example.com", list), false);
});
test("allowlist: empty / unset means nobody is an admin", () => {
  for (const raw of [undefined, null, "", "   ", ",,,"]) {
    const list = parseAdminEmails(raw);
    assert.deepEqual(list, []);
    assert.equal(isAdminEmail("a@b.co", list), false);
  }
  assert.equal(isAdminEmail("", ["a@b.co"]), false);
  assert.equal(isAdminEmail(undefined, ["a@b.co"]), false);
});

// ── Login rate limiting ──────────────────────────────────────────────────────
test("limiter: allows max attempts then blocks until the window ends", () => {
  const l = createLimiter(3, 1000);
  assert.deepEqual([1, 2, 3].map(() => l.hit("ip", 0).ok), [true, true, true]);
  const blocked = l.hit("ip", 10);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
  assert.equal(l.hit("other", 10).ok, true);      // separate keys are independent
  assert.equal(l.hit("ip", 1001).ok, true);       // new window
});
test("limiter: reset clears the counter", () => {
  const l = createLimiter(1, 1000);
  l.hit("k", 0); assert.equal(l.hit("k", 1).ok, false);
  l.reset("k"); assert.equal(l.hit("k", 2).ok, true);
});

// ── Rendering / query safety ─────────────────────────────────────────────────
test("safeHref: only http(s) links are produced", () => {
  assert.equal(safeHref("https://instagram.com/reel/abc/"), "https://instagram.com/reel/abc/");
  assert.equal(safeHref("http://example.com/a"), "http://example.com/a");
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>1</script>", "file:///etc/passwd", "ftp://x.co", "//evil.co", "not a url", "", null, undefined, 42, "https://" + "a".repeat(3000) + ".co"]) {
    assert.equal(safeHref(bad), null, String(bad));
  }
});
test("safeSearchTerm: cannot inject filter syntax", () => {
  assert.equal(safeSearchTerm("pasta"), "pasta");
  assert.equal(safeSearchTerm("a,status.eq.OPEN)"), "a status eq OPEN");
  assert.equal(safeSearchTerm("*%\\\"(),:."), "");
  assert.equal(safeSearchTerm("x".repeat(500)).length, 80);
  assert.equal(safeSearchTerm(undefined), "");
  assert.equal(safeSearchTerm(["a", "b"]), "a b");
});
test("parsePage / pickOne / isUuid", () => {
  assert.equal(parsePage("3"), 3); assert.equal(parsePage(["4", "5"]), 4);
  for (const bad of ["0", "-2", "abc", "", undefined, "999999999"]) assert.equal(parsePage(bad), 1);
  assert.equal(pickOne("OPEN", ["OPEN", "RESOLVED"]), "OPEN");
  assert.equal(pickOne("DROP TABLE", ["OPEN"]), undefined);
  assert.equal(pickOne(["OPEN", "x"], ["OPEN"]), "OPEN");
  assert.equal(isUuid("11111111-1111-1111-1111-111111111111"), true);
  assert.equal(isUuid("1; drop table"), false); assert.equal(isUuid(undefined), false);
});

// ── Formatting ───────────────────────────────────────────────────────────────
test("format: money is shown from paise, with the right symbol", () => {
  assert.equal(formatMoney(100, "INR"), "₹1.00");
  assert.equal(formatMoney(123456, "INR"), "₹1,234.56");
  assert.equal(formatMoney(500, "USD"), "USD 5.00");
  assert.equal(formatMoney(null), "—"); assert.equal(formatMoney(NaN), "—");
});
test("format: dates, tokens, relative time", () => {
  assert.equal(formatDate("2026-10-11T18:05:09Z"), "11 Oct 2026, 18:05");
  assert.equal(formatDate("2026-10-11T18:05:09Z", false), "11 Oct 2026");
  assert.equal(formatDate("2026-01-03T00:00:00+05:30"), "2 Jan 2026, 18:30");  // shown in UTC whatever the input offset
  assert.equal(humanize("FREE_TRIAL"), "Free trial"); assert.equal(humanize("PAYMENT_FAILED"), "Payment failed");
  assert.equal(humanize("captured"), "Captured"); assert.equal(humanize(null), ""); assert.equal(humanize("IN_PROGRESS"), "In progress");
  assert.equal(formatDate(null), "—"); assert.equal(formatDate("garbage"), "—");
  assert.equal(maskToken("ExponentPushToken[abcdefghijklmnopqrstuvwxyz]"), "ExponentPushToken[abcd…");
  assert.ok(!maskToken("ExponentPushToken[abcdefghijklmnopqrstuvwxyz]").includes("xyz"));
  assert.equal(maskToken(null), "—");
  assert.equal(timeAgo("2026-10-11T00:00:00Z", Date.parse("2026-10-11T00:03:00Z")), "3 min ago");
});

// ── PostgREST helpers ────────────────────────────────────────────────────────
test("parseContentRange", () => {
  assert.deepEqual(parseContentRange("0-24/137"), { from: 0, to: 24, total: 137 });
  assert.deepEqual(parseContentRange("25-49/*"), { from: 25, to: 49, total: null });
  assert.deepEqual(parseContentRange("*/0"), { from: 0, to: -1, total: 0 });
  assert.deepEqual(parseContentRange(undefined), { from: 0, to: -1, total: 0 });
});
test("buildQuery / orIlike", () => {
  assert.equal(buildQuery({ select: "id,title", filters: { status: "eq.OPEN" }, order: "created_at.desc" }), "select=id%2Ctitle&status=eq.OPEN&order=created_at.desc");
  assert.equal(orIlike(["title", "creator"], "pasta"), "(title.ilike.*pasta*,creator.ilike.*pasta*)");
  assert.equal(orIlike(["title"], ""), undefined);
});

// ── Login / logout request checks ────────────────────────────────────────────
import { isSameOrigin, clientAddress, cookieSecure } from "../lib/admin/request.ts";
test("isSameOrigin: only the site's own forms are accepted", () => {
  assert.equal(isSameOrigin("https://reelvault.app", "reelvault.app"), true);
  assert.equal(isSameOrigin("https://reelvault.app", "evil.example"), false);
  assert.equal(isSameOrigin("https://evil.example", "reelvault.app"), false);
  assert.equal(isSameOrigin("https://reelvault.app.evil.example", "reelvault.app"), false);
  assert.equal(isSameOrigin(null, "reelvault.app"), false);          // no Origin header: refused
  assert.equal(isSameOrigin("null", "reelvault.app"), false);
  assert.equal(isSameOrigin("https://public.example", "internal:3000", "public.example"), true); // behind a proxy
});
test("isSameOrigin: trusts the browser's Sec-Fetch-Site (a same-site form post can carry Origin: null)", () => {
  assert.equal(isSameOrigin("null", "reelvault.app", null, "same-origin"), true);   // the real-browser case that was rejected
  assert.equal(isSameOrigin(null, "reelvault.app", null, "same-origin"), true);
  assert.equal(isSameOrigin("https://evil.example", "reelvault.app", null, "cross-site"), false);
  assert.equal(isSameOrigin("https://reelvault.app", "reelvault.app", null, "cross-site"), false); // header wins over a matching Origin
  assert.equal(isSameOrigin("https://reelvault.app", "reelvault.app", null, "same-site"), false);   // a sibling subdomain is not us
  assert.equal(isSameOrigin("null", "reelvault.app", null, null), false);                            // no Sec-Fetch-Site: Origin "null" is refused
});
test("clientAddress: first forwarded hop, then real ip, then shared bucket", () => {
  assert.equal(clientAddress("1.2.3.4, 10.0.0.1"), "1.2.3.4");
  assert.equal(clientAddress("", "5.6.7.8"), "5.6.7.8");
  assert.equal(clientAddress(null, null), "unknown");
});
test("cookieSecure: secure in production, not on localhost", () => {
  assert.equal(cookieSecure("reelvault.app", "production"), true);
  assert.equal(cookieSecure("localhost:3000", "production"), false);
  assert.equal(cookieSecure("127.0.0.1:3000", "production"), false);
  assert.equal(cookieSecure("localhost:3000", "development"), false);
  assert.equal(cookieSecure("reelvault.app", "development"), false);
});

// ── Account actions ──────────────────────────────────────────────────────────
import { parseAction, confirmationMatches, cleanNote, readBackendConfig, pickMessage, DONE_MESSAGES, ERROR_MESSAGES } from "../lib/admin/actions.ts";
test("parseAction: only the three known actions", () => {
  for (const a of ["suspend", "unsuspend", "delete"]) assert.equal(parseAction(a), a);
  for (const bad of ["", "Delete", "DELETE", "ban", "delete ", "../delete", null, undefined, 1, ["delete"]]) assert.equal(parseAction(bad), null);
});
test("confirmationMatches: the exact email must be typed back (case and outer spaces don't matter)", () => {
  assert.equal(confirmationMatches("person@example.com", "person@example.com"), true);
  assert.equal(confirmationMatches("  Person@Example.COM ", "person@example.com"), true);
  for (const typed of ["", "   ", "person@example.co", "person", "someone@example.com", "person@example.com extra", null, undefined, 5]) {
    assert.equal(confirmationMatches(typed, "person@example.com"), false, String(typed));
  }
  assert.equal(confirmationMatches("anything", ""), false);       // no email on file: nothing can be confirmed
  assert.equal(confirmationMatches("", ""), false);
  assert.equal(confirmationMatches("x", null), false);
});
test("cleanNote: one tidy line, never more than 300 characters", () => {
  assert.equal(cleanNote("  spam   reported\n\tby\u0000 two users "), "spam reported by two users");
  assert.equal(cleanNote("x".repeat(500)).length, 300);
  for (const empty of ["", "   ", "\n\n", null, undefined, 7]) assert.equal(cleanNote(empty), undefined);
});
test("readBackendConfig: both the address and a long enough key are needed", () => {
  const key = "k".repeat(24);
  assert.deepEqual(readBackendConfig({ BACKEND_URL: "https://api.example.com/", ADMIN_API_KEY: ` ${key} ` }), { url: "https://api.example.com", key });
  for (const env of [{}, { BACKEND_URL: "https://api.example.com" }, { ADMIN_API_KEY: key }, { BACKEND_URL: "api.example.com", ADMIN_API_KEY: key },
    { BACKEND_URL: "ftp://x.co", ADMIN_API_KEY: key }, { BACKEND_URL: "https://api.example.com", ADMIN_API_KEY: "short" }]) {
    assert.equal(readBackendConfig(env), null);
  }
});
test("pickMessage: only known keys produce text, so the URL can never inject any", () => {
  assert.equal(pickMessage(DONE_MESSAGES, "deleted"), "The account was deleted.");
  assert.match(pickMessage(ERROR_MESSAGES, "billing"), /NOT deleted/);
  for (const key of ["<script>alert(1)</script>", "__proto__", "constructor", "toString", "", undefined, ["deleted"]]) assert.equal(pickMessage(DONE_MESSAGES, key), undefined);
});
