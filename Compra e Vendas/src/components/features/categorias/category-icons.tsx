"use client";

import {
  Car,
  Smartphone,
  Home,
  Shirt,
  Sofa,
  Bike,
  Briefcase,
  PawPrint,
  Dumbbell,
  MoreHorizontal,
  LayoutGrid,
  Star,
} from "lucide-react";

export const categoryIcons: Record<string, React.ReactNode> = {
  veiculos: <Car className="size-5" />,
  imoveis: <Home className="size-5" />,
  celulares: <Smartphone className="size-5" />,
  eletronicos: <Smartphone className="size-5" />,
  moda: <Shirt className="size-5" />,
  "moda-e-acessorios": <Shirt className="size-5" />,
  moveis: <Sofa className="size-5" />,
  esportes: <Bike className="size-5" />,
  servicos: <Briefcase className="size-5" />,
  animais: <PawPrint className="size-5" />,
  saude: <Dumbbell className="size-5" />,
  mais: <MoreHorizontal className="size-5" />,
  mercado: <LayoutGrid className="size-5" />,
  mais_vendidos: <Star className="size-5" />,
};
