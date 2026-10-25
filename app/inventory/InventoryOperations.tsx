"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Batch = {
  id: string;
  batch_number: string;
  stock_quantity: number;
  reserved_quantity: number;
  expires_on: string | null;
  warehouse_code: string | null;
  variant_id: string;
  manufacturer_org_id: string;
};

type Status = { kind: "success" | "error" | "info"; message: string };

export default function InventoryOperations() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingReceiptKey, setPendingReceiptKey] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  const loadBatches = useCallback(async (token: string) => {
    const response = await fetch("/api/inventory/batches", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load inventory batches.");
    const rows = Array.isArray(body.batches) ? (body.batches as Batch[]) : [];
    setBatches(rows);
    setSelectedBatch(current => rows.some(row => row.id === current) ? current : (rows[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    loadBatches(accessToken).catch(error => {
      if (active) setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not load inventory batches." });
    });
    return () => { active = false; };
  }, [accessToken, loadBatches]);

    async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) throw new Error("Inventory service is not configured.");
      const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok || typeof body.access_token !== "string") {
        throw new Error("Sign-in failed. Check your credentials or confirm your account is enabled.");
      }
      setAccessToken(body.access_token);
      setPassword("");
      setStatus({ kind: "success", message: "Signed in. Inventory access is limited by your database membership and role." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Sign-in failed." });
    } finally {
      setBusy(false);
    }
  }

  async function refreshBatches() {
    if (!accessToken || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await loadBatches(accessToken);
      setStatus({ kind: "success", message: "Inventory batches refreshed." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not refresh inventory batches." });
    } finally {
      setBusy(false);
    }
  }

  async function recordReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selectedBatch) return;
    const parsedQuantity = Number(quantity);
    if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 100000000) {
      setStatus({ kind: "error", message: "Quantity must be a whole number between 1 and 100,000,000." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const idempotencyKey = pendingReceiptKey || crypto.randomUUID();
      if (!pendingReceiptKey) setPendingReceiptKey(idempotencyKey);
      const response = await fetch("/api/inventory/receipts", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatch,
          quantity: parsedQuantity,
          idempotencyKey,
          reference: reference.trim(),
          notes: notes.trim(),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Receipt could not be recorded.");
      setPendingReceiptKey("");
      setStatus({ kind: "success", message: `Receipt recorded. Movement reference: ${String(body.movementId)}` });
      setReference("");
      setNotes("");
      try {
        await loadBatches(accessToken);
      } catch {
        setStatus({ kind: "info", message: `Receipt was recorded (movement ${String(body.movementId)}), but the refreshed batch list could not be loaded. Use Refresh batches to reload it.` });
      }
    } catch (error) {
      setStatus({ kind: "error", message: `${error instanceof Error ? error.message : "Receipt result is uncertain."} Retry with the same details; this screen will reuse the same idempotency key.` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ledger-panel inventory-live-panel" aria-labelledby="live-inventory-title">
      <div className="ledger-panel-head">
        <div><h2 id="live-inventory-title">Live inventory operations</h2><p>Sign in with an existing Pranex account to view tenant-authorized batches and record stock receipts.</p></div>
        <span className={accessToken ? "status healthy" : "demo-pill"}>{accessToken ? "AUTHENTICATED SESSION" : "SIGN-IN REQUIRED"}</span>
      </div>
      {!accessToken ? (
        <form className="inventory-auth-form" onSubmit={signIn}>
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in to inventory"}</button>
          <p className="ledger-foot">The access token is kept in component memory only and is not written to local storage. Refreshing the page signs you out.</p>
        </form>
      ) : (
        <>
          <div className="inventory-live-toolbar">
            <span>{batches.length} batch(es) visible under your database permissions · maximum 100 shown</span>
            <div className="inventory-live-actions">
              <button type="button" disabled={busy || Boolean(pendingReceiptKey)} onClick={refreshBatches}>{busy ? "Refreshing…" : "Refresh batches"}</button>
              <button type="button" disabled={Boolean(pendingReceiptKey)} onClick={() => { setAccessToken(""); setBatches([]); setStatus({ kind: "info", message: "Signed out of this inventory screen." }); }}>Sign out</button>
            </div>
          </div>
          <div className="table-wrap">
            <table><thead><tr><th>Batch</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Expiry</th><th>Warehouse</th></tr></thead>
              <tbody>{batches.map(batch => <tr key={batch.id}>
                <td><strong>{batch.batch_number}</strong><small>{batch.id}</small></td>
                <td>{batch.stock_quantity}</td><td>{batch.reserved_quantity}</td><td><strong>{Math.max(0, batch.stock_quantity - batch.reserved_quantity)}</strong></td>
                <td>{batch.expires_on ?? "Not specified"}</td><td>{batch.warehouse_code || "—"}</td>
              </tr>)}
              {!batches.length && <tr><td colSpan={6}>No batches are visible to this account. Confirm organization membership and that batches exist.</td></tr>}</tbody>
            </table>
          </div>
          <form className="inventory-receipt-form" onSubmit={recordReceipt}>
            <h3>Record stock receipt</h3>
            <label>Batch<select required value={selectedBatch} onChange={event => setSelectedBatch(event.target.value)} disabled={!batches.length || Boolean(pendingReceiptKey)}>
              {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.batch_number} · {batch.stock_quantity} on hand · {batch.expires_on ?? "no expiry"}</option>)}
            </select></label>
            <label>Received quantity<input type="number" min={1} max={100000000} step={1} required disabled={Boolean(pendingReceiptKey)} value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
            <label>Reference / GRN<input maxLength={160} disabled={Boolean(pendingReceiptKey)} value={reference} onChange={event => setReference(event.target.value)} placeholder="Optional goods receipt reference" /></label>
            <label>Notes<textarea maxLength={500} rows={2} disabled={Boolean(pendingReceiptKey)} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional receipt notes" /></label>
            <button className="primary" type="submit" disabled={busy || !batches.length}>{busy ? "Processing…" : pendingReceiptKey ? "Retry receipt safely" : "Record receipt"}</button>
          </form>
          <p className="ledger-foot">Receipt writes are accepted only for owner/admin roles by the database RPC. A receipt updates the batch quantity, appends an immutable movement and writes an audit event in one transaction.</p>
        </>
      )}
      {status && <p className={`inventory-live-status ${status.kind}`} role={status.kind === "error" ? "alert" : "status"}>{status.message}</p>}
    </section>
  );
}
