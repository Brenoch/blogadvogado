export function isDataImage(value: string): boolean {
  return /^data:image\/(?:jpeg|png|webp);base64,/i.test(value);
}

export function dataUrlToBlob(value: string): Blob {
  const [metadata = '', encoded = ''] = value.split(',');
  const mime = metadata.match(/^data:([^;]+)/i)?.[1] ?? 'image/webp';
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}
