"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartLine = {
  id: string; name: string; pack: string; price: string; unit: string;
  moq: string; tone: string; initials: string; quantity: number;
};
const STORAGE_KEY = "pranex-buyer-cart-v1";

function readCart(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is CartLine =>
      !!line && typeof line.id === "string" && typeof line.name === "string" &&
      typeof line.pack === "string" && typeof line.price === "string" &&
      Number.isSafeInteger(line.quantity) && line.quantity > 0
    );
  } catch { return []; }
}

function saveCart(lines: CartLine[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* UI still reflects this session. */ }
}

function priceValue(value: string): number | null {
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  if (!cleaned || /request price/i.test(value)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

export default function CartPreviewPage() {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setItems(readCart()); setReady(true); }, []);

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = useMemo(() => items.reduce((sum, item) => {
    const price = priceValue(item.price);
    return sum + (price === null ? 0 : price * item.quantity);
  }, 0), [items]);
  const hasUnknownPrice = items.some((item) => priceValue(item.price) === null);

  function commit(next: CartLine[]) { setItems(next); saveCart(next); }
  function updateQuantity(id: string, value: number) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 9999) return;
    commit(items.map((item) => item.id === id ? { ...item, quantity: value } : item));
  }
  function remove(id: string) { commit(items.filter((item) => item.id !== id)); }
  function clear() { commit([]); }

  return <main className="marketplace cart-page">
    <header className="market-header"><Link href="/marketplace" className="market-brand"><span className="market-logo">P</span><span>pranex<small>TRADE WITH CONFIDENCE</small></span></Link><Link href="/marketplace" className="market-workspaces">← Continue shopping</Link></header>
    <section className="cart-main">
      <p className="market-eyebrow">BUYER WORKSPACE · LOCAL CART PREVIEW</p><h1>Your cart</h1><p className="market-muted">Review your selected catalogue items before requesting a supplier quote.</p>
      <div className="cart-preview-notice"><strong>Not an order</strong><span>Your cart is stored in this browser on this device only. No inventory is reserved, and no order or payment is created.</span></div>
      {!ready ? <div className="cart-empty"><p>Loading your saved cart…</p></div> : items.length === 0 ? <div className="cart-empty"><div className="cart-empty-icon">▣</div><h2>Your cart is ready for your first item.</h2><p>Browse the catalogue and add products. Cart persistence is local only; checkout and live stock checks are not connected.</p><Link href="/marketplace" className="market-button primary-market">Browse products <span>→</span></Link><Link href="/marketplace/quotes" className="cart-quote-link">Buying in bulk? Request a quote ↗</Link></div> : <div className="cart-layout">
        <section className="cart-lines" aria-label="Cart items">
          <div className="cart-lines-head"><strong>{totalUnits} {totalUnits === 1 ? "unit" : "units"} selected</strong><button type="button" onClick={clear}>Clear cart</button></div>
          {items.map((item) => <article className="cart-line" key={item.id}>
            <div className={"cart-line-art " + item.tone}><span>{item.initials}</span></div>
            <div className="cart-line-info"><strong>{item.name}</strong><span>{item.pack} · {item.id}</span><small>{item.moq}</small><b>{item.price}</b></div>
            <div className="cart-line-actions"><label>Quantity<input aria-label={"Quantity for " + item.name} type="number" min={1} max={9999} value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} /></label><button type="button" onClick={() => remove(item.id)}>Remove</button></div>
          </article>)}
        </section>
        <aside className="cart-summary"><p className="market-eyebrow">ESTIMATE ONLY</p><h2>Cart summary</h2><div><span>Items</span><strong>{totalUnits}</strong></div><div><span>Subtotal of listed prices</span><strong>{hasUnknownPrice ? "Partial estimate" : money(totalValue)}</strong></div>{hasUnknownPrice && <p className="cart-summary-note">One or more items require supplier pricing. Subtotal excludes items without a numeric listed price.</p>}<p className="cart-summary-note">This estimate excludes negotiated pricing, GST treatment, freight, delivery, stock availability, and supplier confirmation.</p><Link href="/marketplace/quotes" className="market-button primary-market cart-request-quote">Request supplier quote →</Link><Link href="/marketplace" className="cart-continue">Continue shopping</Link></aside>
      </div>}
    </section>
    <footer className="market-footer"><Link href="/marketplace">← Continue browsing</Link><span>Pranex · Cart preview</span></footer>
  </main>;
}
