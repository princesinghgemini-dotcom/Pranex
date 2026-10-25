"use client";

import Link from "next/link";
import { useState } from "react";

type SettingsState = {
  marketplaceName: string;
  defaultLanguage: string;
  defaultCurrency: string;
  sellerApproval: boolean;
  productApproval: boolean;
  gstInvoiceRequired: boolean;
  showMoq: boolean;
  enableCod: boolean;
  shippingProvider: string;
  returnWindowDays: number;
  platformFeePercent: number;
  lowStockThreshold: number;
};

const initial: SettingsState = {
  marketplaceName: "Pranex",
  defaultLanguage: "Hindi",
  defaultCurrency: "INR",
  sellerApproval: true,
  productApproval: true,
  gstInvoiceRequired: true,
  showMoq: true,
  enableCod: false,
  shippingProvider: "Shiprocket",
  returnWindowDays: 7,
  platformFeePercent: 3,
  lowStockThreshold: 10,
};

const groups = [
  { title: "Marketplace identity", description: "Control the buyer-facing marketplace defaults." },
  { title: "Seller & catalogue governance", description: "Set the approval gates before sellers and products become visible." },
  { title: "Commerce & fulfilment", description: "Set the operating defaults for payments, delivery, and returns." },
  { title: "Inventory policy", description: "Define when stock needs operational attention." },
];

