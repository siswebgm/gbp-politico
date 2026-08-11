import { HeaderWrapper } from "@/components/layout/header-wrapper";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { BannerColorProvider } from "@/components/features/banners/banner-color-context";
import { getCategories } from "@/lib/services/categorias";
import { getCurrentUser } from "@/lib/services/usuarios";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categorias, user] = await Promise.all([
    getCategories(),
    getCurrentUser(),
  ]);

  return (
    <BannerColorProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden">
        <HeaderWrapper user={user} categorias={categorias} />
        <main className="flex-1">{children}</main>
        <MobileBottomNav categorias={categorias} user={user} />
      </div>
    </BannerColorProvider>
  );
}
