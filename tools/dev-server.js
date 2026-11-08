// Minimal local static server for previewing SpellWhiz (used by .claude/launch.json).
//   node tools/dev-server.js [port]
//
// Safety: listens on loopback only, and refuses any request that resolves outside
// the project folder or touches a dotfile/dot-folder (.git, .claude, ...).
// For testing on a phone, run a separate temporary server on purpose instead:
//   py -m http.server 8000 --bind 0.0.0.0     (exposes the folder to your network)

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2]) || 5500;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "text/plain" });
  res.end(body);
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split("?")[0]);
    } catch (e) {
      return send(res, 400, "Bad request");
    }
    if (urlPath.includes("\0")) return send(res, 400, "Bad request");

    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^[\\/]+/, "");
    const file = path.resolve(ROOT, rel);

    // Must stay inside ROOT, and no dotfile / dot-folder anywhere in the path.
    const inside = file.startsWith(ROOT + path.sep);
    const hidden = path.relative(ROOT, file).split(path.sep).some((seg) => seg.startsWith("."));
    if (!inside || hidden) return send(res, 403, "Forbidden");

    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, "Not found");
      send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
    });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`SpellWhiz dev server: http://localhost:${PORT} (loopback only)`));
