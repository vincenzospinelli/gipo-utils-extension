import fs from "fs";
import path from "path";
import process from "process";

// Ottiene il tag dalla variabile d'ambiente GITHUB_REF (es. 'refs/tags/v1.2.3')
const ref = process.env.GITHUB_REF || "";
const match = ref.match(/refs\/tags\/v(\d+\.\d+\.\d+)/);

if (!match) {
  console.error(
    "❌ Nessuna versione trovata nel tag Git. Formato atteso: v1.2.3"
  );
  process.exit(1);
}

const version = match[1];
console.log(`📦 Versione trovata dal tag: ${version}`);

// Percorsi file
const root = process.cwd();
const packageJsonPath = path.join(root, "package.json");
const manifestJsonPath = path.join(root, "manifest.json");

// Aggiorna package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
pkg.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
console.log("✅ package.json aggiornato");

// Aggiorna manifest.json
const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, "utf8"));
manifest.version = version;
fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2));
console.log("✅ manifest.json aggiornato");
