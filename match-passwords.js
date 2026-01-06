const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function matchPasswords() {
  try {
    console.log("🔧 === ŞİFRE UYUMLAMA ===");

    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    const okulDbPath = path.join(veritabaniKlasoru, "okul_974871.db");

    console.log("📂 Okul DB yolu:", okulDbPath);

    // Okul DB'yi aç
    const binaryData = fs.readFileSync(okulDbPath);
    const schoolDB = new SQL.Database(binaryData);

    // Mevcut şifreyi göster
    console.log("\n🔍 Mevcut durum:");

    const checkStmt = schoolDB.prepare(
      "SELECT kullanici_adi, sifre FROM kullanicilar WHERE kullanici_adi = 'admin'"
    );
    checkStmt.step();
    const mevcut = checkStmt.getAsObject();
    checkStmt.free();

    console.log("   • Kullanıcı:", mevcut.kullanici_adi);
    console.log("   • Mevcut Şifre:", mevcut.sifre);
    console.log("   • Lisans Şifresi: @7N#Dxq48D5n");

    // Şifreyi lisansa uyarla
    console.log("\n🔄 Şifre güncelleniyor...");

    const updateStmt = schoolDB.prepare(
      "UPDATE kullanicilar SET sifre = ? WHERE kullanici_adi = 'admin'"
    );
    updateStmt.run(["@7N#Dxq48D5n"]);
    updateStmt.free();

    console.log("✅ Şifre güncellendi: @7N#Dxq48D5n");

    // Kaydet
    console.log("\n💾 Veritabanı kaydediliyor...");

    const newBinaryData = schoolDB.export();
    fs.writeFileSync(okulDbPath, Buffer.from(newBinaryData));

    console.log("✅ Veritabanı kaydedildi");

    // Doğrula
    console.log("\n🔍 Doğrulama:");

    const verifyStmt = schoolDB.prepare(
      "SELECT kullanici_adi, sifre FROM kullanicilar WHERE kullanici_adi = 'admin'"
    );
    verifyStmt.step();
    const yeni = verifyStmt.getAsObject();
    verifyStmt.free();

    console.log("   • Kullanıcı:", yeni.kullanici_adi);
    console.log("   • Yeni Şifre:", yeni.sifre);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 ŞİFRE UYUMLAMA TAMAMLANDI!");
    console.log("=".repeat(60));
    console.log("\n📋 GİRİŞ BİLGİLERİ:");
    console.log("   🏫 Okul Kodu: 974871");
    console.log("   👤 Kullanıcı: admin");
    console.log("   🔒 Şifre: @7N#Dxq48D5n");
    console.log("\n📋 SONRAKİ ADIM:");
    console.log("   npm start");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error);
  }
}

matchPasswords();
