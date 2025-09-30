export interface Subcategory {
  id: number;
  nome: string;
  value: string;
}

export interface Category {
  id: number;
  nome: string;
  subcategorias: Subcategory[];
}

export const categories: Category[] = [
  {
    id: 1,
    nome: "Documentos",
    subcategorias: [
      { id: 1, nome: "Identidade", value: "identidade" },
      { id: 2, nome: "Registro", value: "registro" },
      { id: 3, nome: "Carteira de Trabalho", value: "carteira-trabalho" },
      { id: 4, nome: "CNH", value: "cnh" }
    ]
  },
  {
    id: 2,
    nome: "Benefícios",
    subcategorias: [
      { id: 5, nome: "Bolsa Família", value: "bolsa-familia" },
      { id: 6, nome: "Auxílio Brasil", value: "auxilio-brasil" },
      { id: 7, nome: "BPC", value: "bpc" }
    ]
  }
  // Adicione mais categorias conforme necessário
];
