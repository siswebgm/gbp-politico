import jsPDF from 'jspdf';

// foto_url é coluna json: pode vir string, objeto { url } ou array — normaliza para URL
export function extrairFotoUrl(foto: any): string | null {
  if (!foto) return null;
  if (typeof foto === 'string') return foto;
  if (Array.isArray(foto)) return extrairFotoUrl(foto[0]);
  if (typeof foto === 'object') return foto.url || foto.publicUrl || null;
  return null;
}

// Carrega a imagem e converte para JPEG via canvas — garante compatibilidade
// com o jsPDF (WebP/AVIF não são suportados por addImage)
export async function carregarImagemBase64(url: string): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('falha ao carregar imagem'));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
}

// Pré-carrega as fotos dos atendimentos com concorrência limitada —
// Promise.all livre em centenas de imagens satura os sockets do navegador
// (ERR_INSUFFICIENT_RESOURCES) e derruba outras requests da página
export async function carregarFotosAtendimentos(atendimentos: any[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const CONCORRENCIA = 6;
  const fila = atendimentos.filter((a) => a?.uid && extrairFotoUrl(a?.gbp_eleitores?.foto_url));

  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < fila.length) {
      const a = fila[proximo++];
      const url = extrairFotoUrl(a?.gbp_eleitores?.foto_url)!;
      const b64 = await carregarImagemBase64(url);
      if (b64) mapa.set(a.uid, b64);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, trabalhador)
  );
  return mapa;
}

export function formatarDataBR(data?: string | null): string {
  if (!data) return '-';
  const d = new Date(data);
  return isNaN(d.getTime()) ? String(data) : d.toLocaleDateString('pt-BR');
}

const digitos = (s?: string | null) => String(s ?? '').replace(/\D/g, '');

export function formatarCPF(cpf?: string | null): string {
  if (!cpf) return '-';
  const d = digitos(cpf);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
}

export function formatarCEP(cep?: string | null): string {
  if (!cep) return '-';
  const d = digitos(cep);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : cep;
}

export function formatarWhatsApp(tel?: string | null): string {
  if (!tel) return '-';
  const d = digitos(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

export function formatarSUS(sus?: string | null): string {
  if (!sus) return '-';
  const d = digitos(sus);
  return d.length === 15 ? d.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : sus;
}

// Cor do status para leitura rápida (RGB)
function corStatus(status?: string): [number, number, number] {
  const v = (status || '').toLowerCase();
  if (v.includes('conclu')) return [22, 163, 74];   // verde
  if (v.includes('cancel')) return [220, 38, 38];   // vermelho
  if (v.includes('andamento')) return [37, 99, 235]; // azul
  return [217, 119, 6];                              // laranja (pendente/default)
}

function truncar(valor: string, max: number): string {
  const s = String(valor ?? '-');
  if (!s) return '-';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Desenha a foto com borda; qualquer falha é ignorada silenciosamente
function adicionarFoto(doc: jsPDF, dataUrl: string | null, x: number, y: number, size = 22) {
  if (!dataUrl) return;
  try {
    doc.addImage(dataUrl, 'JPEG', x, y, size, size);
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, size, size);
  } catch {
    /* imagem inválida — ignora */
  }
}

// --- Layout do bloco -------------------------------------------------------

const LIMITE_PAGINA = 275;

// Seções de dados da pessoa ficam deslocadas à direita da foto (foto menor)
const X_PESSOA_LABEL = 33;
const X_PESSOA_VALOR = 66;
const X_PESSOA_LABEL2 = 112;
const X_PESSOA_VALOR2 = 146;

// Seções de largura total (endereço, atendimento)
const X_LABEL = 15;
const X_VALOR = 48;
const X_LABEL2 = 115;
const X_VALOR2 = 148;

type NovaPagina = () => number; // retorna o novo yPos após criar a página

function subTitulo(doc: jsPDF, texto: string, y: number) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 110, 110);
  doc.text(texto.toUpperCase(), X_LABEL, y);
  doc.setDrawColor(225, 225, 225);
  doc.line(X_LABEL, y + 1, 195, y + 1);
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
}

// Campo label+valor em posição livre
function campo(doc: jsPDF, xLabel: number, xValor: number, y: number, label: string, valor: string, maxChars: number) {
  doc.setFont('helvetica', 'bold');
  doc.text(label, xLabel, y);
  doc.setFont('helvetica', 'normal');
  doc.text(truncar(valor, maxChars), xValor, y);
}

