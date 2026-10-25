import "server-only";

const API_BASE = "https://apiv2.shiprocket.in/v1/external";
const TOKEN_SKEW_MS = 60_000;
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

type TokenCache = { value: string; expiresAt: number };
let tokenCache: TokenCache | undefined;

export class ShiprocketError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ShiprocketError";
  }
}

function credentials() {
  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new ShiprocketError("Shiprocket is not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD on the server.");
  }
  return { email, password };
}

async function login(force = false): Promise<string> {
  if (!force && tokenCache && tokenCache.expiresAt > Date.now() + TOKEN_SKEW_MS) {
    return tokenCache.value;
  }
  const body = credentials();
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    tokenCache = undefined;
    throw new ShiprocketError(`Shiprocket authentication failed (HTTP ${response.status}). Check the API-user credentials and account access.`, response.status);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("token" in payload) || typeof payload.token !== "string" || !payload.token) {
    tokenCache = undefined;
    throw new ShiprocketError("Shiprocket authentication response did not contain a token.");
  }
  tokenCache = { value: payload.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return tokenCache.value;
}

async function request<T>(path: string, init: RequestInit = {}, retryAuth = true): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    throw new ShiprocketError("Invalid Shiprocket API path.");
  }
  const token = await login();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (response.status === 401 && retryAuth) {
    tokenCache = undefined;
    await login(true);
    return request<T>(path, init, false);
  }
  if (!response.ok) {
    // Do not relay provider response bodies; they may contain sensitive account data.
    throw new ShiprocketError(`Shiprocket request failed (HTTP ${response.status}).`, response.status);
  }
  return await response.json() as T;
}

export type TrackingResponse = {
  tracking_data?: {
    track_status?: number;
    shipment_status?: string;
    shipment_track?: Array<{ date?: string; status?: string; activity?: string; location?: string }>;
    etd?: string;
    track_url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/** Track a shipment by AWB. Call only from an authenticated, authorized server workflow. */
export function trackShiprocketAwb(awb: string): Promise<TrackingResponse> {
  const normalized = awb.trim();
  if (!/^[A-Za-z0-9-]{4,40}$/.test(normalized)) {
    throw new ShiprocketError("Invalid AWB format.");
  }
  return request<TrackingResponse>(`/courier/track/awb/${encodeURIComponent(normalized)}`);
}

export type ServiceabilityResponse = Record<string, unknown>;

/** Quote courier serviceability. Postcodes and weight must come from a validated order/package. */
export function getShiprocketServiceability(input: {
  pickupPostcode: string;
  deliveryPostcode: string;
  weightKg: number;
  cod?: boolean;
}): Promise<ServiceabilityResponse> {
  const validPostcode = (value: string) => /^\d{6}$/.test(value);
  if (!validPostcode(input.pickupPostcode) || !validPostcode(input.deliveryPostcode)) {
    throw new ShiprocketError("Pickup and delivery postcodes must be six digits.");
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > 3000) {
    throw new ShiprocketError("Package weight must be greater than 0 and no more than 3000 kg.");
  }
  const query = new URLSearchParams({
    pickup_postcode: input.pickupPostcode,
    delivery_postcode: input.deliveryPostcode,
    weight: String(input.weightKg),
    cod: input.cod ? "1" : "0",
  });
  return request<ServiceabilityResponse>(`/courier/serviceability/?${query.toString()}`);
}

/** Test hook intentionally not exported: credentials and tokens must remain server-side. */
