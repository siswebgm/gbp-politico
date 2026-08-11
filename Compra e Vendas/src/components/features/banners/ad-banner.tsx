import Image from "next/image";
import Link from "next/link";

interface AdBannerProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  link?: string;
  position?: "home_meio" | "home_topo" | "barra_lateral";
}

export function AdBanner({
  title = "Publicidade",
  subtitle = "Seu anúncio pode aparecer aqui",
  imageUrl,
  link = "#",
  position = "home_meio",
}: AdBannerProps) {
  const content = (
    <div className="group relative overflow-hidden rounded-xl border border-dashed border-border/60 bg-gradient-to-br from-muted/50 to-muted p-6 transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        {imageUrl ? (
          <div className="relative aspect-[21/6] w-full overflow-hidden rounded-lg">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <>
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            <p className="text-xs text-muted-foreground/70">{subtitle}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors group-hover:bg-primary/20">
              Saiba mais
            </span>
          </>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
