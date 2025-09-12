import fs from "fs-extra";
import path from "path";

async function copyFiles() {
  const filesToCopy = [
    "manifest.json",
    "background.js",
    "assets",
    "CHANGELOG.md",
  ];

  for (const file of filesToCopy) {
    await fs.copy(file, `dist/${file}`);
  }

  console.log("✅ dist/ folder prepared.");

  // Ensure popup HTML is at dist/popup/index.html (Vite output may be under dist/src/popup)
  const vitePopupHtml = path.join("dist", "src", "popup", "index.html");
  const targetPopupDir = path.join("dist", "popup");
  const targetPopupHtml = path.join(targetPopupDir, "index.html");
  if (await fs.pathExists(vitePopupHtml)) {
    await fs.ensureDir(targetPopupDir);
    await fs.move(vitePopupHtml, targetPopupHtml, { overwrite: true });
    // Clean up dist/src if empty after move
    console.log("✅ Moved Vite popup to dist/popup/index.html");
  }

  // Ensure options HTML is at dist/options/index.html
  const viteOptionsHtml = path.join("dist", "src", "options", "index.html");
  const targetOptionsDir = path.join("dist", "options");
  const targetOptionsHtml = path.join(targetOptionsDir, "index.html");
  if (await fs.pathExists(viteOptionsHtml)) {
    await fs.ensureDir(targetOptionsDir);
    await fs.move(viteOptionsHtml, targetOptionsHtml, { overwrite: true });
    console.log("✅ Moved Vite options to dist/options/index.html");
  }

  // Cleanup dist/src if exists
  const distSrcDir = path.join("dist", "src");
  if (await fs.pathExists(distSrcDir)) {
    try { await fs.remove(distSrcDir); } catch {}
  }
}

copyFiles().catch((err) => {
  console.error("❌ Error copying files:", err);
  process.exit(1);
});
