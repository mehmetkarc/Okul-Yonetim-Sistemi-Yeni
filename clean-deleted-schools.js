const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const securityManager = require("./src/utils/security-manager");

async function cleanDeletedSchools() {
  try {
    console.log("🧹 === SİLİNMİŞ OKULLARI TEMİZLE ===");

    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    const masterDbPath = path.join(veritabaniKlasoru, ".system.dat.sys");

    console.log("📂 Master DB yolu:", masterDbPath);

    // Master DB'yi oku ve şifresini çöz
    const encryptedData = fs.readFileSync(masterDbPath, "utf8");
    const masterKey = securityManager.generateMasterKey("Superadmin123!");
    const base64Data = securityManager.decrypt(encryptedData, masterKey);
    const binaryData = Buffer.from(base64Data, "base64");

    const masterDB = new SQL.Database(binaryData);

    // Silinmiş okulları listele
    console.log("\n📋 Silinmiş okullar:");

    const listStmt = masterDB.prepare(
      "SELECT id, okul_kodu, okul_adi FROM okullar WHERE durum = 0"
    );

    let silinecekSayisi = 0;
    while (listStmt.step()) {
      const row = listStmt.getAsObject();
      console.log(`   • ${row.okul_kodu} - ${row.okul_adi}`);
      silinecekSayisi++;
    }
    listStmt.free();

    if (silinecekSayisi === 0) {
      console.log("✅ Silinmiş okul yok!");
      return;
    }

    // Kalıcı olarak sil
    console.log(`\n🗑️ ${silinecekSayisi} okul kalıcı olarak siliniyor...`);

    const deleteStmt = masterDB.prepare("DELETE FROM okullar WHERE durum = 0");
    deleteStmt.run();
    deleteStmt.free();

    console.log("✅ Silinmiş okullar temizlendi");

    // Kaydet
    console.log("\n💾 Master DB kaydediliyor...");

    const newBinaryData = masterDB.export();
    const newBase64Data = Buffer.from(newBinaryData).toString("base64");
    const newEncryptedData = securityManager.encrypt(newBase64Data, masterKey);

    // Dosya izinlerini kaldır
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        execSync(`attrib -h -s "${masterDbPath}"`, { stdio: "ignore" });
      } catch (err) {}
    }

    fs.writeFileSync(masterDbPath, newEncryptedData, "utf8");

    // Tekrar gizle
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        execSync(`attrib +h +s "${masterDbPath}"`, { stdio: "ignore" });
      } catch (err) {}
    }

    console.log("✅ Master DB kaydedildi");

    console.log("\n" + "=".repeat(60));
    console.log("🎉 TEMİZLİK TAMAMLANDI!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error);
  }
}

cleanDeletedSchools();
