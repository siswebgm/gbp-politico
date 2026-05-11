/**
 * Utilitário para compressão de imagens
 * Reduz o tamanho do arquivo mantendo qualidade visual aceitável
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

/**
 * Comprime uma imagem usando canvas
 * @param file - Arquivo de imagem original
 * @param options - Opções de compressão
 * @returns Promise<File> - Arquivo comprimido
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxSizeMB = 2
  } = options;

  // Se o arquivo já for menor que o limite, retorna ele mesmo
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxSizeBytes) {
    console.log(`[ImageCompression] Arquivo já está dentro do limite: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Criar canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Desenhar imagem com suavização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para blob com qualidade ajustada
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao criar blob da imagem'));
              return;
            }

            // Criar novo arquivo
            const compressedFile = new File([blob], file.name, {
              type: outputType,
              lastModified: file.lastModified,
            });

            const originalSize = (file.size / 1024 / 1024).toFixed(2);
            const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
            const reduction = ((file.size - compressedFile.size) / file.size * 100).toFixed(0);

            console.log(`[ImageCompression] Original: ${originalSize}MB → Comprimido: ${compressedSize}MB (${reduction}% redução)`);

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Erro ao carregar imagem para compressão'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo para compressão'));
    };
  });
}

/**
 * Comprime múltiplas imagens
 * @param files - Array de arquivos de imagem
 * @param options - Opções de compressão
 * @returns Promise<File[]> - Array de arquivos comprimidos
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  const compressedFiles: File[] = [];
  
  for (const file of files) {
    try {
      const compressed = await compressImage(file, options);
      compressedFiles.push(compressed);
    } catch (error) {
      console.error(`[ImageCompression] Erro ao comprimir ${file.name}:`, error);
      // Se falhar a compressão, adiciona o arquivo original
      compressedFiles.push(file);
    }
  }
  
  return compressedFiles;
}

/**
 * Verifica se um arquivo precisa de compressão
 * @param file - Arquivo a verificar
 * @param maxSizeMB - Tamanho máximo em MB
 * @returns boolean
 */
export function needsCompression(file: File, maxSizeMB: number = 2): boolean {
  return file.size > (maxSizeMB * 1024 * 1024);
}
