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
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown.min.css">
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
      header { padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.08); }
      header .title { font-weight: 600; }
      header .sub { color: rgba(0,0,0,0.6); font-size: 12px; margin-top: 4px; }
      main { padding: 16px; }
      .markdown-body { max-width: 980px; margin: 0 auto; }
      .error { color: #b42318; background: #fffbfa; border: 1px solid #fecdca; padding: 12px; border-radius: 8px; }
    </style>
  </head>
  <body>
    <header>
      <div class="title">${title}</div>
      ${subtitle ? `<div class="sub">${subtitle}</div>` : ""}
    </header>
    <main>
      <article id="content" class="markdown-body"></article>
      <noscript><div class="error">需要启用 JavaScript 才能渲染 Markdown。</div></noscript>
    </main>
    <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
    <script>
      const md = ${mdJson};
      const el = document.getElementById("content");
      function render() {
        if (!window.marked) {
          el.innerHTML = '<div class="error">无法加载 Markdown 渲染库（可能无网络）。你仍可查看原始 Markdown：请用命令 \\\"wiki reports cat\\\"。</div>';
          return;
        }
        try {
          el.innerHTML = window.marked.parse(md);
        } catch (e) {
          el.innerHTML = '<div class="error">渲染失败：' + String(e) + '</div>';
        }
      }
      render();
    </script>
  </body>
</html>`;
}
