import { NextResponse } from "next/server";

export const runtime = "nodejs";

type QuotePayload = {
  requestKey?: unknown;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  product?: unknown;
  quantity?: unknown;
  unit?: unknown;
  delivery?: unknown;
  notes?: unknown;
  consent?: unknown;
  website?: unknown;
};

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length <= max ? value.trim() : "";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  if (origin && new URL(origin).origin !== requestUrl.origin) {
    return NextResponse.json({ error: "Cross-origin submission is not allowed." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8192) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let payload: QuotePayload;
  try {
    payload = (await request.json()) as QuotePayload;
  } catch {
    return NextResponse.json({ error: "Please submit a valid form." }, { status: 400 });
  }

  // Honeypot: silently accept bot submissions without storing them.
  if (typeof payload.website === "string" && payload.website.trim()) {
    return NextResponse.json({ ok: true, requestId: null }, { status: 202 });
  }

  const requestKey = text(payload.requestKey, 36);
  const name = text(payload.name, 100);
  const phone = text(payload.phone, 10);
  const email = text(payload.email, 254);
  const product = text(payload.product, 200);
  const delivery = text(payload.delivery, 160);
  const notes = text(payload.notes, 1000);
  const unit = text(payload.unit, 16);
  const quantity = Number(payload.quantity);

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(requestKey) || name.length < 2 || !/^[6-9]\d{9}$/.test(phone)
    || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    || product.length < 2 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10_000_000
    || !["packs", "units", "cartons", "kg", "litres"].includes(unit)
    || payload.consent !== true\n    || (typeof payload.delivery === "string" && payload.delivery.length > 160)
    || (typeof payload.notes === "string" && payload.notes.length > 1000)) {
    return NextResponse.json({ error: "Check your name, 10-digit Indian mobile number, product, quantity and unit." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Quote submission is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/submit_marketplace_quote`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_request_key: requestKey,
        p_contact_name: name,
        p_contact_phone: phone,
        p_contact_email: email || null,
        p_product_request: product,
        p_quantity: quantity,
        p_unit: unit,\n        p_contact_consent: true,
        p_delivery_location: delivery || null,
        p_notes: notes || null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json({ error: "We couldn't reach the quote service. Please try again shortly." }, { status: 502 });
  }

  if (!response.ok) {
    const providerMessage = (await response.text()).slice(0, 1200);
    if (providerMessage.includes("Quote request limit reached")) {
      return NextResponse.json({ error: "This mobile number has reached the quote request limit for today." }, { status: 429 });
    }
    if (response.status === 400 || response.status === 422) {
      return NextResponse.json({ error: "Some quote details are invalid. Please review the form." }, { status: 400 });
    }
    return NextResponse.json({ error: "Your request couldn't be saved. Please try again later." }, { status: 502 });
  }

  const requestId = (await response.json()) as string;
  return NextResponse.json({ ok: true, requestId }, { status: 201 });
}