export default function AdminConfigurationPage() {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(false);
  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(current => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const toggle = (key: "sellerApproval" | "productApproval" | "gstInvoiceRequired" | "showMoq" | "enableCod", label: string, description: string) => (
    <label className="config-toggle" key={key}>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={settings[key]} onChange={e => update(key, e.target.checked)} />
    </label>
  );

  return <main className="config-page">
    <header className="config-header">
      <div><Link href="/admin" className="config-back">← Platform administration</Link><p className="config-eyebrow">PRANEX / ADMIN CONTROL PLANE</p><h1>Platform configuration</h1><p className="config-subtitle">Centralise marketplace defaults and operating policies instead of hard-coding them into individual screens.</p></div>
      <span className="config-status">PREVIEW · NOT PERSISTED</span>
    </header>
    <div className="config-warning"><strong>Configuration draft only</strong><span>Changes update this screen in your current session only. They do not change live marketplace behaviour yet. Persistence requires authenticated platform-admin authorization, a database-backed settings service, audit history, and environment-specific release controls.</span></div>
    <div className="config-layout">
      <aside className="config-nav"><span>SETTINGS AREAS</span>{groups.map((g, i) => <a href={`#config-${i}`} key={g.title}><b>0{i + 1}</b>{g.title}</a>)}<Link href="/workspaces">Role workspaces ↗</Link></aside>
      <section className="config-sections">
        <article className="config-card" id="config-0"><div className="config-card-head"><div><span>01</span><h2>{groups[0].title}</h2><p>{groups[0].description}</p></div></div>
          <div className="config-fields"><label>Marketplace display name<input value={settings.marketplaceName} maxLength={80} onChange={e => update("marketplaceName", e.target.value)} /></label><label>Default language<select value={settings.defaultLanguage} onChange={e => update("defaultLanguage", e.target.value)}><option>Hindi</option><option>English</option><option>Hindi + English</option></select></label><label>Display currency<select value={settings.defaultCurrency} onChange={e => update("defaultCurrency", e.target.value)}><option>INR</option></select></label></div>
        </article>
        <article className="config-card" id="config-1"><div className="config-card-head"><div><span>02</span><h2>{groups[1].title}</h2><p>{groups[1].description}</p></div></div>
          {toggle("sellerApproval", "Require seller approval", "New seller accounts stay pending until reviewed.")}
          {toggle("productApproval", "Require product listing approval", "Listings require review before becoming buyer-visible.")}
          {toggle("gstInvoiceRequired", "Require GST invoice details", "Require applicable tax details for invoice-ready orders.")}
          {toggle("showMoq", "Display minimum order quantity", "Show supplier MOQ on product cards and detail pages.")}
        </article>
        <article className="config-card" id="config-2"><div className="config-card-head"><div><span>03</span><h2>{groups[2].title}</h2><p>{groups[2].description}</p></div></div>
          <div className="config-fields"><label>Shipping integration<select value={settings.shippingProvider} onChange={e => update("shippingProvider", e.target.value)}><option>Shiprocket</option><option>Manual fulfilment</option><option>Not configured</option></select><small>Provider credentials must remain server-side.</small></label><label>Return request window (days)<input type="number" min={0} max={90} value={settings.returnWindowDays} onChange={e => update("returnWindowDays", Number(e.target.value))} /></label><label>Platform fee (%)<input type="number" min={0} max={30} step={0.25} value={settings.platformFeePercent} onChange={e => update("platformFeePercent", Number(e.target.value))} /></label></div>
          {toggle("enableCod", "Allow cash on delivery", "A policy draft only; payment methods are not enabled by this setting yet.")}
        </article>
        <article className="config-card" id="config-3"><div className="config-card-head"><div><span>04</span><h2>{groups[3].title}</h2><p>{groups[3].description}</p></div></div>
          <div className="config-fields single-field"><label>Low-stock alert threshold (units)<input type="number" min={0} max={1000000} value={settings.lowStockThreshold} onChange={e => update("lowStockThreshold", Number(e.target.value))} /></label></div>
          <p className="config-inline-note">FEFO stock allocation and expiry controls must remain enforced in the database, independent of these display and policy preferences.</p>
        </article>
        <div className="config-actions"><span>{saved ? "Draft updated in this session. No live settings were written." : "Edit values to prepare a configuration draft."}</span><button type="button" onClick={() => { setSettings(initial); setSaved(false); }}>Reset draft</button><button className="config-primary" type="button" onClick={() => setSaved(true)}>Save draft locally</button></div>
      </section>
    </div>
    <footer className="config-footer"><Link href="/admin">← Back to admin workspace</Link><span>Next release gate: secure settings API + database persistence + audit log</span></footer>
    <style jsx>{`
      .config-page{max-width:1320px;margin:0 auto;padding:34px 28px 28px;color:#172b25}.config-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.config-back{display:inline-block;color:#187a54;text-decoration:none;font-size:12px;margin-bottom:20px}.config-eyebrow{font-size:10px;letter-spacing:1.7px;color:#819087;font-weight:700;margin:0 0 8px}.config-header h1{font:800 30px Manrope,sans-serif;letter-spacing:-.9px;margin:0}.config-subtitle{color:#748179;max-width:690px;line-height:1.6}.config-status{white-space:nowrap;border:1px solid #eadfc4;background:#fff9ed;color:#987126;border-radius:6px;padding:8px 10px;font-size:10px;font-weight:700;letter-spacing:.5px}.config-warning{display:flex;flex-direction:column;gap:5px;background:#fff9ed;border:1px solid #eee1c5;border-radius:9px;padding:15px 17px;margin-bottom:22px;color:#786332;font-size:12px;line-height:1.6}.config-warning strong{color:#805f1e}.config-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start}.config-nav,.config-card{background:#fff;border:1px solid #e8eeeb;border-radius:10px}.config-nav{padding:14px;position:sticky;top:18px;display:grid;gap:7px}.config-nav>span{font-size:9px;color:#97a39c;font-weight:700;letter-spacing:1.2px;padding:5px 6px 9px}.config-nav a{display:flex;gap:9px;align-items:center;padding:10px 7px;border-radius:6px;text-decoration:none;color:#5d6e64;font-size:11px}.config-nav a:hover{background:#eef7f1}.config-nav b{color:#187a54;font-size:10px}.config-nav a:last-child{border-top:1px solid #edf1ee;margin-top:8px;padding-top:15px}.config-sections{display:grid;gap:15px;min-width:0}.config-card{padding:0;scroll-margin-top:20px}.config-card-head{padding:19px 20px 16px;border-bottom:1px solid #edf1ee}.config-card-head>div>span{font-size:10px;color:#187a54;font-weight:700}.config-card h2{font:700 16px Manrope,sans-serif;margin:6px 0}.config-card-head p{color:#829087;font-size:11px;margin:0}.config-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:20px}.config-fields label{display:grid;gap:7px;font-size:11px;font-weight:700;color:#52635a}.config-fields label:last-child:nth-child(odd){grid-column:1/-1}.config-fields input,.config-fields select{width:100%;min-width:0;background:#fff;border:1px solid #dfe7e2;border-radius:6px;padding:11px 10px;font:400 12px 'DM Sans',sans-serif;color:#25382f}.config-fields small{font-size:10px;color:#8a968f;font-weight:400}.config-toggle{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:15px 20px;border-bottom:1px solid #f0f3f1}.config-toggle:last-child{border-bottom:0}.config-toggle strong,.config-toggle small{display:block}.config-toggle strong{font-size:12px}.config-toggle small{color:#849087;font-size:10px;margin-top:4px}.config-toggle input{width:17px;height:17px;accent-color:#187a54;flex-shrink:0}.single-field{grid-template-columns:minmax(0,300px)}.config-inline-note{margin:0 20px 20px;padding:12px;background:#f4f8f5;border-radius:6px;color:#6e7d73;font-size:10px;line-height:1.6}.config-actions{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap;padding:10px 0}.config-actions>span{margin-right:auto;color:#849087;font-size:10px;line-height:1.5}.config-actions button{border:1px solid #dfe7e2;border-radius:6px;background:#fff;padding:10px 12px;color:#52635a;font-size:11px;cursor:pointer}.config-actions .config-primary{background:#187a54;border-color:#187a54;color:#fff;font-weight:700}.config-footer{display:flex;justify-content:space-between;gap:15px;padding-top:24px;color:#849087;font-size:10px}.config-footer a{color:#187a54;text-decoration:none}@media(max-width:760px){.config-page{padding:22px 14px}.config-header{display:block}.config-status{display:inline-block;margin-top:6px}.config-layout{grid-template-columns:1fr}.config-nav{position:static;grid-template-columns:1fr 1fr}.config-nav>span{grid-column:1/-1}.config-fields{grid-template-columns:1fr;padding:15px}.config-fields label:last-child:nth-child(odd){grid-column:auto}.config-toggle{padding:14px 15px}.config-footer{flex-direction:column}.config-actions>span{flex-basis:100%}}
    `}</style>
  </main>;
}
