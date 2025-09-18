import {useEffect, useState} from "react";

import {
  CARD_BASE_CLASS,
  CARD_BODY_CLASS,
  CARD_HEADER_CLASS,
} from "../constants/layout";

export function ChangelogTab() {
  const [content, setContent] = useState("Caricamento changelog...");
  const mdToHtml = (md) => {
    if (!md) return "";
    const escape = (s) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const inline = (text) => {
      const e = escape(text);
      return e
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, "$1<em>$2</em>")
        .replace(/(^|[^_])_(?!\s)(.+?)(?!\s)_(?!_)/g, "$1<em>$2</em>")
        .replace(/~~(.+?)~~/g, "<del>$1</del>")
        .replace(/`([^`]+?)`/g, "<code>$1</code>")
        .replace(
          /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
          (m, t, url, title) => {
            const tt = title ? ` title="${escape(title)}"` : "";
            return `<a href="${url}" target="_blank" rel="noopener noreferrer"${tt}>${t}</a>`;
          }
        );
    };
    const lines = md.replace(/\r\n?/g, "\n").split("\n");
    let i = 0;
    let inCode = false;
    let codeLang = "";
    let codeBuf = [];
    const out = [];
    const paraBuf = [];
    const ulStack = [];
    const olStack = [];
    const flushParagraph = (buf) => {
      const txt = buf.join("\n").trim();
      if (!txt) return;
      out.push(`<p>${inline(txt)}</p>`);
      buf.length = 0;
    };
    const closeLists = () => {
      while (ulStack.length) out.push("</ul>") && ulStack.pop();
      while (olStack.length) out.push("</ol>") && olStack.pop();
    };
    while (i < lines.length) {
      const line = lines[i];
      const fence = line.match(/^```\s*(\w+)?\s*$/);
      if (fence) {
        if (inCode) {
          out.push(
            `<pre class="overflow-auto rounded bg-gray-100 p-3 text-sm"><code class="language-${codeLang}">${escape(
              codeBuf.join("\n")
            )}</code></pre>`
          );
          codeBuf = [];
          codeLang = "";
          inCode = false;
        } else {
          flushParagraph(paraBuf);
          closeLists();
          inCode = true;
          codeLang = fence[1] || "";
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushParagraph(paraBuf);
        closeLists();
        const level = h[1].length;
        out.push(
          `<h${level} class="mt-4 mb-2 font-bold">${inline(h[2])}</h${level}>`
        );
        i++;
        continue;
      }
      const bq = line.match(/^>\s?(.*)$/);
      if (bq) {
        flushParagraph(paraBuf);
        closeLists();
        out.push(
          `<blockquote class="border-l-4 pl-3 italic text-gray-600">${inline(
            bq[1]
          )}</blockquote>`
        );
        i++;
        continue;
      }
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ul) {
        flushParagraph(paraBuf);
        if (!ulStack.length)
          out.push('<ul class="list-disc ml-6 my-2">') && ulStack.push(true);
        out.push(`<li>${inline(ul[1])}</li>`);
        i++;
        continue;
      }
      if (ol) {
        flushParagraph(paraBuf);
        if (!olStack.length)
          out.push('<ol class="list-decimal ml-6 my-2">') && olStack.push(true);
        out.push(`<li>${inline(ol[1])}</li>`);
        i++;
        continue;
      }
      if (/^\s*$/.test(line)) {
        flushParagraph(paraBuf);
        closeLists();
        i++;
        continue;
      }
      paraBuf.push(line);
      i++;
    }
    flushParagraph(paraBuf);
    closeLists();
    return out.join("\n");
  };
  useEffect(() => {
    fetch(chrome.runtime.getURL("CHANGELOG.md"))
      .then((r) => r.text())
      .then((t) => setContent(t))
      .catch(() => setContent("Errore nel caricamento del changelog."));
  }, []);
  return (
    <div id="section-changelog" className={CARD_BASE_CLASS}>
      <div className={CARD_HEADER_CLASS}>
        <h2 className="text-2xl font-bold text-gray-800">Changelog</h2>
      </div>
      <div className={`${CARD_BODY_CLASS} pr-4`}>
        <div
          id="changelog-content"
          className="text-sm text-gray-800 leading-6 h-full overflow-y-auto"
          dangerouslySetInnerHTML={{__html: mdToHtml(content)}}
        />
      </div>
    </div>
  );
}
