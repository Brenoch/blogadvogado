import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const imageDirectory = resolve(root, 'public', 'images');
const fontDirectory = resolve(root, 'public', 'fonts');

const images = [
  ['041cbf2d42c6d15f.jpg', '041cbf2d42c6d15f.webp', 60],
  ['187376365d715245.png', '187376365d715245.webp', 82],
  ['1fb1e1048c240597.png', '1fb1e1048c240597.webp', 76, 96],
  ['89021c88bdf02655.jpg', '89021c88bdf02655.webp', 82],
  ['9dfe3dde7dcebb7c.png', '9dfe3dde7dcebb7c.webp', 82],
  ['da0602dd94c3e7a7.jpg', 'da0602dd94c3e7a7.webp', 82]
];

await Promise.all(images.map(async ([source, target, quality, width]) => {
  let pipeline = sharp(resolve(imageDirectory, source)).rotate();
  if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
  await pipeline.webp({ quality, effort: 6 }).toFile(resolve(imageDirectory, target));
}));

await sharp(resolve(imageDirectory, '1fb1e1048c240597.png'))
  .resize(64, 64, { fit: 'contain' })
  .png({ compressionLevel: 9, palette: true })
  .toFile(resolve(root, 'public', 'favicon.png'));

await mkdir(fontDirectory, { recursive: true });
await Promise.all([
  copyFont('archivo', 'archivo-latin-400-normal.woff2', 'archivo-400.woff2'),
  copyFont('archivo', 'archivo-latin-600-normal.woff2', 'archivo-600.woff2'),
  copyFont('archivo', 'archivo-latin-700-normal.woff2', 'archivo-700.woff2'),
  copyFont('space-grotesk', 'space-grotesk-latin-700-normal.woff2', 'space-grotesk-700.woff2')
]);

async function copyFont(packageName, source, target) {
  await copyFile(
    resolve(root, 'node_modules', '@fontsource', packageName, 'files', source),
    resolve(fontDirectory, target)
  );
}
