import { downloadBlob, safeFilename } from "./download";

// Generate a printable QR poster as a PNG blob using the rendered SVG.
export async function downloadQrPoster(opts: {
  svgEl: SVGSVGElement;
  title: string;
  subtitle?: string;
  url: string;
  filename: string;
}) {
  const svgString = new XMLSerializer().serializeToString(opts.svgEl);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("QR image load failed"));
    img.src = svgUrl;
  });

  const W = 1080;
  const H = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#f8efdf");
  grad.addColorStop(1, "#efe0c4");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // border frame
  ctx.strokeStyle = "rgba(120,80,40,0.25)";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // header
  ctx.fillStyle = "#3a2a1c";
  ctx.textAlign = "center";
  ctx.font = "30px 'DM Sans', sans-serif";
  ctx.fillText("YOU ARE INVITED", W / 2, 180);

  ctx.font = "italic 72px 'Cormorant Garamond', serif";
  wrapText(ctx, opts.title, W / 2, 280, W - 200, 84);

  if (opts.subtitle) {
    ctx.font = "28px 'DM Sans', sans-serif";
    ctx.fillStyle = "#5a4530";
    ctx.fillText(opts.subtitle, W / 2, 430);
  }

  // QR
  const qrSize = 720;
  ctx.fillStyle = "#fff";
  ctx.fillRect((W - qrSize) / 2 - 20, 500, qrSize + 40, qrSize + 40);
  ctx.drawImage(img, (W - qrSize) / 2, 520, qrSize, qrSize);

  // footer
  ctx.fillStyle = "#3a2a1c";
  ctx.font = "italic 36px 'Cormorant Garamond', serif";
  ctx.fillText("Scan to capture a memory", W / 2, 1320);
  ctx.font = "22px 'DM Sans', sans-serif";
  ctx.fillStyle = "#7a5a3d";
  ctx.fillText(opts.url, W / 2, 1380);
  ctx.font = "20px 'DM Sans', sans-serif";
  ctx.fillStyle = "#9a8060";
  ctx.fillText("KenanganSnap", W / 2, 1440);

  URL.revokeObjectURL(svgUrl);

  const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), "image/png", 0.95));
  downloadBlob(blob, `${safeFilename(opts.filename)}-qr-poster.png`);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w; yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
