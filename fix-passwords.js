const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const securityManager = require("./src/utils/security-manager");

async function fixPasswords() {
  try {
    console.log("🔧 === ŞİFRE DÜZELTME BAŞLADI ===");

    const SQL = await initSqlJs();

    const masterDbPath = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani",
      ".system.dat.sys"
    );

    // Şifreli dosyayı oku
    const encryptedData = fs.readFileSync(masterDbPath, "utf8");
    const masterKey = securityManager.generateMasterKey("Superadmin123!");
    const base64Data = securityManager.decrypt(encryptedData, masterKey);
    const binaryData = Buffer.from(base64Data, "base64");

    // DB'yi yükle
    const db = new SQL.Database(binaryData);

    console.log("✅ Master DB yüklendi");

    // Şifresiz okulları bul
    const checkStmt = db.prepare(`
      SELECT id, okul_kodu, okul_adi, sifre
      FROM okullar
      WHERE sifre IS NULL OR sifre = ''
    `);

    const okullar = [];
    while (checkStmt.step()) {
      okullar.push(checkStmt.getAsObject());
    }
    checkStmt.free();

    console.log(`\n📋 ${okullar.length} okul şifre eksik`);

    if (okullar.length === 0) {
      console.log("✅ Tüm okullarda şifre mevcut!");
      return;
    }

    // Her okul için şifre oluştur ve güncelle
    okullar.forEach((okul, index) => {
      // Güçlü şifre oluştur
      const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&*";
      let password = "";

      password += "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)];
      password += "abcdefghjkmnpqrstuvwxyz"[Math.floor(Math.random() * 23)];
      password += "23456789"[Math.floor(Math.random() * 8)];
      password += "@#$%&*"[Math.floor(Math.random() * 6)];

      for (let i = 0; i < 8; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }

      password = password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");

      // Şifreyi güncelle
      const updateStmt = db.prepare(`
        UPDATE okullar 
        SET sifre = ?
        WHERE id = ?
      `);

      updateStmt.run([password, okul.id]);
      updateStmt.free();

      console.log(`\n✅ Okul #${index + 1}: ${okul.okul_adi}`);
      console.log(`   Okul Kodu: ${okul.okul_kodu}`);
      console.log(`   Yeni Şifre: ${password}`);
      console.log(`   ⚠️ BU ŞİFREYİ NOT EDİN!`);
    });

    // DB'yi kaydet
    console.log("\n💾 Veritabanı kaydediliyor...");

    const newBinaryData = db.export();
    const newBase64Data = Buffer.from(newBinaryData).toString("base64");
    const newEncryptedData = securityManager.encrypt(newBase64Data, masterKey);

    fs.writeFileSync(masterDbPath, newEncryptedData, "utf8");

    console.log("✅ Şifreler başarıyla güncellendi!");
    console.log("=".repeat(60));
    console.log("🔑 OKUL GİRİŞ BİLGİLERİ:");
    console.log("   Okul Kodu: [yukarıdaki]");
    console.log("   Kullanıcı Adı: admin");
    console.log("   Şifre: [yukarıdaki şifreler]");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error);
  }
}

fixPasswords();
