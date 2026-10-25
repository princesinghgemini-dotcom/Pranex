import Link from "next/link";
import { notFound } from "next/navigation";

const portals = {
  seller: {
    label: "SELLER WORKSPACE", hindi: "विक्रेता पोर्टल", title: "Run your business on Pranex.", description: "Manage your catalogue and fulfilment in one place. Live seller actions remain disabled until authentication and APIs are connected.",
    metrics: [{ label: "Listing drafts", value: "—", note: "Awaiting seller data" }, { label: "Orders to process", value: "—", note: "No live orders connected" }, { label: "Stock alerts", value: "—", note: "No live inventory connected" }, { label: "Compliance tasks", value: "—", note: "No live review state" }],
    tasks: [{ title: "Product catalogue", desc: "Create drafts, submit listings, and respond to review feedback.", state: "UI/API integration pending" }, { title: "Pricing and MOQ", desc: "Maintain business price lists, pack sizes, tax classifications, and minimum order quantities.", state: "UI/API integration pending" }, { title: "Orders and dispatch", desc: "Accept orders, prepare shipments, and reconcile tracking updates.", state: "Provider integration pending" }, { title: "Seller profile and verification", desc: "Manage legal details, GST information, documents, and verification status.", state: "Auth and compliance pending" }],
  },
  admin: {
    label: "PLATFORM ADMINISTRATION", hindi: "एडमिन कंसोल", title: "Operate the marketplace with control.", description: "A governance workspace for platform-wide configuration, seller onboarding, product approvals, and auditability.",
    metrics: [{ label: "Seller applications", value: "—", note: "Live queue not connected" }, { label: "Product reviews", value: "—", note: "Live queue not connected" }, { label: "Open disputes", value: "—", note: "Case system not connected" }, { label: "Platform alerts", value: "—", note: "Monitoring not connected" }],
    tasks: [{ title: "Seller and organization management", desc: "Review onboarding, organization membership, role assignments, and verification evidence.", state: "Auth and API integration pending" }, { title: "Product governance", desc: "Approve, reject, suspend, or request changes to product listings with an audit reason.", state: "Review workflow pending" }, { title: "Policy and configuration", desc: "Manage categories, tax rules, marketplace policies, and feature access.", state: "Configuration service pending" }, { title: "Audit and security", desc: "Inspect privileged actions, access changes, integration events, and exception queues.", state: "Audit pipeline pending" }],
  },
  staff: {
    label: "EMPLOYEE WORKSPACE", hindi: "कर्मचारी कार्यक्षेत्र", title: "Give every employee a clear queue.", description: "Internal work should be assigned by team and permission, with customer data limited to what each job needs.",
    metrics: [{ label: "Assigned to me", value: "—", note: "Task service not connected" }, { label: "Catalogue queue", value: "—", note: "Live queue not connected" }, { label: "Fulfilment queue", value: "—", note: "Live queue not connected" }, { label: "Support cases", value: "—", note: "Case system not connected" }],
    tasks: [{ title: "Catalogue reviewer", desc: "Check listing completeness, category, product claims, and required documents.", state: "Role and review queue pending" }, { title: "Customer support", desc: "Handle buyer queries, returns, complaints, and escalation with an auditable case history.", state: "Case system pending" }, { title: "Fulfilment operations", desc: "Monitor dispatch exceptions, shipment events, failed deliveries, and returns.", state: "Shipping integration pending" }, { title: "Finance operations", desc: "Reconcile payments, refunds, seller settlements, GST invoices, and exceptions.", state: "Payment and ledger integration pending" }],
  },
} as const;

type WorkspaceKey = keyof typeof portals;

export default async function WorkspacePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  if (!(workspace in portals)) notFound();
  const data = portals[workspace as WorkspaceKey];
  return <main className="portal-page">
    <header className="portal-topbar"><Link href="/workspaces" className="portal-brand"><span className="directory-mark">P</span><span>Pranex<small>COMMERCE PLATFORM</small></span></Link><div className="portal-top-actions"><span className="portal-preview">PREVIEW · NO LIVE DATA</span><Link href="/workspaces" className="portal-switch">All workspaces ↗</Link></div></header>
    <section className="portal-content"><Link href="/workspaces" className="portal-back">← All workspaces</Link><p className="eyebrow">{data.label}</p><div className="portal-title-row"><div><p className="portal-hindi">{data.hindi}</p><h1>{data.title}</h1><p className="portal-description">{data.description}</p></div><span className="portal-lock">◈ Role-protected when connected</span></div>
      <div className="portal-notice"><strong>Implementation status</strong><span>This is a workflow scaffold with no live business records or enabled write actions. Authentication, role authorization, database queries, and audit logging must be completed before operational use.</span></div>
      <section className="portal-metrics">{data.metrics.map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</section>
      {workspace === "admin" && <section className="portal-work-section"><div className="portal-section-heading"><div><h2>Platform controls</h2><p>Configure marketplace policy defaults from the admin workspace</p></div><Link className="portal-switch" href="/admin/configuration">Open configuration centre →</Link></div></section>}
      <section className="portal-work-section"><div className="portal-section-heading"><div><h2>Workspace modules</h2><p>Defined by the responsibilities of this role</p></div><span className="portal-count">{data.tasks.length} MODULES</span></div><div className="portal-module-grid">{data.tasks.map((task, index) => <article className="portal-module" key={task.title}><span className="portal-module-index">0{index + 1}</span><h3>{task.title}</h3><p>{task.desc}</p><div className="portal-module-state"><span/> {task.state}</div></article>)}</div></section>
      <footer><span>Pranex · {data.label}</span><Link href="/">Customer / home preview →</Link></footer>
    </section>
  </main>;
}
