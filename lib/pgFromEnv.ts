import pg from "pg";

function rawConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined
  );
}

/** Remove sslmode/sslrootcert from URL; `pg` uses the `ssl` option below instead. */
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
  if (isLocal) {
    return new pg.Client({ connectionString: cs });
  }
  // Supabase pooler (and similar) often uses a chain Node rejects; default matches that.
  const strict = process.env.POSTGRES_TLS_STRICT?.trim().toLowerCase();
  const verifyTls = strict === "1" || strict === "true";
  return new pg.Client({
    connectionString: cs,
    ssl: { rejectUnauthorized: verifyTls },
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
