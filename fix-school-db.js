const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function fixSchoolDB() {
  try {
    console.log("🔧 === OKUL VERİTABANI ONARMA ===");

    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    const okulDbPath = path.join(veritabaniKlasoru, "okul_974871.db");

    console.log("📂 Okul DB yolu:", okulDbPath);

    // Mevcut DB'yi oku
    let schoolDB;

    if (fs.existsSync(okulDbPath)) {
      console.log("⚠️ Mevcut okul DB bulundu, kontrol ediliyor...");

      const binaryData = fs.readFileSync(okulDbPath);
      schoolDB = new SQL.Database(binaryData);

      // Kullanıcılar tablosunu kontrol et
      try {
        const checkStmt = schoolDB.prepare(
          "SELECT COUNT(*) as count FROM kullanicilar WHERE kullanici_adi = 'admin'"
        );
        checkStmt.step();
        const result = checkStmt.getAsObject();
        checkStmt.free();

        if (result.count > 0) {
          console.log("⚠️ Admin kullanıcısı zaten var!");

          // Şifreyi güncelle
          console.log("🔄 Admin şifresi güncelleniyor...");

          const updateStmt = schoolDB.prepare(
            "UPDATE kullanicilar SET sifre = ? WHERE kullanici_adi = 'admin'"
          );
          updateStmt.run(["@7N#Dxq48D5n"]); // DÜZ ŞİFRE
          updateStmt.free();

          console.log("✅ Admin şifresi güncellendi: @7N#Dxq48D5n");
        } else {
          throw new Error("Admin kullanıcısı yok!");
        }
      } catch (err) {
        console.log("❌ Kullanıcılar tablosu bozuk:", err.message);
        console.log("🔧 Kullanıcılar tablosu yeniden oluşturuluyor...");

        // Eski tabloyu sil
        try {
          schoolDB.run("DROP TABLE IF EXISTS kullanicilar");
        } catch (e) {}

        // Yeni tablo oluştur
        schoolDB.run(`
          CREATE TABLE kullanicilar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kullanici_adi TEXT UNIQUE NOT NULL,
            sifre TEXT NOT NULL,
            ad_soyad TEXT,
            email TEXT,
            rol TEXT DEFAULT 'admin',
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            son_giris TEXT
          )
        `);

        // Admin kullanıcı ekle
        const insertStmt = schoolDB.prepare(`
          INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
          VALUES (?, ?, ?, ?)
        `);

        insertStmt.run(["admin", "@7N#Dxq48D5n", "Okul Yöneticisi", "admin"]);
        insertStmt.free();

        console.log("✅ Kullanıcılar tablosu oluşturuldu");
        console.log("✅ Admin kullanıcı eklendi: admin / @7N#Dxq48D5n");
      }
    } else {
      console.log("❌ Okul DB bulunamadı!");
      return;
    }

    // DB'yi kaydet
    console.log("\n💾 Okul DB kaydediliyor...");

    const binaryData = schoolDB.export();
    fs.writeFileSync(okulDbPath, Buffer.from(binaryData));

    console.log("✅ Okul DB kaydedildi");

    // Kontrol
    console.log("\n🔍 Kontrol ediliyor...");

    const checkStmt = schoolDB.prepare(
      "SELECT kullanici_adi, sifre FROM kullanicilar WHERE kullanici_adi = 'admin'"
    );
    checkStmt.step();
    const admin = checkStmt.getAsObject();
    checkStmt.free();

    console.log("✅ Admin Kullanıcı:");
    console.log("   • Kullanıcı Adı:", admin.kullanici_adi);
    console.log("   • Şifre:", admin.sifre);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 OKUL VERİTABANI BAŞARIYLA ONARLDI!");
    console.log("=".repeat(60));
    console.log("\n📋 GİRİŞ BİLGİLERİ:");
    console.log("   🏫 Okul Kodu: 974871");
    console.log("   👤 Kullanıcı Adı: admin");
    console.log("   🔒 Şifre: @7N#Dxq48D5n");
    console.log("\n=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error);
  }
}

fixSchoolDB();
