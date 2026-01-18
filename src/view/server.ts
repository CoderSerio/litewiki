import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { renderReportHtml } from "./render.js";

export async function serveReportOnce(props: {
  reportPath: string;
  title?: string;
}) {
  const reportMd = await fs.readFile(props.reportPath, "utf-8");
  const title = props.title || path.basename(props.reportPath);
  const subtitle = props.reportPath;

  const html = renderReportHtml({
    title,
    subtitle,
    reportMarkdown: reportMd,
  });

  const server = http.createServer((req, res) => {
    const url = req.url || "/";
    if (url !== "/" && url !== "/index.html") {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") {
    server.close();
    throw new Error("Failed to bind local server");
  }

  const url = `http://127.0.0.1:${addr.port}/`;

  return {
    url,
    close() {
      server.close();
    },
  };
}
