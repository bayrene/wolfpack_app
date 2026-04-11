/**
 * Compresses an image file using canvas before storing as base64.
 * Maintains high visual quality while dramatically reducing file size.
 * Max dimension: 1400px, JPEG quality: 0.88
 */
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let { width, height } = img;

        // Only resize if larger than MAX
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);

        // Use original format if PNG (preserves transparency), else JPEG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = file.type === 'image/png' ? undefined : 0.88;
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
