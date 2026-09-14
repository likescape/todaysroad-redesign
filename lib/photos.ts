import type { WalkPhoto } from "./journal";

export async function readPhoto(file: File): Promise<WalkPhoto> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("JPG, PNG, WebP 사진을 선택해 주세요.");
  if (file.size > 10 * 1024 * 1024) throw new Error("사진 한 장은 10MB 이하로 선택해 주세요.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { id: crypto.randomUUID(), name: file.name, src: canvas.toDataURL("image/jpeg", 0.75) };
  } catch (error) {
    if (error instanceof Error && error.message.includes("다시 시도")) throw error;
    throw new Error("사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.");
  } finally { URL.revokeObjectURL(url); }
}
