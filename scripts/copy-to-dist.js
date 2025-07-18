import fs from "fs-extra";

async function copyFiles() {
  const filesToCopy = [
    "manifest.json",
    "background.js",
    "content.js",
    "assets",
    "popup",
    "options",
    "CHANGELOG.MD",
  ];

  for (const file of filesToCopy) {
    await fs.copy(file, `dist/${file}`);
  }

  console.log("✅ dist/ folder prepared.");
}

copyFiles().catch((err) => {
  console.error("❌ Error copying files:", err);
  process.exit(1);
});
