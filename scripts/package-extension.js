import archiver from "archiver";
import fs from "fs-extra";
import path from "path";
import {fileURLToPath} from "url";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root = parent of /scripts
const rootDir = path.resolve(__dirname, "..");

// Paths
const distDir = path.join(rootDir, "dist");
const packageDir = path.join(rootDir, "package");
const manifestPath = path.join(rootDir, "manifest.json");

// Read manifest version
let version = "0.0.0";
try {
  const manifest = await fs.readJson(manifestPath);
  version = manifest.version || version;
  console.log(`ℹ Manifest version detected: ${version}`);
} catch (err) {
  console.warn(
    "⚠ Impossibile leggere manifest.json, uso versione di fallback 0.0.0:",
    err.message
  );
}

// Files / folders to include (relative to root)
const include = [
  "manifest.json",
  "background.js",
  "content.js",
  "assets",
  "popup",
  "options",
  "CHANGELOG.MD",
];

// 1. Clean & recreate dist
await fs.remove(distDir);
await fs.ensureDir(distDir);

// 2. Copy include items if they exist
for (const rel of include) {
  const src = path.join(rootDir, rel);
  if (await fs.pathExists(src)) {
    const dest = path.join(distDir, path.basename(rel));
    await fs.copy(src, dest);
    console.log(`✔ Copiato: ${rel}`);
  } else {
    console.log(`↷ Skippato (non trovato): ${rel}`);
  }
}

// 3. Ensure package dir
await fs.ensureDir(packageDir);

// 4. Create zip archive
const outputZip = "extension.zip"; // fixed name expected by workflow
const zipPath = path.join(packageDir, outputZip);
const output = fs.createWriteStream(zipPath);
const archive = archiver("zip", {zlib: {level: 9}});

const done = new Promise((resolve, reject) => {
  output.on("close", () => {
    console.log(
      `✔ Estensione pacchettizzata: ${outputZip} (${archive.pointer()} byte)`
    );
    resolve();
  });
  output.on("error", reject);
  archive.on("error", reject);
});

archive.pipe(output);
archive.directory(distDir + "/", false);
await archive.finalize();
await done;
