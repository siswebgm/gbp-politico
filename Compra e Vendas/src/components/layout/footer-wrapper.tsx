"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

export function FooterWrapper() {
  const pathname = usePathname();

  // Oculta o footer na listagem de produtos, mantém nas demais páginas
  if (pathname === "/produtos") {
    return null;
  }

  return <Footer />;
}
