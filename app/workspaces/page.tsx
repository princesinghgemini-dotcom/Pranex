import Link from "next/link";

const workspaces = [
  { href: "/marketplace", number: "01", name: "Customer marketplace", hindi: "ग्राहक / खरीदार", description: "Discover veterinary products, compare suppliers, build a cart, and track orders.", access: "Buyer experience", tone: "green" },
  { href: "/seller", number: "02", name: "Seller workspace", hindi: "विक्रेता पोर्टल", description: "Manage listings, price lists, MOQ, stock, orders, dispatches, and compliance submissions.", access: "Seller team", tone: "blue" },
  { href: "/admin", number: "03", name: "Platform administration", hindi: "एडमिन कंसोल", description: "Review sellers and products, manage organizations, policies, disputes, audit trails, and platform settings.", access: "Authorized administrators", tone: "purple" },
  { href: "/staff", number: "04", name: "Employee workspace", hindi: "कर्मचारी कार्यक्षेत्र", description: "Role-specific queues for catalogue review, customer support, fulfilment, finance, and operations.", access: "Internal employees", tone: "amber" },
];

export default function WorkspacesPage() {
  return <main className="workspace-directory">
    <header className="directory-header"><Link href="/marketplace" className="directory-brand"><span className="directory-mark">P</span><span>Pranex<small>COMMERCE PLATFORM</small></span></Link><span className="directory-status">ROLE-BASED PORTALS · PREVIEW</span></header>
    <section className="directory-intro"><p className="eyebrow">ONE PLATFORM · SEPARATE WORKFLOWS</p><h1>Every team has its own workspace.</h1><p>Customer shopping, seller operations, platform administration, and employee tasks should be separate experiences with server-enforced permissions—not just different menus.</p></section>
    <section className="workspace-cards" aria-label="Pranex workspaces">{workspaces.map((workspace) => <article className="workspace-card" key={workspace.href}><div className={"workspace-number " + workspace.tone}>{workspace.number}</div><p className="workspace-hindi">{workspace.hindi}</p><h2>{workspace.name}</h2><p className="workspace-description">{workspace.description}</p><div className="workspace-access">{workspace.access}</div><Link href={workspace.href} className="workspace-open">Open workspace <span aria-hidden="true">→</span></Link></article>)}</section>
    <section className="access-note"><strong>Security boundary</strong><p>These links are navigation scaffolding, not authentication. Live access requires Supabase Auth, organization membership, server-side role checks, and row-level security. Do not treat a hidden link or client-selected role as authorization.</p></section>
    <footer><Link href="/marketplace">← Back to marketplace</Link><span>Pranex · Multi-role marketplace foundation</span></footer>
  </main>;
}
