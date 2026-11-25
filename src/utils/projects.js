import { mediaUrl } from './media.js';

/**
 * Returns projects sorted by date, with their cover image resolved
 * from the media manifest.
 *
 * Projects without a valid cover are excluded.
 *
 * @param {Array} projects
 * @param {Array} mediaManifest
 * @returns {Array}
 */
export function getProjectsWithCovers(projects, mediaManifest) {
  return [...projects]
    .sort((a, b) => {
      const dateA = a.data.date?.valueOf() ?? 0;
      const dateB = b.data.date?.valueOf() ?? 0;

      return dateB - dateA;
    })
    .map((project) => {
      const slug = project.id.trim();
      const projectPath = `work/${slug.toLowerCase()}/`;
      const declaredCover = project.data.cover?.trim().toLowerCase();

      const cover = mediaManifest.find((image) => {
        const normalizedPath = image.path.toLowerCase();

        if (!normalizedPath.startsWith(projectPath)) {
          return false;
        }

        const filename = normalizedPath.split('/').pop();

        if (declaredCover) {
          return filename === declaredCover;
        }

        return /^cover\.(jpg|jpeg|png|webp)$/.test(filename);
      });

      if (!cover) {
        return null;
      }

      return {
        ...project,
        slug,
        image: {
          src: mediaUrl(cover.path),
          width: cover.width,
          height: cover.height,
        },
      };
    })
    .filter(Boolean);
}