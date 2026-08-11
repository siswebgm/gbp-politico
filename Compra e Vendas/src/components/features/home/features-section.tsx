import { Shield, Zap, Users, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Rápido e Fácil",
    description: "Anuncie em minutos e comece a vender hoje mesmo",
  },
  {
    icon: Shield,
    title: "Seguro",
    description: "Suas informações protegidas e transações seguras",
  },
  {
    icon: Users,
    title: "Comunidade Ativa",
    description: "Milhares de pessoas comprando e vendendo",
  },
  {
    icon: TrendingUp,
    title: "Melhores Ofertas",
    description: "Encontre os melhores preços do mercado",
  },
];

export function FeaturesSection() {
  return (
    <section className="border-y bg-gradient-to-br from-muted/30 to-background py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Por que escolher o CompraJá?
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            A melhor plataforma para comprar e vender com segurança
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="size-6" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
