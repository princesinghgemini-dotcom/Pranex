import Link from "next/link";

export default function QuoteRequestPage() {
  return <main className="marketplace quote-page">
    <header className="market-header"><Link href="/marketplace" className="market-brand"><span className="market-logo">P</span><span>pranex<small>TRADE WITH CONFIDENCE</small></span></Link><Link href="/marketplace" className="market-workspaces">← Back to marketplace</Link></header>
    <section className="quote-main">
      <p className="market-eyebrow">B2B BUYING WORKFLOW · PREVIEW</p>
      <h1>Tell us what your business needs.</h1>
      <p className="market-muted quote-intro">Prepare the details you would share with a supplier for volume pricing. This preview does not send or save your information.</p>
      <div className="quote-layout">
        <div className="quote-form-card">
          <h2>Quote request details</h2>
          <p>Fields marked with * are useful for a complete enquiry.</p>
          <form>
            <label>Product or supply needed *<input name="product" placeholder="e.g. calcium mineral mixture" required /></label>
            <div className="quote-two-col"><label>Estimated quantity *<input name="quantity" placeholder="e.g. 50" required /></label><label>Unit<select name="unit" defaultValue="packs"><option value="packs">Packs</option><option value="units">Units</option><option value="cartons">Cartons</option><option value="kg">Kilograms</option><option value="litres">Litres</option></select></label></div>
            <label>Delivery district / PIN code<input name="delivery" placeholder="Where should the order be delivered?" /></label>
            <label>Additional requirements<textarea name="notes" rows={4} placeholder="Preferred pack size, target date, brand preferences…" /></label>
            <button type="button" disabled className="quote-disabled-submit">Submission unavailable in preview</button>
            <small className="quote-disclaimer">No details are transmitted. Supplier matching, secure submission, quote tracking and notifications require backend integration.</small>
          </form>
        </div>
        <aside className="quote-side-card"><span className="quote-side-icon">↗</span><h2>What happens next?</h2><ol><li><b>Describe your requirement</b><span>Include the product, volume and delivery location.</span></li><li><b>Compare supplier responses</b><span>When connected, quotes can be reviewed side by side.</span></li><li><b>Confirm terms before ordering</b><span>Validate final pricing, tax, freight, availability and payment terms.</span></li></ol><div className="quote-side-note">This is a workflow preview. No supplier response or order confirmation is generated.</div></aside>
      </div>
    </section>
    <footer className="market-footer"><Link href="/marketplace">← Continue browsing</Link><span>Pranex · Buyer tools preview</span></footer>
  </main>;
}
