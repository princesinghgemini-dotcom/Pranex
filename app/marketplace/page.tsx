import Link from "next/link";

const categories = [
  { icon: "✳", name: "Animal nutrition", detail: "Minerals, supplements & feed" },
  { icon: "✚", name: "Animal health", detail: "Care, hygiene & wellness" },
  { icon: "⌁", name: "Milking equipment", detail: "Dairy tools & accessories" },
  { icon: "▦", name: "Farm essentials", detail: "Everyday dairy supplies" },
];

const demoProducts = [
  { id: "PRX-1048", name: "Calcium Mineral Mixture", type: "Animal nutrition", pack: "5 kg pack", price: "₹1,250", unit: "per pack", moq: "MOQ 5 packs", initials: "Ca", tone: "mint", tag: "Bestseller" },
  { id: "PRX-2071", name: "Udder Care Hygiene Solution", type: "Animal health", pack: "1 L bottle", price: "₹640", unit: "per bottle", moq: "MOQ 12 bottles", initials: "Uc", tone: "lavender", tag: "High repeat" },
  { id: "PRX-3306", name: "Dairy Farm Disinfectant", type: "Farm essentials", pack: "5 L can", price: "₹890", unit: "per can", moq: "MOQ 4 cans", initials: "Df", tone: "sand", tag: "Farm essential" },
  { id: "PRX-4122", name: "Stainless Steel Milk Can", type: "Milking equipment", pack: "40 L capacity", price: "₹3,450", unit: "per unit", moq: "MOQ 2 units", initials: "40", tone: "sky", tag: "Durable pick" },
];

type ProductCard = {
  id: string; name: string; type: string; pack: string; price: string;
  unit: string; moq: string; initials: string; tone: string; tag: string;
};

type CatalogMode = "demo" | "live" | "unavailable";

