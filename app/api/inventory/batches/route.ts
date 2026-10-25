import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!tokenMatch) {
    return NextResponse.json({ error: "Sign in to view inventory batches." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Inventory service is not configured." }, { status: 503 });
  }

  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const bearer = tokenMatch[1];
  try {
    const authResponse = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!authResponse.ok) {
      return NextResponse.json({ error: "Your session is invalid or expired. Sign in again." }, { status: 401 });
    }

    // The caller's JWT is forwarded so Postgres RLS remains the tenant boundary.
    const query = new URLSearchParams({
      select: "id,batch_number,stock_quantity,reserved_quantity,expires_on,warehouse_code,variant_id,manufacturer_org_id",
      order: "expires_on.asc.nullslast",
      limit: "100",
    });
    const response = await fetch(`${baseUrl}/rest/v1/product_batches?${query.toString()}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${bearer}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: "Your session is invalid or expired. Sign in again." }, { status: 401 });
      }
      return NextResponse.json({ error: "Inventory batches could not be loaded." }, { status: 502 });
    }
    const batches = (await response.json()) as unknown;
    return NextResponse.json({ batches }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Inventory service timed out. Try again." }, { status: 502 });
  }
}
