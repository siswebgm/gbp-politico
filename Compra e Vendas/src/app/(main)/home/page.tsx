import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BannerCarousel } from "@/components/features/banners/banner-carousel";
import { QuickShortcuts } from "@/components/features/categorias/quick-shortcuts";
import { ProductGrid } from "@/components/features/anuncios/anuncio-grid";
import { Footer } from "@/components/layout/footer";
import { getCategories } from "@/lib/services/categorias";
import { getActiveBanners } from "@/lib/services/banners";
import { searchProducts } from "@/lib/services/anuncios";

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
      <Link
        href={href}
        className="flex items-center text-xs font-semibold text-primary transition-colors hover:text-primary/80 sm:text-sm"
      >
        Ver todos
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [categorias, banners, recentProducts, featuredProducts] = await Promise.all([
    getCategories(),
    getActiveBanners("home_topo"),
    searchProducts({ sort: "recent", perPage: 8 }),
    searchProducts({ sort: "most_viewed", perPage: 8 }),
  ]);

  return (
    <>
      <BannerCarousel banners={banners} />

      <QuickShortcuts categorias={categorias} />

      <div className="relative z-10 rounded-t-2xl bg-slate-50 px-3 pb-10 pt-5 sm:px-6 sm:pt-8 md:pb-12 md:pt-10">
        <div className="container mx-auto">
          <section className="mb-8 sm:mb-10">
            <SectionHeader title="Recente" href="/produtos?ordenar=recentes" />
            <ProductGrid anuncios={recentProducts.items} carousel />
          </section>

          <section>
            <SectionHeader title="Mais vendidos" href="/produtos?ordenar=mais-vistos" />
            <ProductGrid anuncios={featuredProducts.items} carousel />
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
