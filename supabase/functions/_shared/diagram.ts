export const formats = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
} as const;
export async function validateDiagram(file: File) {
  const extensions = formats[file.type as keyof typeof formats] as
    | readonly string[]
    | undefined;
  if (!extensions?.includes(file.name.split('.').pop()?.toLowerCase() ?? ''))
    throw new Error(
      'Choose a JPEG, PNG or WebP file with a matching extension.',
    );
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error('Choose an image up to 5 MB.');
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = (offset: number, prefix: number[]) =>
    prefix.every((v, i) => b[offset + i] === v);
  const valid =
    file.type === 'image/jpeg'
      ? matches(0, [255, 216, 255])
      : file.type === 'image/png'
        ? matches(0, [137, 80, 78, 71, 13, 10, 26, 10])
        : matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80]);
  if (!valid) throw new Error('Image content does not match its format.');
  return extensions[0];
}
