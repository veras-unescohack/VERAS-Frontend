/**
 * Redimensiona y comprime imágenes directamente en el navegador.
 * Para PDFs, valida que no superen el tamaño máximo.
 */
export async function processAndValidateFile(file, { maxImageDimension = 1280, quality = 0.75, maxPdfSizeMB = 5 } = {}) {
  if (!file) return null;

  // Validación para PDFs (no se pueden recomprimir nativamente en el cliente sin librerías pesadas)
  if (file.type === 'application/pdf') {
    const maxBytes = maxPdfSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`El PDF supera el límite permitido de ${maxPdfSizeMB} MB.`);
    }
    return file;
  }

  // Compresión y reescalado de imágenes (PNG / JPG / WEBP)
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        let { width, height } = img;

        // Mantener relación de aspecto reduciendo dimensiones máximas
        if (width > maxImageDimension || height > maxImageDimension) {
          if (width > height) {
            height = Math.round((height * maxImageDimension) / width);
            width = maxImageDimension;
          } else {
            width = Math.round((width * maxImageDimension) / height);
            height = maxImageDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a Blob JPEG optimizado
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al procesar la compresión de la imagen.'));
              return;
            }
            const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          'image/jpeg',
          quality
        );
      };

      reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
      reader.readAsDataURL(file);
    });
  }

  throw new Error('Tipo de archivo no soportado. Sube una imagen (JPG/PNG) o un PDF.');
}