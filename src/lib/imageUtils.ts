/** Resize a File to a square JPEG data URL (max side `size`px, quality 0-1). */
export async function fileToResizedDataUrl(
  file: File,
  size = 256,
  quality = 0.85
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("ไฟล์ไม่ใช่รูปภาพ");
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}
