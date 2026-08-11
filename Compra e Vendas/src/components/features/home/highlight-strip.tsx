import { Truck } from "lucide-react";

export function HighlightStrip() {
  return (
    <div className="relative z-20 -mt-8 flex items-center justify-center px-4 sm:hidden">
      <div className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white py-3 text-sm font-medium text-foreground shadow-lg shadow-black/5">
        <Truck className="size-5 text-primary" />
        <span>Frete grátis e rápido na sua primeira compra</span>
      </div>
    </div>
  );
}
