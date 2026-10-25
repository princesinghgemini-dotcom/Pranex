"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Listing = {
  id: string;
  name: string;
  sku: string;
  seller: string;
  category: string;
  submitted: string;
  status: "Pending review" | "Approved" | "Changes requested";
};

const sampleListings: Listing[] = [
  { id: "PRX-10041", name: "Calf Electrolyte Mix", sku: "VET-0018", seller: "Northfield Vet Supplies", category: "Animal nutrition", submitted: "22 Oct 2026", status: "Pending review" },
  { id: "PRX-10038", name: "Water-Soluble Micronutrient", sku: "AGR-0214", seller: "Green Acre Inputs", category: "Crop nutrition", submitted: "21 Oct 2026", status: "Pending review" },
  { id: "PRX-10022", name: "Udder Care Wash", sku: "VET-0031", seller: "DairyCare Essentials", category: "Hygiene & care", submitted: "18 Oct 2026", status: "Changes requested" },
  { id: "PRX-09984", name: "Drip Irrigation Connector", sku: "AGR-0102", seller: "Fieldline Equipment", category: "Irrigation", submitted: "14 Oct 2026", status: "Approved" },
];

const statuses = ["All statuses", "Pending review", "Approved", "Changes requested"] as const;

export default function CataloguePage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All statuses");
  const [selectedId, setSelectedId] = useState(sampleListings[0].id);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sampleListings.filter((item) => {
      const matchesQuery = !normalized || [item.id, item.name, item.sku, item.seller, item.category].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus = status === "All statuses" || item.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  return <main className="catalogue-page">
    <header className="catalogue-header">
      <div><Link className="back-link" href="/">← Overview</Link><p className="eyebrow">COMMERCE / CATALOGUE</p><h1>Product catalogue</h1><p className="subtitle">Review listing readiness and find products across the sample seller queue.</p></div>
      <span className="demo-pill">PREVIEW DATA</span>
    </header>
    <div className="catalogue-notice"><strong>Read-only preview</strong><span>These listings are illustrative. Search and status filters work locally; review decisions are disabled until authenticated reviewer APIs are connected.</span></div>

    <section className="catalogue-stats" aria-label="Sample listing counts">
      <article><span>Total sample listings</span><strong>{sampleListings.length}</strong><small>Example records only</small></article>
      <article><span>Pending review</span><strong>{sampleListings.filter((item) => item.status === "Pending review").length}</strong><small>Requires authorized review flow</small></article>
      <article><span>Changes requested</span><strong>{sampleListings.filter((item) => item.status === "Changes requested").length}</strong><small>Sample status</small></article>
      <article><span>Approved</span><strong>{sampleListings.filter((item) => item.status === "Approved").length}</strong><small>Sample status</small></article>
    </section>

    <section className="catalogue-workspace">
      <div className="catalogue-list panel">
        <div className="panel-head"><div><h2>Seller listings</h2><p>{filtered.length} matching sample {filtered.length === 1 ? "listing" : "listings"}</p></div><span className="demo-pill">DEMO</span></div>
        <div className="catalogue-controls">
          <label className="catalogue-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU, seller…" aria-label="Search product catalogue" /></label>
          <label className="catalogue-filter"><span className="sr-only">Filter by review status</span><select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}>{statuses.map((option) => <option key={option}>{option}</option>)}</select></label>
        </div>
        <div className="listing-items">
          {filtered.map((item) => <button className={"listing-row " + (selected?.id === item.id ? "listing-selected" : "")} type="button" key={item.id} onClick={() => setSelectedId(item.id)} aria-pressed={selected?.id === item.id}>
            <span className="listing-icon">{item.category === "Animal nutrition" || item.category === "Hygiene & care" ? "✳" : "◇"}</span>
            <span className="listing-main"><strong>{item.name}</strong><small>{item.sku} · {item.seller}</small><span className={"status " + (item.status === "Approved" ? "healthy" : item.status === "Pending review" ? "low" : "risk")}>{item.status}</span></span>
            <span className="listing-chevron" aria-hidden="true">›</span>
          </button>)}
          {filtered.length === 0 && <div className="catalogue-empty"><strong>No matching listings</strong><p>Try a different keyword or choose another status.</p><button type="button" onClick={() => { setQuery(""); setStatus("All statuses"); }}>Clear filters</button></div>}
        </div>
        <p className="catalogue-footnote">Sample records only · No seller or production data is being queried.</p>
      </div>

      <aside className="listing-detail panel" aria-live="polite">
        {selected ? <>
          <div className="panel-head"><div><h2>Listing details</h2><p>Selected sample record</p></div><span className="detail-mark">↗</span></div>
          <p className="eyebrow detail-id">{selected.id}</p><h3>{selected.name}</h3><span className={"status " + (selected.status === "Approved" ? "healthy" : selected.status === "Pending review" ? "low" : "risk")}>{selected.status}</span>
          <div className="detail-fields"><div><span>Seller</span><strong>{selected.seller}</strong></div><div><span>SKU</span><strong>{selected.sku}</strong></div><div><span>Category</span><strong>{selected.category}</strong></div><div><span>Submitted</span><strong>{selected.submitted}</strong></div></div>
          <div className="review-guidance"><strong>Review checklist</strong><ul><li>Seller identity and organization authorization</li><li>Product details, category, and supporting documents</li><li>Applicable compliance requirements and audit trail</li></ul></div>
          <button className="review-disabled" type="button" disabled>Review decision unavailable</button>
          <p className="disabled-reason">Approval, rejection, and correction requests must be handled by a server-authorized reviewer workflow. This preview does not perform any decision or database write.</p>
        </> : <div className="catalogue-empty"><strong>Select a listing</strong><p>Choose a row to inspect its sample details.</p></div>}
      </aside>
    </section>
    <footer><Link href="/">← Return to overview</Link><span>Pranex · Catalogue workflow preview</span></footer>
  </main>;
}
