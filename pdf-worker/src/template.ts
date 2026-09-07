import Handlebars from "handlebars";
import sanitizeHtml from "sanitize-html";

/**
 * Templates are authored by the admin, so they're semi-trusted — but document
 * titles interpolated into them come from faculty uploads, which are not.
 * Two defences:
 *
 *   1. Handlebars with escaping ON. Values interpolate through {{ }}, so a
 *      document titled `<script>…` renders as visible text, not script.
 *   2. sanitize-html over the RESULT: strips scripts, event handlers, and any
 *      src/href that isn't a data: URI. Combined with request interception in
 *      render.ts, this closes the "template loads file:///etc/passwd or the
 *      cloud metadata endpoint" hole that plain HTML-to-PDF services have.
 */

const hb = Handlebars.create();
hb.registerHelper("inc", (v: number) => Number(v) + 1);
hb.registerHelper("upper", (v: unknown) => String(v ?? "").toUpperCase());

export type ReportContext = {
  faculty: {
    full_name: string; email: string; department: string;
    designation: string; employee_code: string;
  };
  report: { generated_on: string; total_documents: number };
  categories: {
    name: string;
    documents: { title: string; uploaded_on: string; task_title: string }[];
  }[];
};

export function renderTemplate(source: string, context: ReportContext): string {
  const compiled = hb.compile(source, {
    strict: false,   // a missing token renders empty instead of throwing
    noEscape: false, // never flip this on — it is the escaping gate
  });

  return sanitizeHtml(compiled(context), {
    allowedTags: [
      "html", "head", "body", "style", "div", "section", "header", "footer",
      "h1", "h2", "h3", "h4", "p", "span", "strong", "em", "b", "i", "u", "br", "hr",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "ul", "ol", "li", "img",
    ],
    allowedAttributes: {
      "*": ["class", "style", "colspan", "rowspan", "align", "width"],
      img: ["src", "alt", "width", "height"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb/, /^[a-z]+$/],
        background: [/^#[0-9a-fA-F]{3,6}$/, /^rgb/, /^[a-z]+$/],
        "background-color": [/^#[0-9a-fA-F]{3,6}$/, /^rgb/, /^[a-z]+$/],
        "text-align": [/^(left|right|center|justify)$/],
        "font-size": [/^\d+(\.\d+)?(pt|px|em|rem|%)$/],
        "font-weight": [/^(normal|bold|\d{3})$/],
        "font-family": [/^[\w\s",-]+$/],
        margin: [/^[\d\s.a-z%-]+$/],
        padding: [/^[\d\s.a-z%-]+$/],
        border: [/^[\d\s.a-z#%-]+$/],
        "border-collapse": [/^(collapse|separate)$/],
        width: [/^\d+(\.\d+)?(pt|px|em|rem|%)$/],
        "letter-spacing": [/^[\d.a-z-]+$/],
        "text-transform": [/^(uppercase|lowercase|capitalize|none)$/],
        "page-break-before": [/^(always|auto|avoid)$/],
        "page-break-after": [/^(always|auto|avoid)$/],
      },
    },
    allowedSchemesByTag: { img: ["data"] }, // no http, no file://
    allowVulnerableTags: false,
  });
}
