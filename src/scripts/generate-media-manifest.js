
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CONTENT_DIR = resolve('src/content');
const OUTPUT_FILE = resolve('src/data/media-manifest.json');

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

async function getImageDimensions(filePath) {
  const { stdout } = await execFileAsync('sips', [
    '-g', 'pixelWidth',
    '-g', 'pixelHeight',
    filePath,
  ]);

  const width = Number(stdout.match(/pixelWidth: (\d+)/)?.[1]);
  const height = Number(stdout.match(/pixelHeight: (\d+)/)?.[1]);

  if (!width || !height) {
    throw new Error(`No se pudieron obtener las dimensiones: ${filePath}`);
  }

  return { width, height };
}

async function collectImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const images = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      images.push(...await collectImages(fullPath));
      continue;
    }

    const extension = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();

    if (!IMAGE_EXTENSIONS.has(extension)) continue;

    const dimensions = await getImageDimensions(fullPath);

    const imagePath = relative(CONTENT_DIR, fullPath)
      .split(sep)
      .join('/');

    images.push({
      path: imagePath,
      ...dimensions,
    });
  }

  return images;
}

async function main() {
  const images = await collectImages(CONTENT_DIR);

  images.sort((a, b) => a.path.localeCompare(b.path));

  await mkdir(resolve('src/data'), { recursive: true });

  await writeFile(
    OUTPUT_FILE,
    JSON.stringify(images, null, 2) + '\n',
    'utf8',
  );

  console.log(`Manifiesto generado: ${images.length} imágenes.`);
}

main().catch((error) => {
  console.error('Error al generar el manifiesto:', error);
  process.exitCode = 1;
});
