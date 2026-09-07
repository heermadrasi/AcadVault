import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type Attachment = { title: string; mime: string; bytes: Uint8Array };

/**
 * Cover PDF + every uploaded file as real pages of one document.
 *
 * Doing this with headless Chrome instead would mean base64-embedding every
 * attachment into the HTML — megabytes of data URI that Chrome chokes on.
 * pdf-lib copies pages directly, so a 40-certificate report stays fast.
 */
export async function mergeReport(
  coverPdf: Uint8Array,
  attachments: Attachment[]
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);

  const cover = await PDFDocument.load(coverPdf);
  const coverPages = await out.copyPages(cover, cover.getPageIndices());
  coverPages.forEach((p) => out.addPage(p));

  for (const att of attachments) {
    try {
      if (att.mime === "application/pdf") {
        const src = await PDFDocument.load(att.bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else if (att.mime === "image/jpeg" || att.mime === "image/png") {
        const img =
          att.mime === "image/jpeg"
            ? await out.embedJpg(att.bytes)
            : await out.embedPng(att.bytes);

        const page = out.addPage([595, 842]); // A4 in points
        const maxW = 595 - 80;
        const maxH = 842 - 120;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;

        page.drawText(att.title.slice(0, 90), {
          x: 40, y: 842 - 50, size: 10, font, color: rgb(0.35, 0.35, 0.35),
        });
        page.drawImage(img, { x: (595 - w) / 2, y: (842 - h) / 2 - 20, width: w, height: h });
      }
      // Anything else is skipped rather than failing the whole report.
    } catch {
      const page = out.addPage([595, 842]);
      page.drawText(`Could not attach: ${att.title.slice(0, 70)}`, {
        x: 40, y: 780, size: 11, font, color: rgb(0.6, 0.1, 0.1),
      });
    }
  }

  // Page numbers across the merged whole — the cover's own numbering only
  // covered the cover, so it gets redone here.
  const pages = out.getPages();
  pages.forEach((p, i) => {
    const { width } = p.getSize();
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: width - 70, y: 20, size: 8, font, color: rgb(0.45, 0.45, 0.45),
    });
  });

  return out.save();
}
