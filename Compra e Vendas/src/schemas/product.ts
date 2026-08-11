import { z } from "zod";

export const productSchema = z.object({
  titulo: z.string().min(5, "O título deve ter pelo menos 5 caracteres").max(120),
  descricao: z.string().max(5000).optional(),
  preco: z.coerce.number().min(0, "Preço inválido"),
  categoryId: z.string().uuid("Selecione uma categoria"),
  subcategoryId: z.string().uuid().optional().or(z.literal("")),
  condicao: z.enum(["novo", "usado"], { message: "Selecione a condição" }),
  quantidade: z.coerce.number().int().min(1).default(1),
  cidade: z.string().min(2, "Informe a cidade"),
  condominio: z.string().optional(),
  endereco: z.string().optional(),
  negociavel: z.coerce.boolean().default(false),
  acceptsTrade: z.coerce.boolean().default(false),
  videoUrl: z.string().url("URL de vídeo inválida").optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;

export const MAX_PRODUCT_IMAGES = 20;
export const MAX_PRODUCT_VIDEOS = 1;
