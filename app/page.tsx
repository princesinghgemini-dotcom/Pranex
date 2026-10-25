import Link from "next/link";

const metrics = [
  { label: "Active SKUs", value: "1,284", detail: "Sample catalogue", tone: "positive" },
  { label: "Stock at risk", value: "36", detail: "Illustrative count", tone: "warning" },
  { label: "Pending reviews", value: "18", detail: "Sample queue", tone: "neutral" },
  { label: "Open fulfilments", value: "72", detail: "Demo orders only", tone: "positive" },
];
const stock = [
  { sku: "VET-0018", name: "Calf Electrolyte Mix", lot: "LOT-26-041", available: 184, expiry: "12 Nov 2026", status: "Healthy" },
  { sku: "AGR-0102", name: "Drip Irrigation Connector", lot: "LOT-26-033", available: 42, expiry: "28 Oct 2026", status: "Low stock" },
  { sku: "VET-0031", name: "Udder Care Wash", lot: "LOT-26-019", available: 16, expiry: "30 Oct 2026", status: "Expiry risk" },
  { sku: "AGR-0214", name: "Water-Soluble Micronutrient", lot: "LOT-26-027", available: 96, expiry: "04 Feb 2027", status: "Healthy" },
];
const rollout = [
  { title: "Product catalogue", description: "Seller submissions, listing details, and compliance decisions.", status: "In rollout" },
  { title: "Orders & fulfilment", description: "Order lifecycle, shipment tracking, and reconciliation.", status: "Not connected" },
  { title: "Organizations & access", description: "Tenant setup, membership, and role-aware access.", status: "Not connected" },
  { title: "Reports & insights", description: "Live metrics, trend analysis, and exportable reports.", status: "Not connected" },
];

export default function Home() {
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">P</span><span>pranex<small>COMMERCE OS</small></span></div>
      <div className="workspace"><span className="avatar">VG</span><span>Varyanta Global<small>Operations workspace</small></span><span className="chevron">⌄</span></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Workspace navigation">
        <a className="active" href="#overview"><span>◫</span> Overview</a>
        <Link href="/inventory"><span>▦</span> Inventory</Link>
        <Link href="/catalogue"><span>◇</span> Product catalogue</Link>
        <a href="#modules"><span>⇄</span> Orders &amp; fulfilment</a>
        <Link href="/catalogue"><span>✓</span> Compliance reviews</Link>
      </nav>
      <p className="nav-label">MANAGEMENT</p>
      <nav aria-label="Management navigation">
        <a href="#modules"><span>▧</span> Organizations</a>
        <a href="#modules"><span>▤</span> Reports &amp; insights</a>
        <a href="#modules"><span>⚙</span> Settings</a>
      </nav>
      <div className="sidebar-bottom">
        <div className="secure"><span>●</span><div>Security foundation<small>Live access checks not connected</small></div></div>
        <div className="profile"><span className="avatar user">P</span><div>Workspace preview<small>Demo mode</small></div><span className="chevron">···</span></div>
      </div>
    </aside>
    <section className="content" id="overview">
      <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> Overview</div><div className="top-actions"><span className="env"><i/> Preview data</span><a className="help" href="#modules">Module status</a></div></header>
      <div className="page">
        <div className="welcome"><div><p className="eyebrow">PRANEX / OPERATIONS</p><h1>Commerce operations overview <span>✳</span></h1><p className="subtitle">A single entry point for inventory and the modules being brought online.</p></div><Link className="primary create-link" href="/inventory#receipt-guidance">＋ Inventory actions</Link></div>
        <div className="notice"><span className="notice-icon">↗</span><div><strong>Preview environment</strong><p>All figures below are illustrative sample data. They are not live tenant metrics, and no inventory changes can be submitted from this dashboard.</p></div><span className="notice-tag">DEMO</span></div>
        <div className="section-heading"><div><h2>Business overview</h2><p>Example indicators to be replaced by authorized live queries</p></div><span className="demo-pill">SAMPLE DATA</span></div>
        <div className="metrics">{metrics.map((metric) => <article className="metric" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="dots" aria-hidden="true">···</span></div><strong>{metric.value}</strong><div className={"metric-change " + metric.tone}>{metric.detail}</div><div className="spark" aria-hidden="true"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div></article>)}</div>
        <div className="grid">
          <section className="panel inventory" id="inventory">
            <div className="panel-head"><div><h2>Inventory health</h2><p>Sample lots for layout and workflow preview</p></div><Link href="/inventory">Open inventory ↗</Link></div>
            <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>LOT / BATCH</th><th>AVAILABLE</th><th>EXPIRY DATE</th><th>STATUS</th></tr></thead><tbody>{stock.map((item) => <tr key={item.sku}><td><strong>{item.name}</strong><small>{item.sku}</small></td><td>{item.lot}</td><td><strong>{item.available}</strong><small>units</small></td><td>{item.expiry}</td><td><span className={"status " + (item.status === "Healthy" ? "healthy" : item.status === "Low stock" ? "low" : "risk")}>{item.status}</span></td></tr>)}</tbody></table></div>
            <div className="table-foot"><span>4 illustrative lots shown</span><Link href="/inventory">Open stock ledger →</Link></div>
          </section>
          <section className="panel activity">
            <div className="panel-head"><div><h2>Operational priorities</h2><p>Examples of tasks the live dashboard will surface</p></div><span className="count">3</span></div>
            <div className="task"><span className="task-icon amber">!</span><div><strong>Expiry risk</strong><p>Udder Care Wash · 16 sample units</p><small>Inventory · LOT-26-019</small></div><Link className="arrow" href="/inventory">›</Link></div>
            <div className="task"><span className="task-icon blue">▤</span><div><strong>Catalogue review</strong><p>Sample queue needs review</p><small>Catalogue · Not connected</small></div><a className="arrow" href="#modules" aria-label="Catalogue module status">›</a></div>
            <div className="task"><span className="task-icon purple">↻</span><div><strong>Replenishment</strong><p>Connector stock is below sample threshold</p><small>Inventory · Illustrative</small></div><Link className="arrow" href="/inventory">›</Link></div>
            <Link className="secondary full" href="/inventory">Review inventory →</Link>
          </section>
        </div>
        <section className="panel rollout-panel" id="modules">
          <div className="panel-head"><div><h2>Module availability</h2><p>Current status of the repository UI</p></div><span className="demo-pill">BUILD TRACKER</span></div>
          <div className="rollout-list">{rollout.map((module) => <article className="rollout-item" key={module.title}><div><strong>{module.title}</strong><p>{module.description}</p></div><span className={"rollout-status " + (module.status === "In rollout" ? "rollout-active" : "")}>{module.status}</span></article>)}</div>
          <p className="rollout-note">This panel is informational. Modules marked not connected are not presented as working features; live authentication, tenant data, and end-to-end flows still require implementation and testing.</p>
        </section>
        <footer><span>Pranex Commerce OS <span className="muted">· Preview dashboard</span></span><span>Live data integration pending</span></footer>
      </div>
    </section>
  </main>;
}
