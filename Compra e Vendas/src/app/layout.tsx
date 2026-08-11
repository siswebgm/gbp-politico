import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: siteConfig.nome,
    template: `%s | ${siteConfig.nome}`,
  },
  description: siteConfig.descricao,
  keywords: ["marketplace", "compra e venda", "anúncios", "produtos"],
  authors: [{ name: siteConfig.nome }],
  creator: siteConfig.nome,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    title: siteConfig.nome,
    description: siteConfig.descricao,
    siteName: siteConfig.nome,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.nome,
    description: siteConfig.descricao,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
