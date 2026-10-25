"use client";

import { useState, type FormEvent } from "react";

type Status = { kind: "success" | "error"; message: string } | null;

export default function QuoteRequestForm() {
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const requestKey = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : null;
    if (!requestKey) {
      setStatus({ kind: "error", message: "Your browser cannot securely submit this form. Please update it and try again." });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/marketplace/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey,
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email"),
          product: data.get("product"),
          quantity: data.get("quantity"),
          unit: data.get("unit"),
          delivery: data.get("delivery"),
          notes: data.get("notes"),
          website: data.get("website"),\n          consent: data.get("consent") === "on",
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; requestId?: string | null };
      if (!response.ok || !result.ok) {
        setStatus({ kind: "error", message: result.error ?? "We couldn't save your request. Please try again." });
        return;
      }
      form.reset();
      setStatus({
        kind: "success",
        message: result.requestId
          ? `Your quote request was received. Reference: ${result.requestId.slice(0, 8).toUpperCase()}.`
          : "Your request was received.",
      });
    } catch {
      setStatus({ kind: "error", message: "Network error. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={submit}>
    <label>Your name *<input name="name" autoComplete="name" minLength={2} maxLength={100} placeholder="Business contact name" required /></label>
    <div className="quote-two-col">
      <label>Mobile number *<input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit Indian mobile" required /></label>
      <label>Email (optional)<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@business.com" /></label>
    </div>
    <label>Product or supply needed *<input name="product" minLength={2} maxLength={200} placeholder="e.g. calcium mineral mixture" required /></label>
    <div className="quote-two-col"><label>Estimated quantity *<input name="quantity" type="number" min={1} max={10000000} step={1} placeholder="e.g. 50" required /></label><label>Unit<select name="unit" defaultValue="packs"><option value="packs">Packs</option><option value="units">Units</option><option value="cartons">Cartons</option><option value="kg">Kilograms</option><option value="litres">Litres</option></select></label></div>
    <label>Delivery district / PIN code<input name="delivery" maxLength={160} placeholder="Where should the order be delivered?" /></label>
    <label>Additional requirements<textarea name="notes" rows={4} maxLength={1000} placeholder="Preferred pack size, target date, brand preferences…" /></label>
    <label className="quote-consent"><input type="checkbox" name="consent" required /> <span>I agree that Pranex may use these details to respond to this quote request. *</span></label>\n    <label className="quote-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <button type="submit" disabled={submitting} className="market-button primary-market quote-submit">{submitting ? "Submitting securely…" : "Submit quote request"} <span aria-hidden="true">→</span></button>
    {status && <p role={status.kind === "error" ? "alert" : "status"} className={`quote-form-status ${status.kind}`}>{status.message}</p>}
    <small className="quote-disclaimer">Your contact details are used to respond to this enquiry. Requests are stored privately and are not publicly browsable. Please do not include sensitive personal or medical information.</small>
  </form>;
}
