export function extractDominantColor(
  imageUrl: string,
  region: "top" | "bottom" | "all" = "all"
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }

      const w = 100;
      const h = 100;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const inRegion =
            region === "top"
              ? y < 3 && (x < 30 || x >= w - 30)
              : region === "bottom"
              ? y >= h - 3 && (x < 30 || x >= w - 30)
              : x < 10 || x >= w - 10 || y < 10 || y >= h - 10;

          if (!inRegion) continue;

          const i = (y * w + x) * 4;
          r += imageData[i];
          g += imageData[i + 1];
          b += imageData[i + 2];
          count++;
        }
      }

      if (count === 0) {
        resolve("");
        return;
      }

      resolve(
        `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(
          b / count
        )})`
      );
    };

    img.onerror = () => resolve("");
    img.src = imageUrl;
  });
}

export function rgbToRgba(rgb: string, alpha: number) {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
}

export function isLightColor(rgb: string, alpha = 1, backgroundLuminance = 1) {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return false;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const colorLuminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const blended = alpha * colorLuminance + (1 - alpha) * backgroundLuminance;
  return blended > 0.55;
}
