"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const options = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "mais-vistos", label: "Mais vistos" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("ordenar") ?? "recentes";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ordenar", value);
    params.delete("pagina");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      aria-label="Ordenar por"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
