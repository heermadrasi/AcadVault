import puppeteer, { type Browser } from "puppeteer";

let browser: Browser | null = null;

/** One browser for the process lifetime; a fresh page per job. */
async function getBrowser(): Promise<Browser> {
  if (browser?.connected) return browser;
  browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // /dev/shm is tiny in containers; Chrome crashes without this
      "--disable-gpu",
    ],
  });
  return browser;
}

export async function htmlToPdf(
  html: string,
  opts: { pageSize: string; margins: Record<string, string>; footerHtml?: string | null }
): Promise<Uint8Array> {
  const page = await (await getBrowser()).newPage();

  try {
    // Hard network gate. Even if sanitisation somehow let a URL through, the
    // page can't reach the filesystem, the internet, or the instance metadata
    // endpoint. Everything must already be inline.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("data:") || url === "about:blank") req.continue();
      else req.abort();
    });

    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20_000 });

    const pdf = await page.pdf({
      format: opts.pageSize as "a4",
      printBackground: true,
      margin: {
        top: opts.margins.top ?? "20mm",
        bottom: opts.margins.bottom ?? "18mm",
        left: opts.margins.left ?? "18mm",
        right: opts.margins.right ?? "18mm",
      },
      displayHeaderFooter: !!opts.footerHtml,
      headerTemplate: "<span></span>",
      footerTemplate: opts.footerHtml ?? "<span></span>",
    });

    return pdf;
  } finally {
    await page.close();
  }
}

export async function shutdown() {
  await browser?.close();
  browser = null;
}
