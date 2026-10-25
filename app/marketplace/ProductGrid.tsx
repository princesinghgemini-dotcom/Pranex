"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type MarketplaceProduct = {
  id: string;
  name: string;
  type: string;
  pack: string;
  price: string;
  unit: string;
  moq: string;
  initials: string;
  tone: string;
  tag: string;
};

type CartLine = Pick<MarketplaceProduct, "id" | "name" | "pack" | "price" | "unit" | "moq" | "tone" | "initials"> & { quantity: number };
const STORAGE_KEY = "pranex-buyer-cart-v1";

function readCart(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is CartLine =>
      !!line && typeof line.id === "string" && typeof line.name === "string" &&
      typeof line.price === "string" && Number.isSafeInteger(line.quantity) && line.quantity > 0
    );
  } catch {
    return [];
  }
}

export default function ProductGrid({ products }: { products: MarketplaceProduct[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    setCart(readCart());
  }, []);

  function addToCart(product: MarketplaceProduct) {
    const next = (() => {
      const current = readCart();
      const existing = current.find((line) => line.id === product.id);
      if (existing) return current.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      const { type: _type, tag: _tag, ...line } = product;
      return [...current, { ...line, quantity: 1 }];
    })();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCart(next);
    setAddedId(product.id);
  }

  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);

  return <>
    <div className="market-product-grid">{products.map((product) => <article className="market-product" key={product.id}>
      <div className={"product-visual " + product.tone}><span className="product-tag">{product.tag}</span><div className={"product-object object-" + product.tone}><span>{product.initials}</span></div><span className="product-id">{product.id}</span></div>
      <div className="product-info"><p className="product-type">{product.type}</p><h3>{product.name}</h3><p className="product-pack">{product.pack}</p><div className="product-price"><strong>{product.price}</strong><span>{product.unit}</span></div>
        <div className="product-bottom"><span>{product.moq}</span><Link href="/marketplace/quotes" aria-label={"Enquire about " + product.name}>↗</Link></div>
        <button type="button" className="product-add-cart" onClick={() => addToCart(product)}>{addedId === product.id ? "Add another +1" : "Add to cart +"}</button>
      </div>
    </article>)}</div>
    <div className="product-cart-feedback" aria-live="polite">{addedId ? <span>Added to your device cart. This does not place an order.</span> : <span>Cart is saved in this browser on this device.</span>}<Link href="/marketplace/cart">View cart ({cartCount}) →</Link></div>
  </>;
}
