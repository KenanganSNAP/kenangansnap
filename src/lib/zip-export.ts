import JSZip from "jszip";
import { downloadBlob, safeFilename } from "./download";

export type ZipItem = { url: string; filename: string };

export async function exportZip(name: string, items: ZipItem[]) {
  const zip = new JSZip();
  await Promise.all(
    items.map(async (it) => {
      try {
        const res = await fetch(it.url);
        const buf = await res.arrayBuffer();
        zip.file(it.filename, buf);
      } catch {
        // skip failed
      }
    }),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${safeFilename(name)}.zip`);
}
