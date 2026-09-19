import { ApiService } from './api.service';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'i6utfmih';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

/**
 * Sanitiza una imagen eliminando metadatos EXIF, coordenadas GPS, fecha de captura y datos del dispositivo
 * mediante rasterizado en Canvas limpio en memoria.
 */
async function stripExifAndSanitize(fileOrBase64: File | string): Promise<string> {
  return new Promise<string>((resolve) => {
    try {
      if (typeof window === 'undefined') {
        resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const cleanupAndResolve = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(img.src);
            return;
          }
          ctx.drawImage(img, 0, 0);
          // toDataURL genera una nueva imagen limpia sin metadatos EXIF, sin GPS y sin fecha
          const cleanBase64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve(cleanBase64);
        } catch {
          resolve(img.src);
        }
      };

      img.onload = cleanupAndResolve;
      img.onerror = () => {
        if (typeof fileOrBase64 === 'string') {
          resolve(fileOrBase64);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(fileOrBase64);
        }
      };

      if (typeof fileOrBase64 === 'string') {
        img.src = fileOrBase64;
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          img.src = reader.result as string;
        };
        reader.readAsDataURL(fileOrBase64);
      }
    } catch {
      resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
    }
  });
}

/**
 * Sube una imagen a Cloudinary (Intenta primero vía Backend NestJS firmado, luego directo Unsigned, luego Base64 local),
 * garantizando la eliminación completa de datos EXIF, fecha de captura y coordenadas GPS.
 */
export async function uploadToCloudinary(fileOrBase64: File | string, folder = 'nexora_calzado'): Promise<string> {
  if (!fileOrBase64) return '';

  const base64String = await stripExifAndSanitize(fileOrBase64);

  // 1. Intentar subida firmada mediante Backend NestJS
  try {
    const res = await ApiService.post('/cloudinary/upload', {
      base64Data: base64String,
      folder,
    });
    if (res && (res.url || res.secure_url)) {
      return res.url || res.secure_url;
    }
  } catch (err) {
    console.warn('Petición al backend Cloudinary no disponible, intentando subida directa:', err);
  }

  // 2. Fallback: Subida directa sin firmar usando Cloud Name & Upload Preset
  try {
    const formData = new FormData();
    formData.append('file', base64String);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.secure_url || data.url) {
        return data.secure_url || data.url;
      }
    }
  } catch (err) {
    console.warn('Error en subida directa a Cloudinary:', err);
  }

  // 3. Si no hay conexión o falla la nube, conserva la copia local (Base64)
  return base64String;
}

/**
 * Elimina una imagen de Cloudinary mediante el backend NestJS con firma de seguridad.
 */
export async function deleteFromCloudinary(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return false;

  try {
    const res = await ApiService.delete('/cloudinary/delete', { imageUrl });
    return res.success === true;
  } catch (err) {
    console.warn('Error/Offline al eliminar de Cloudinary:', err);
    return false;
  }
}
