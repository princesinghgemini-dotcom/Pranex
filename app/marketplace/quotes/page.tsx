import Link from "next/link";
import QuoteRequestForm from "./QuoteRequestForm";

export default function QuoteRequestPage() {
  return <main className="marketplace quote-page">
    <header className="market-header"><Link href="/marketplace" className="market-brand"><span className="market-logo">P</span><span>pranex<small>TRADE WITH CONFIDENCE</small></span></Link><Link href="/marketplace" className="market-workspaces">← Back to marketplace</Link></header>
    <section className="quote-main">
      <p className="market-eyebrow">B2B BUYING WORKFLOW · SECURE ENQUIRY</p>
      <h1>Tell us what your business needs.</h1>
      <p className="market-muted quote-intro">Share your requirement and our team can follow up about availability and volume pricing. Submitting a request is not an order or a confirmed supplier quote.</p>
      <div className="quote-layout">
        <div className="quote-form-card">
          <h2>Quote request details</h2>
          <p>Provide a reachable Indian mobile number so the team can respond.</p>
          <QuoteRequestForm />
        </div>
        <aside className="quote-side-card"><span className="quote-side-icon">↗</span><h2>What happens next?</h2><ol><li><b>Your request is recorded</b><span>A private enquiry reference is shown after successful submission.</span></li><li><b>Our team reviews the requirement</b><span>Availability, supplier options and pricing still need confirmation.</span></li><li><b>Confirm terms before ordering</b><span>Validate final pricing, tax, freight, delivery, availability and payment terms.</span></li></ol><div className="quote-side-note">Do not treat an enquiry as an order confirmation. No payment is taken on this page.</div></aside>
      </div>
    </section>
    <footer className="market-footer"><Link href="/marketplace">← Continue browsing</Link><span>Pranex · Buyer enquiry</span></footer>
  </main>;
}
