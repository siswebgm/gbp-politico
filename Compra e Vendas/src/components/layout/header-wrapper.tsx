"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import type { Tables } from "@/lib/supabase/database.types";
import type { CategoryWithChildren } from "@/lib/services/categorias";

export function HeaderWrapper({
  user,
  categorias,
}: {
  user: Tables<"usuarios"> | null;
  categorias: CategoryWithChildren[];
}) {
  const pathname = usePathname();

  // Header com busca só aparece na home
  if (pathname !== "/home") return null;

  return <Header user={user} categorias={categorias} />;
}
