const fs = require("fs-extra");
const archiver = require("archiver");
const path = require("path");

const distDir = "dist";
const manifest = fs.readJsonSync("manifest.json");
const version = manifest.version || "0.0.0";
const outputZip = `package.zip`;

// Cartelle e file da includere
const include = [
  "manifest.json",
  "background.js",
  "content.js",
  "assets",
  "popup",
  "options",
];

// 1. Pulizia cartella di build
fs.removeSync(distDir);
fs.ensureDirSync(distDir);

// 2. Copia i file/cartelle nella cartella dist
include.forEach((item) => {
  fs.copySync(item, path.join(distDir, path.basename(item)));
});

// 3. Crea lo zip
const output = fs.createWriteStream("./package/" + outputZip);
const archive = archiver("zip", {zlib: {level: 9}});

output.on("close", () => {
  console.log(
    `✔ Estensione pacchettizzata: ${outputZip} (${archive.pointer()} byte)`
  );
});

archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(distDir + "/", false);
archive.finalize();
