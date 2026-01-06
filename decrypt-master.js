const fs = require("fs");
const path = require("path");
const securityManager = require("./src/utils/security-manager");

const masterDbPath = path.join(
  require("os").homedir(),
  "Documents",
  "OkulYonetimSistemi",
  "Veritabani",
  ".system.dat.sys"
);

const outputPath = path.join(
  require("os").homedir(),
  "Documents",
  "OkulYonetimSistemi",
  "Veritabani",
  "master_decrypted.db"
);

console.log("🔓 Master DB şifresi çözülüyor...");

try {
  // Şifrelenmiş dosyayı oku
  const encryptedData = fs.readFileSync(masterDbPath, "utf8");

  // Master key
  const masterKey = securityManager.generateMasterKey("Superadmin123!");

  // Şifreyi çöz
  const base64Data = securityManager.decrypt(encryptedData, masterKey);

  // Base64'ten binary'ye
  const binaryData = Buffer.from(base64Data, "base64");

  // Dosyaya kaydet
  fs.writeFileSync(outputPath, binaryData);

  console.log("✅ Şifre çözüldü!");
  console.log("📁 Dosya:", outputPath);
  console.log("\n🔍 Şimdi bu dosyayı DB Browser ile açın:");
  console.log("   1. DB Browser for SQLite'ı açın");
  console.log("   2. master_decrypted.db dosyasını açın");
  console.log("   3. okullar tablosunu kontrol edin");
} catch (error) {
  console.error("❌ Hata:", error);
}
