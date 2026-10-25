import Link from "next/link";

export default function CartPreviewPage() {
  return <main className="marketplace cart-page">
    <header className="market-header"><Link href="/marketplace" className="market-brand"><span className="market-logo">P</span><span>pranex<small>TRADE WITH CONFIDENCE</small></span></Link><Link href="/marketplace" className="market-workspaces">← Continue shopping</Link></header>
    <section className="cart-main">
      <p className="market-eyebrow">BUYER WORKSPACE · PREVIEW</p><h1>Your cart</h1><p className="market-muted">Review products before moving into a connected ordering workflow.</p>
      <div className="cart-empty"><div className="cart-empty-icon">▣</div><h2>Your cart is ready for your first item.</h2><p>This storefront currently shows illustrative catalogue items. Cart persistence, stock checks, shipping estimates and checkout are not connected yet.</p><Link href="/marketplace" className="market-button primary-market">Browse products <span>→</span></Link><Link href="/marketplace/quotes" className="cart-quote-link">Buying in bulk? Request a quote ↗</Link></div>
    </section>
    <footer className="market-footer"><Link href="/marketplace">← Continue browsing</Link><span>Pranex · Cart preview</span></footer>
  </main>;
}
