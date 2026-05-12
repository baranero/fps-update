"use client";

import { useEffect } from "react";

export default function ScrollUp() {
  useEffect(() => {
    // Sprawdzamy, czy jesteśmy w przeglądarce i czy element przewijania istnieje
    if (typeof window !== "undefined") {
      window.document.scrollingElement?.scrollTo(0, 0);
    }
  }, []);

  return null;
}