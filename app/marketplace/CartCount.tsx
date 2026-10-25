"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pranex-buyer-cart-v1";

function readCount() {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return 0;
    return value.reduce((sum, item) => sum + (item && Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 0), 0);
  } catch { return 0; }
}

export default function CartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(readCount());
    update();
    window.addEventListener("storage", update);
    window.addEventListener("pranex-cart-updated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("pranex-cart-updated", update);
    };
  }, []);
  return <b>{count}</b>;
}
