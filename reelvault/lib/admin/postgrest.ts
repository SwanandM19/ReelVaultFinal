// Pure helpers for talking to Supabase's PostgREST API.

/** "0-24/137" (Content-Range) -> { from: 0, to: 24, total: 137 }. total is null when unknown. */
export function parseContentRange(header: string | null | undefined): { from: number; to: number; total: number | null } {
  const m = /^(\d+)-(\d+)\/(\d+|\*)$/.exec(header ?? "");
  if (m) return { from: Number(m[1]), to: Number(m[2]), total: m[3] === "*" ? null : Number(m[3]) };
  const empty = /^\*\/(\d+|\*)$/.exec(header ?? ""); // an empty page: "*/0"
  return { from: 0, to: -1, total: empty && empty[1] !== "*" ? Number(empty[1]) : empty ? null : 0 };
}

export interface QuerySpec {
  select?: string;
  /** column -> PostgREST operator expression, e.g. { status: "eq.OPEN" }. Callers must only pass validated values. */
  filters?: Record<string, string>;
  or?: string; // already-built "(a.ilike.*x*,b.ilike.*x*)" expression from safe terms
  order?: string; // "created_at.desc"
}

export function buildQuery(spec: QuerySpec): string {
  const p = new URLSearchParams();
  p.set("select", spec.select ?? "*");
  for (const [k, v] of Object.entries(spec.filters ?? {})) p.set(k, v);
  if (spec.or) p.set("or", spec.or);
  if (spec.order) p.set("order", spec.order);
  return p.toString();
}

/** Builds an "or" filter that matches a (pre-sanitised) term in any of the given columns. */
export function orIlike(columns: string[], term: string): string | undefined {
  return term ? `(${columns.map((c) => `${c}.ilike.*${term}*`).join(",")})` : undefined;
}
