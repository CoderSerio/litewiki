function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderReportHtml(props: {
  title: string;
  reportMarkdown: string;
  subtitle?: string;
}) {
  const title = escapeHtml(props.title);
  const subtitle = props.subtitle ? escapeHtml(props.subtitle) : "";
  const mdJson = JSON.stringify(props.reportMarkdown ?? "");

  //  when offline, it will prompt the user "no network to render"
  // TODO: Consider to use some framework to build a rich-interactive page 🤔
  return `<!doctype html>
<html lang="zh-CN" data-color-mode="light" data-light-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown.min.css">
    <style>
      :root {
        --c-bg: #ffffff;
        --c-bg-soft: #f8fafc;
        --c-bg-mute: #f1f5f9;
        --c-border: #e2e8f0;
        --c-text-main: #0f172a;
        --c-text-body: #334155;
        --c-text-mute: #64748b;
        --c-brand: #4f46e5;
        --c-brand-light: #e0e7ff;
        --c-brand-hover: #4338ca;
        --sidebar-width: 200px;
        --header-height: 60px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: var(--c-text-body);
        background-color: var(--c-bg);
        line-height: 1.75;
        font-size: 16px;
        -webkit-font-smoothing: antialiased;
      }
      header {
        height: var(--header-height);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        border-bottom: 1px solid var(--c-border);
        background: var(--c-bg);
        position: sticky;
        top: 0;
        z-index: 20;
      }
      header .left { display: flex; align-items: center; }
      header .title { font-weight: 700; font-size: 18px; color: var(--c-text-main); }
      header .title.title-gradient {
        background: linear-gradient(120deg, #4f46e5, #06b6d4);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        display: inline-block;
      }
      header .sub { color: var(--c-text-mute); font-size: 12px; margin-left: 12px; }
      .toggle-btn {
        background: none;
        border: 1px solid var(--c-border);
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
        color: var(--c-text-mute);
        display: flex;
        align-items: center;
        transition: all 0.2s;
      }
      .toggle-btn:hover { color: var(--c-brand); border-color: var(--c-brand); background: var(--c-bg-soft); }
      
      .layout { display: flex; min-height: calc(100vh - var(--header-height)); }
      aside.toc {
        width: var(--sidebar-width);
        background-color: var(--c-bg-soft);
        border-right: 1px solid var(--c-border);
        position: fixed;
        height: calc(100vh - var(--header-height));
        overflow-y: auto;
        padding: 24px 20px;
        top: var(--header-height);
        left: 0;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 15;
      }
      body.sidebar-collapsed aside.toc {
        transform: translateX(-100%);
      }
      .toc-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--c-text-mute);
        font-weight: 700;
        margin-bottom: 8px;
      }
      .toc-item {
        display: block;
        text-decoration: none;
        color: var(--c-text-body);
        font-size: 14px;
        padding: 6px 12px;
        border-radius: 6px;
        transition: all 0.2s ease;
      }
      .toc-item:hover { background-color: var(--c-bg-mute); color: var(--c-brand); }
      .toc-item.level-3 { padding-left: 20px; }
      
      main {
        flex: 1;
        margin-left: var(--sidebar-width);
        width: 100%;
        max-width: calc(100% - var(--sidebar-width));
        padding: 48px 80px;
        transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      body.sidebar-collapsed main {
        margin-left: 0;
        max-width: 100%;
      }
      
      .markdown-body { 
        background-color: transparent !important;
        color: var(--c-text-body);
      }
      .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--c-text-main); }
      .markdown-body pre {
        position: relative;
        background-color: #1e293b !important;
        color: #e2e8f0;
        padding: 20px;
        border-radius: 8px;
        overflow-x: auto;
        border: 1px solid #334155;
      }
      .markdown-body code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .markdown-body p code {
        background-color: var(--c-bg-mute) !important;
        color: #db2777 !important;
        padding: 0.2em 0.4em;
        border-radius: 4px;
      }
      .copy-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 11px;
        padding: 4px 8px;
        border: 1px solid rgba(226,232,240,0.2);
        background: rgba(15,23,42,0.8);
        color: #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
      }
      .copy-btn:hover { background: rgba(15,23,42,0.95); }
      .error { color: #b42318; background: #fffbfa; border: 1px solid #fecdca; padding: 12px; border-radius: 8px; }
      
      @media (max-width: 980px) {
        aside.toc {
          width: 240px;
          box-shadow: 4px 0 12px rgba(0,0,0,0.1);
        }
        main {
          margin-left: 0;
          max-width: 100%;
          padding: 24px 16px;
        }
        body:not(.sidebar-collapsed) .layout::after {
          content: "";
          position: fixed;
          top: var(--header-height);
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.3);
          z-index: 12;
        }
      }
    </style>
  </head>
  <body class="sidebar-collapsed">
    <header>
      <div class="left">
        <div class="title title-gradient">${title}</div>
        ${subtitle ? `<div class="sub">${subtitle}</div>` : ""}
      </div>
      <button class="toggle-btn" id="toggle-sidebar" title="Toggle Sidebar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </header>
    <div class="layout">
      <aside class="toc" id="toc">
        <div class="toc-title">Contents</div>
        <div id="toc-list"></div>
      </aside>
      <main>
        <article id="content" class="markdown-body"></article>
        <noscript><div class="error">需要启用 JavaScript 才能渲染 Markdown。</div></noscript>
      </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>
    <script>
      const md = ${mdJson};
      const el = document.getElementById("content");
      const toc = document.getElementById("toc");
      const tocList = document.getElementById("toc-list");
      const toggleBtn = document.getElementById("toggle-sidebar");

      toggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-collapsed");
      });

      // Close sidebar when clicking overlay on mobile
      document.querySelector(".layout").addEventListener("click", (e) => {
        if (window.innerWidth <= 980 && !document.body.classList.contains("sidebar-collapsed") && !toc.contains(e.target) && !toggleBtn.contains(e.target)) {
          document.body.classList.add("sidebar-collapsed");
        }
      });
      function slugify(text) {
        return String(text || "")
          .toLowerCase()
          .replace(/[^a-z0-9\\u4e00-\\u9fa5]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
      function buildToc() {
        const headers = el.querySelectorAll("h2, h3");
        if (!headers.length) {
          toc.style.display = "none";
          return;
        }
        const used = new Map();
        headers.forEach((h) => {
          const base = slugify(h.textContent || "section");
          const count = (used.get(base) || 0) + 1;
          used.set(base, count);
          const id = count > 1 ? base + "-" + count : base;
          h.id = id;
          const a = document.createElement("a");
          a.className = "toc-item " + (h.tagName === "H3" ? "level-3" : "level-2");
          a.href = "#" + id;
          a.textContent = h.textContent || "";
          tocList.appendChild(a);
        });
      }
      function addCopyButtons() {
        const blocks = el.querySelectorAll("pre > code");
        blocks.forEach((code) => {
          const pre = code.parentElement;
          if (!pre || pre.querySelector(".copy-btn")) return;
          const btn = document.createElement("button");
          btn.className = "copy-btn";
          btn.textContent = "Copy";
          btn.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(code.textContent || "");
              btn.textContent = "Copied";
              setTimeout(() => (btn.textContent = "Copy"), 1000);
            } catch {
              btn.textContent = "Failed";
              setTimeout(() => (btn.textContent = "Copy"), 1000);
            }
          });
          pre.appendChild(btn);
        });
      }
      function renderMermaidBlocks() {
        const blocks = el.querySelectorAll("pre > code.language-mermaid");
        blocks.forEach((code) => {
          const pre = code.parentElement;
          const div = document.createElement("div");
          div.className = "mermaid";
          div.textContent = code.textContent || "";
          if (pre) pre.replaceWith(div);
        });
        if (window.mermaid) {
          window.mermaid.initialize({ startOnLoad: false });
          window.mermaid.run({ nodes: el.querySelectorAll(".mermaid") });
        }
      }
      function render() {
        if (!window.marked) {
          el.innerHTML = '<div class="error">无法加载 Markdown 渲染库（可能无网络）。请查看原始 Markdown 文件。</div>';
          return;
        }
        try {
          el.innerHTML = window.marked.parse(md);
          buildToc();
          addCopyButtons();
          renderMermaidBlocks();
        } catch (e) {
          el.innerHTML = '<div class="error">渲染失败：' + String(e) + '</div>';
        }
      }
      render();
    </script>
  </body>
</html>`;
}
