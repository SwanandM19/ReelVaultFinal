// Who may use the admin dashboard: an explicit allowlist of emails (ADMIN_EMAILS). Empty list = nobody (fail closed).

export function parseAdminEmails(raw: string | undefined | null): string[] {
  return [...new Set((raw ?? "").split(",").map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
}

export function isAdminEmail(email: string | undefined | null, allowlist: string[]): boolean {
  return !!email && allowlist.includes(email.trim().toLowerCase());
}