// Linha em 2 colunas nas seções de largura total
function linha2Col(doc: jsPDF, y: number, c1: [string, string], c2?: [string, string] | null) {
  campo(doc, X_LABEL, X_VALOR, y, c1[0], c1[1], 44);
  if (c2) campo(doc, X_LABEL2, X_VALOR2, y, c2[0], c2[1], 32);
}

/**
 * Desenha um bloco completo de atendimento no PDF:
 * faixa azul (título) → Dados da Pessoa (foto à esquerda) → Endereço →
 * Atendimento → Descrição. Quebra de página interna via `onNovaPagina`.
 * Retorna o yPos atualizado.
 */
export function desenharBlocoAtendimento(
  doc: jsPDF,
  atendimento: any,
  yPos: number,
  titulo: string,
  fotoDataUrl: string | null,
  onNovaPagina?: NovaPagina
): number {
  const garantirEspaco = (necessario = 5): number => {
    if (yPos + necessario > LIMITE_PAGINA) {
      if (onNovaPagina) {
        return onNovaPagina();
      }
      doc.addPage();
      return 30;
    }
    return yPos;
  };

  // Faixa do título
  yPos = garantirEspaco(16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(0, 87, 231);
  doc.setTextColor(255, 255, 255);
  doc.rect(10, yPos - 4, 190, 6, 'F');
  doc.text(titulo, 15, yPos);
  // Data do atendimento à direita da faixa — contexto imediato
  if (atendimento?.data_atendimento) {
    doc.setFontSize(7);
    doc.text(formatarDataBR(atendimento.data_atendimento), 195, yPos, { align: 'right' });
  }
  yPos += 7;

  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  const p = atendimento?.gbp_eleitores || {};
  const fotoX = X_LABEL;
  const camposX = fotoDataUrl ? X_PESSOA_LABEL : X_LABEL; // sem foto, volta margem normal
  const valorX = fotoDataUrl ? X_PESSOA_VALOR : X_VALOR;
  const label2X = fotoDataUrl ? X_PESSOA_LABEL2 : X_LABEL2;
  const valor2X = fotoDataUrl ? X_PESSOA_VALOR2 : X_VALOR2;

  // ---- Dados da Pessoa (foto à esquerda)
  yPos = garantirEspaco(6);
  subTitulo(doc, 'Dados da Pessoa', yPos);
  yPos += 4.5;

  if (fotoDataUrl) adicionarFoto(doc, fotoDataUrl, fotoX, yPos - 1, 16);

  // Nome em linha própria (espaço para nomes longos)
  yPos = garantirEspaco();
  campo(doc, camposX, valorX, yPos, 'Nome:', p.nome || atendimento?.eleitor || '-', fotoDataUrl ? 75 : 92);
  yPos += 4;

  const pessoa: [string, string, string, string][] = [
    ['WhatsApp:', formatarWhatsApp(p.whatsapp || atendimento?.whatsapp), 'CPF:', formatarCPF(p.cpf || atendimento?.cpf)],
    ['Gênero:', p.genero || '-', 'Nascimento:', formatarDataBR(p.nascimento)],
    ['Indicado por:', atendimento?.indicado_nome || p.gbp_indicado?.nome || '-', 'Cat. (pessoa):', p.gbp_categorias?.nome || '-'],
    ['Nº SUS:', formatarSUS(p.numero_do_sus || atendimento?.numero_do_sus), '', ''],
  ];
  pessoa.forEach(([l1, v1, l2, v2]) => {
    yPos = garantirEspaco();
    campo(doc, camposX, valorX, yPos, l1, v1, 26);
    if (l2) campo(doc, label2X, valor2X, yPos, l2, v2, 30);
    yPos += 4;
  });

  // ---- Endereço (logradouro + numero do ELEITOR, sem truncar)
  yPos += 1;
  yPos = garantirEspaco(12);
  subTitulo(doc, 'Endereço', yPos);
  yPos += 4.5;

  const cidadeUf = [p.cidade, p.uf].filter(Boolean).join('/') || '-';

  // Endereço (logradouro) em largura total, quebrando linha se necessário (sem cortar).
  // O 'numero' da RESIDÊNCIA (gbp_eleitores.numero) fica separado, em negrito, na 2ª coluna.
  yPos = garantirEspaco(5);
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', X_LABEL, yPos);
  doc.setFont('helvetica', 'normal');
  const yLinhaEndereco = yPos;
  const linhasEndereco = doc.splitTextToSize(p.logradouro || '-', 62);
  linhasEndereco.forEach((l: string, i: number) => {
    if (i > 0) {
      yPos += 4;
      yPos = garantirEspaco(4);
    }
    doc.text(l, X_VALOR, yPos);
  });
  if (p.numero != null && p.numero !== '') {
    doc.setFont('helvetica', 'bold');
    doc.text('Nº:', X_LABEL2, yLinhaEndereco);
    doc.text(String(p.numero), X_VALOR2, yLinhaEndereco);
    doc.setFont('helvetica', 'normal');
  }
  yPos += 4;

  yPos = garantirEspaco();
  linha2Col(doc, yPos, ['Complemento:', p.complemento || '-'], ['Bairro:', p.bairro || atendimento?.bairro || '-']);
  yPos += 4;
  yPos = garantirEspaco();
  linha2Col(doc, yPos, ['Cidade/UF:', cidadeUf !== '-' ? cidadeUf : atendimento?.cidade || '-'], ['CEP:', formatarCEP(p.cep || atendimento?.cep)]);
  yPos += 4;

  // ---- Atendimento
  yPos += 1;
  yPos = garantirEspaco(12);
  subTitulo(doc, 'Atendimento', yPos);
  yPos += 4.5;

  yPos = garantirEspaco();
  campo(doc, X_LABEL, X_VALOR, yPos, 'Categoria:', atendimento?.gbp_categorias?.nome || '-', 44);
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', X_LABEL2, yPos);
  const [r, g, b] = corStatus(atendimento?.status);
  doc.setTextColor(r, g, b);
  doc.text(truncar(atendimento?.status || '-', 32), X_VALOR2, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPos += 4;
  yPos = garantirEspaco();
  linha2Col(doc, yPos, ['Data:', formatarDataBR(atendimento?.data_atendimento)], ['Responsável:', atendimento?.gbp_usuarios?.nome || atendimento?.responsavel || '-']);
  yPos += 4;
  // Nº do atendimento já vai na faixa azul do título — sem linha duplicada

  // ---- Descrição
  if (atendimento?.descricao) {
    yPos += 1.5;
    yPos = garantirEspaco(12);
    subTitulo(doc, 'Descrição', yPos);
    yPos += 4.5;
    doc.setFont('helvetica', 'normal');
    const linhas = doc.splitTextToSize(String(atendimento.descricao), 175);
    linhas.forEach((l: string) => {
      yPos = garantirEspaco(4);
      doc.text(l, X_LABEL, yPos);
      yPos += 4;
    });
  }

  // Divisória
  yPos += 3;
  doc.setDrawColor(210, 210, 210);
  doc.line(10, yPos, 200, yPos);
  return yPos + 4;
}

// Altura estimada do bloco sem descrição — para a quebra de página preventiva
export const ALTURA_BLOCO_ATENDIMENTO = 68;

/**
 * Estima a altura REAL que o bloco vai ocupar (em mm), considerando
 * wrap do logradouro, linhas da descrição e campos opcionais.
 * Usar para decidir a quebra de página em vez de estimativa fixa —
 * evita páginas com espaço vazio embaixo.
 */
export function estimarAlturaBloco(doc: jsPDF, atendimento: any, temFoto: boolean): number {
  const p = atendimento?.gbp_eleitores || {};
  let h = 0;

  h += 7;                       // faixa do título + respiro
  h += 4.5;                     // subtítulo "Dados da Pessoa"
  h += 4;                       // nome
  h += 4 * 4;                   // 4 linhas de campos (2 col)

  h += 1 + 4.5;                 // respiro + subtítulo "Endereço"
  const linhasEnd = doc.splitTextToSize(p.logradouro || '-', 62).length;
  h += Math.max(1, linhasEnd) * 4 + 4; // endereço (wrap) + número
  h += 4 + 4;                   // complemento/bairro + cidade/cep

  h += 1 + 4.5;                 // respiro + subtítulo "Atendimento"
  h += 4 + 4;                   // categoria/status + data/responsável

  if (atendimento?.descricao) {
    h += 1.5 + 4.5;             // respiro + subtítulo "Descrição"
    h += doc.splitTextToSize(String(atendimento.descricao), 175).length * 4;
  }

  h += 3 + 4;                   // divisória + respiro
  h += 4;                       // margem de segurança (arredondamentos)
  void temFoto;                 // foto não muda a altura (flutua à esquerda)
  return h;
}
