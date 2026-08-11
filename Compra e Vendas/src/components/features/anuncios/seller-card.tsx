import Image from "next/image";
import Link from "next/link";
import { Star, User as UserIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SellerCard({
  slug,
  nome,
  photoUrl,
  city,
  rating,
  createdAt,
  className,
}: {
  slug: string;
  nome: string;
  photoUrl: string | null;
  city: string | null;
  rating: number | null;
  createdAt: string;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
          {photoUrl ? (
            <Image src={photoUrl} alt={nome} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <UserIcon className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link href={`/usuario/${slug}`} className="font-medium hover:underline">{nome}</Link>
          <p className="truncate text-sm text-muted-foreground">{city ?? "—"}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {typeof rating === "number" && rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
            <span>Membro desde {formatRelativeDate(createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
