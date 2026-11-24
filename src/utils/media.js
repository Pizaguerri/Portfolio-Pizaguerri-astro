const MEDIA_BASE_URL = 'https://media.pabloizaguerri.org';

/**
 * Construye la URL pública de una imagen almacenada en R2.
 *
 * Ejemplo:
 * mediaUrl('projects/BarcelonaExperience/cover.jpg')
 */
export function mediaUrl(path) {
  const normalizedPath = String(path).replace(/^\/+/, '');

  const encodedPath = normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${MEDIA_BASE_URL}/${encodedPath}`;
}