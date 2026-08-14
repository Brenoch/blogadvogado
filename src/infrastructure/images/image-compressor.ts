interface CompressionProfile {
  maxWidth: number;
  targetBytes: number;
  initialQuality: number;
}

export interface CompressedImage {
  full: string;
  thumbnail: string;
  fullBytes: number;
  thumbnailBytes: number;
}

type Bitmap = ImageBitmap | HTMLImageElement;

export class ImageCompressor {
  public async articleImage(file: File): Promise<CompressedImage> {
    this.validate(file, 20 * 1024 * 1024);
    const bitmap = await this.bitmap(file);
    try {
      const [full, thumbnail] = await Promise.all([
        this.compress(bitmap, { maxWidth: 1600, targetBytes: 950 * 1024, initialQuality: .84 }),
        this.compress(bitmap, { maxWidth: 600, targetBytes: 120 * 1024, initialQuality: .76 })
      ]);
      return {
        full: await this.dataUrl(full),
        thumbnail: await this.dataUrl(thumbnail),
        fullBytes: full.size,
        thumbnailBytes: thumbnail.size
      };
    } finally {
      if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  public async avatar(file: File): Promise<string> {
    this.validate(file, 10 * 1024 * 1024);
    const bitmap = await this.bitmap(file);
    try {
      const blob = await this.compress(bitmap, {
        maxWidth: 640,
        targetBytes: 480 * 1024,
        initialQuality: .82
      });
      return this.dataUrl(blob);
    } finally {
      if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  private validate(file: File, maxBytes: number): void {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('Use imagens JPG, PNG ou WebP.');
    if (file.size > maxBytes) throw new Error(`A imagem original deve ter até ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  private async bitmap(file: File): Promise<Bitmap> {
    if ('createImageBitmap' in window) return createImageBitmap(file);
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível abrir a imagem.'));
      };
      image.src = url;
    });
  }

  private async compress(bitmap: Bitmap, profile: CompressionProfile): Promise<Blob> {
    let width = Math.min(bitmap.width, profile.maxWidth);
    let quality = profile.initialQuality;
    let lastBlob: Blob | null = null;

    for (let attempt = 0; attempt < 9; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(bitmap.height * (canvas.width / bitmap.width)));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('O navegador não permite processar imagens.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      lastBlob = await this.canvasBlob(canvas, quality);
      if (lastBlob.size <= profile.targetBytes) return lastBlob;
      if (quality > .42) quality = Math.max(.42, quality - .1);
      else width = Math.max(360, Math.round(width * .78));
    }
    if (!lastBlob || lastBlob.size > profile.targetBytes) {
      throw new Error('Não foi possível reduzir a imagem para 1 MB. Use uma imagem menor.');
    }
    return lastBlob;
  }

  private canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível converter a imagem.')), 'image/webp', quality);
    });
  }

  private dataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(blob);
    });
  }
}

export const imageCompressor = new ImageCompressor();
