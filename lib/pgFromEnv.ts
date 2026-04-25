import pg from "pg";

function rawConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined
  );
}

/** Remove sslmode from URL so `ssl: { rejectUnauthorized: false }` applies (Vercel → Supabase pooler). */
export function stripSslQueryParams(cs: string): string {
  const q = cs.indexOf("?");
  if (q === -1) return cs;
  const base = cs.slice(0, q);
  const qs = cs.slice(q + 1);
  const parts = qs
    .split("&")
    .filter((p) => p && !/^sslmode=/i.test(p) && !/^sslrootcert=/i.test(p));
  return parts.length ? `${base}?${parts.join("&")}` : base;
}

export function createPgClient(): pg.Client {
  const raw = rawConnectionString();
  if (!raw) {
    throw new Error("Missing POSTGRES_URL (or NON_POOLING) for Postgres access.");
  }
  const cs = stripSslQueryParams(raw);
  const isLocal = cs.includes("localhost") || cs.includes("127.0.0.1");
  return new pg.Client({
    connectionString: cs,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
}

export async function withPg<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = createPgClient();
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}
