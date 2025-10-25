// tools/version-bump.js
const fs = require("fs");
const path = require("path");

const packagePath = path.join(__dirname, "..", "package.json");
const packageData = JSON.parse(fs.readFileSync(packagePath, "utf8"));

// 🔢 Mevcut sürüm -> "1.0.0" gibi
const versionParts = packageData.version.split(".").map(Number);

// 👇 Sadece son basamak otomatik artar (örn: 1.0.0 → 1.0.1)
versionParts[2]++;
packageData.version = versionParts.join(".");

fs.writeFileSync(
  packagePath,
  JSON.stringify(packageData, null, 2) + "\n",
  "utf8"
);

console.log(`✅ Yeni sürüm numarası: ${packageData.version}`);
