import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4096;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReceiptPayload = {
  batchId?: unknown;
  quantity?: unknown;
  idempotencyKey?: unknown;
  reference?: unknown;
  notes?: unknown;
};

const boundedText = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length <= max ? value.trim() : "";

async function readLimitedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: "Cross-origin submission is not allowed." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  const authorization = request.headers.get("authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!tokenMatch) {
    return NextResponse.json({ error: "Sign in to record inventory receipts." }, { status: 401 });
  }

  const rawLength = request.headers.get("content-length");
  if (rawLength !== null && (!/^\d+$/.test(rawLength) || Number(rawLength) > MAX_BODY_BYTES)) {
    return NextResponse.json({ error: "Request is too large or has an invalid content length." }, { status: 413 });
  }

  let payload: ReceiptPayload;
  try {
    const raw = await readLimitedBody(request);
    if (raw === null) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    payload = JSON.parse(raw) as ReceiptPayload;
  } catch {
    return NextResponse.json({ error: "Please submit a valid inventory receipt." }, { status: 400 });
  }

  const batchId = boundedText(payload.batchId, 36);
  const idempotencyKey = boundedText(payload.idempotencyKey, 160);
  const reference = boundedText(payload.reference, 160);
  const notes = boundedText(payload.notes, 500);
  const quantity = payload.quantity;
  if (!UUID.test(batchId) || !Number.isSafeInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 100_000_000
    || idempotencyKey.length < 8
    || (typeof payload.reference === "string" && payload.reference.length > 160)
    || (typeof payload.notes === "string" && payload.notes.length > 500)) {
    return NextResponse.json({ error: "Check the batch, quantity, idempotency key, reference and notes." }, { status: 400 });
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

    const rpcResponse = await fetch(`${baseUrl}/rest/v1/rpc/record_product_batch_receipt`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_batch_id: batchId,
        p_quantity: Number(quantity),
        p_idempotency_key: idempotencyKey,
        p_reference: reference || null,
        p_notes: notes || null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!rpcResponse.ok) {
      const message = (await rpcResponse.text()).slice(0, 1000);
      if (rpcResponse.status === 401) {
        return NextResponse.json({ error: "Your session is invalid or expired. Sign in again." }, { status: 401 });
      }
      if (rpcResponse.status === 403 || message.includes("permission denied") || message.includes("administrator permission")) {
        return NextResponse.json({ error: "You do not have permission to record receipts for this organization." }, { status: 403 });
      }
      if (rpcResponse.status === 400 || rpcResponse.status === 422 || message.includes("Idempotency key reused")) {
        return NextResponse.json({ error: "Receipt details are invalid or the idempotency key was reused with different details." }, { status: 400 });
      }
      return NextResponse.json({ error: "Inventory receipt could not be recorded. Please retry safely." }, { status: 502 });
    }

    const movementId = await rpcResponse.json();
    return NextResponse.json({ ok: true, movementId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Inventory service timed out. Retry with the same idempotency key." }, { status: 502 });
  }
}