async function getCatalog(): Promise<{ products: ProductCard[]; mode: CatalogMode }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return { products: demoProducts, mode: "demo" };

  try {
    const url = new URL("/rest/v1/products", supabaseUrl);
    url.searchParams.set("select", "id,name,brand,category:categories(name_en),variants:product_variants(id,sku,pack_size,mrp_paise,min_order_quantity,active)");
    url.searchParams.set("status", "eq.approved");
    url.searchParams.set("variants.active", "eq.true");
    url.searchParams.set("order", "name.asc");
    const response = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { products: [], mode: "unavailable" };
    const rows = await response.json() as Array<{
      id: string; name: string; brand: string | null;
      category: { name_en: string } | null;
      variants: Array<{ id: string; sku: string; pack_size: string; mrp_paise: number | null; min_order_quantity: number; active: boolean }>;
    }>;
    const tones = ["mint", "lavender", "sand", "sky"];
    const products = rows.flatMap((row, index) => {
      const variant = row.variants?.find((item) => item.active);
      if (!variant) return [];
      const price = variant.mrp_paise == null
        ? "Request price"
        : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(variant.mrp_paise / 100);
      const initials = row.name.split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").slice(0, 2);
      return [{
        id: variant.sku || row.id,
        name: row.name,
        type: row.category?.name_en || "Approved listing",
        pack: variant.pack_size,
        price,
        unit: variant.mrp_paise == null ? "pricing on enquiry" : "listed MRP",
        moq: `MOQ ${variant.min_order_quantity} ${variant.min_order_quantity === 1 ? "unit" : "units"}`,
        initials,
        tone: tones[index % tones.length],
        tag: "Approved listing",
      }];
    });
    return { products, mode: "live" };
  } catch {
    return { products: [], mode: "unavailable" };
  }
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase();
  const catalog = await getCatalog();
  const products = catalog.products;
  const visibleProducts = query ? products.filter((product) => [product.name, product.type, product.pack, product.id].some((value) => value.toLocaleLowerCase().includes(query))) : products;
  return <main className="marketplace">
    <div className="market-topline"><span>Built for India’s dairy & livestock supply chain</span><span>Need help? Support contact not configured</span></div>
    <header className="market-header">
      <Link href="/marketplace" className="market-brand" aria-label="Pranex marketplace home"><span className="market-logo">P</span><span>pranex<small>TRADE WITH CONFIDENCE</small></span></Link>
      <form className="market-search" action="/marketplace" method="get"><span aria-hidden="true">⌕</span><input name="q" aria-label="Search products and suppliers" placeholder="Search products, brands, or suppliers" defaultValue={params.q ?? ""} /><button type="submit">Search</button></form>
      <div className="market-actions"><Link href="/workspaces" className="market-workspaces">Workspaces</Link><Link href="/marketplace/quotes" className="market-quote-link">♧ <span>My quotes</span></Link><Link href="/marketplace/cart" className="market-cart" aria-label="Shopping cart">▣ <span>Cart</span><b>0</b></Link></div>
    </header>
    <nav className="market-nav" aria-label="Main marketplace navigation"><Link href="/marketplace" className="selected">Discover</Link><a href="#categories">Shop by category</a><a href="#products">Popular products</a><a href="#bulk-order">Bulk orders</a><span className="nav-promise">✓ Supplier-led pricing · Business-ready ordering</span></nav>
    <section className="market-hero">
      <div className="hero-copy"><p className="market-eyebrow"><span></span> YOUR BUSINESS. BETTER SUPPLIED.</p><h1>Everything your dairy business needs. <em>In one place.</em></h1><p className="hero-description">Discover farm essentials, compare product options and connect with suppliers built for the needs of Indian livestock businesses.</p><div className="hero-buttons"><a href="#products" className="market-button primary-market">Explore products <span>→</span></a><a href="#bulk-order" className="market-button secondary-market">Request bulk pricing</a></div><div className="hero-proof"><span><b>✓</b> Business-focused catalogue</span><span><b>✓</b> Clear minimum order quantities</span></div></div>
      <div className="hero-art" aria-label="Illustration of a dairy supply basket"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-sun"></div><div className="art-card card-top"><span>✳</span><div><b>Farm essentials</b><small>Supply for every day</small></div></div><div className="art-product art-bottle"><div className="bottle-cap"></div><div className="bottle-label">PRX<small>CARE</small></div></div><div className="art-product art-bag"><div className="bag-label">MINERAL<small>BLEND</small></div></div><div className="art-can"><div className="can-handle"></div><div className="can-shine"></div></div><div className="art-leaf leaf-a"></div><div className="art-leaf leaf-b"></div><div className="art-ground"></div><div className="art-card card-bottom"><span>↗</span><div><b>Built for bulk</b><small>Ask suppliers for a quote</small></div></div></div>
      <div className="hero-index"><span>01</span><i></i><span>SUPPLY, SIMPLIFIED</span></div>
    </section>
    <section className="market-trust" aria-label="Marketplace principles"><div><span className="trust-icon">⌕</span><p><b>Find the right fit</b><small>Explore a focused catalogue</small></p></div><div><span className="trust-icon">⇄</span><p><b>Compare with clarity</b><small>See packs, MOQ and pricing</small></p></div><div><span className="trust-icon">♧</span><p><b>Buy for your business</b><small>Start with supplier enquiries</small></p></div><div><span className="trust-icon">◎</span><p><b>Support when you need it</b><small>A clear path to get help</small></p></div></section>
    <section className="market-section category-section" id="categories"><div className="market-section-heading"><div><p className="market-eyebrow">BROWSE THE RANGE</p><h2>Shop by category</h2><p className="market-muted">Find supplies for the work you do every day.</p></div><a href="#products" className="text-link">View all products <span>→</span></a></div><div className="market-category-grid">{categories.map((category, index) => <a className="market-category" href="#products" key={category.name}><span className={"category-icon category-"+index}>{category.icon}</span><span className="category-copy"><b>{category.name}</b><small>{category.detail}</small></span><span className="category-arrow">↗</span></a>)}</div></section>
    <section className="market-section products-section" id="products"><div className="market-section-heading"><div><p className="market-eyebrow">A GOOD PLACE TO START</p><h2>Popular products</h2><p className="market-muted">{catalog.mode === "live" ? "Approved listings from the live catalogue. Confirm final terms before placing an order." : catalog.mode === "unavailable" ? "The live catalogue is temporarily unavailable. Please try again later." : "Explore sample listings and the details buyers need up front."}</p></div><span className="sample-catalogue">{catalog.mode === "live" ? "LIVE APPROVED LISTINGS" : catalog.mode === "unavailable" ? "CATALOGUE UNAVAILABLE" : "Illustrative catalogue"}</span></div><div className="market-product-grid">{visibleProducts.map((product) => <article className="market-product" key={product.id}><div className={"product-visual "+product.tone}><span className="product-tag">{product.tag}</span><div className={"product-object object-"+product.tone}><span>{product.initials}</span></div><span className="product-id">{product.id}</span></div><div className="product-info"><p className="product-type">{product.type}</p><h3>{product.name}</h3><p className="product-pack">{product.pack}</p><div className="product-price"><strong>{product.price}</strong><span>{product.unit}</span></div><div className="product-bottom"><span>{product.moq}</span><Link href="/marketplace/quotes" aria-label={"Enquire about "+product.name}>↗</Link></div></div></article>)}</div>{visibleProducts.length === 0 && <div className="market-no-results"><b>{catalog.mode === "unavailable" ? "Live catalogue unavailable." : catalog.mode === "live" ? (query ? "No matching approved listings found." : "No approved listings published yet.") : "No matching sample products found."}</b><span>{catalog.mode === "unavailable" ? "Please retry later. Demo listings are hidden while live catalogue mode is enabled." : "Try a product name, category, pack size or product ID."}</span><Link href="/marketplace">Clear search →</Link></div>}{catalog.mode === "demo" && <p className="catalogue-disclaimer">Prices and products shown are demonstration content, not verified offers or live inventory. Confirm availability, taxes, shipping and final pricing with the supplier.</p>}{catalog.mode === "live" && <p className="catalogue-disclaimer">Listings are approved catalogue records, not a guarantee of stock. Listed MRP is informational; confirm availability, taxes, shipping and negotiated pricing with the supplier.</p>}</section>
    <section className="bulk-banner" id="bulk-order"><div className="bulk-symbol">↗</div><div><p className="market-eyebrow">BUYING FOR YOUR BUSINESS?</p><h2>Ordering in volume? Start with a conversation.</h2><p>Share what you need and prepare a supplier quote request. No payment is taken on this preview page.</p></div><Link href="/marketplace/quotes" className="market-button bulk-button">Explore quote workflow <span>→</span></Link><div className="bulk-decoration"></div></section>
    <footer className="market-footer"><Link href="/marketplace" className="market-brand"><span className="market-logo">P</span><span>pranex<small>TRADE WITH CONFIDENCE</small></span></Link><span>Designed for a more connected supply chain.</span><div><Link href="/workspaces">Platform workspaces</Link><span>Contact support</span></div><small className="footer-preview">Marketplace preview · Sample catalogue · No live checkout or supplier verification</small></footer>
  </main>;
}
