const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function rebuildMasterDB() {
  try {
    console.log("🔧 === MASTER DB YENİDEN OLUŞTURMA (BASİT) ===");

    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    // ✅ DÜZ MASTER.DB OLUŞTUR (ŞİFRELİ DEĞİL)
    const masterDbPath = path.join(veritabaniKlasoru, "master.db");

    console.log("📂 Master DB yolu:", masterDbPath);

    // Yeni boş DB oluştur
    const masterDB = new SQL.Database();

    console.log("📋 Tablolar oluşturuluyor...");

    // Okullar tablosu
    masterDB.run(`
      CREATE TABLE IF NOT EXISTS okullar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        okul_kodu TEXT UNIQUE NOT NULL,
        okul_adi TEXT NOT NULL,
        sifre TEXT NOT NULL,
        veritabani_dosyasi TEXT NOT NULL,
        il TEXT,
        ilce TEXT,
        adres TEXT,
        telefon TEXT,
        email TEXT,
        yetkili_ad TEXT,
        yetkili_unvan TEXT,
        lisans_baslangic TEXT NOT NULL,
        lisans_bitis TEXT NOT NULL,
        durum INTEGER DEFAULT 1,
        olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
        guncelleme_tarihi TEXT
      )
    `);

    // Sistem kullanıcıları
    masterDB.run(`
      CREATE TABLE IF NOT EXISTS sistem_kullanicilar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kullanici_adi TEXT UNIQUE NOT NULL,
        sifre TEXT NOT NULL,
        ad_soyad TEXT NOT NULL,
        email TEXT,
        rol TEXT DEFAULT 'super_admin',
        durum INTEGER DEFAULT 1,
        olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
        son_giris TEXT
      )
    `);

    console.log("✅ Tablolar oluşturuldu");

    // Superadmin ekle (DÜZ ŞİFRE - GEÇİCİ)
    console.log("👤 Superadmin oluşturuluyor...");

    const stmt = masterDB.prepare(`
      INSERT INTO sistem_kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
      VALUES (?, ?, ?, ?)
    `);

    // ⚠️ GEÇİCİ: Düz şifre (program başlatınca hash'lenecek)
    stmt.run([
      "superadmin",
      "TEMP_PLAIN_PASSWORD",
      "Sistem Yöneticisi",
      "super_admin",
    ]);
    stmt.free();

    console.log("✅ Superadmin oluşturuldu (geçici şifre)");

    // Mevcut okulları ekle
    console.log("\n📋 Mevcut okullar ekleniyor...");

    // Okul 1: 974871
    const okul1Stmt = masterDB.prepare(`
      INSERT INTO okullar (
        okul_kodu, okul_adi, sifre, veritabani_dosyasi,
        il, ilce, yetkili_ad, yetkili_unvan,
        lisans_baslangic, lisans_bitis, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const bugun = new Date();
    const birYilSonra = new Date(bugun);
    birYilSonra.setFullYear(birYilSonra.getFullYear() + 1);

    okul1Stmt.run([
      "974871",
      "Bahçelievler Cumhuriyet Anadolu Lisesi",
      "@7N#Dxq48D5n",
      "okul_974871.db",
      "İstanbul",
      "Bahçelievler",
      "CÜNEYT ÇALIŞIR",
      "Okul Müdürü",
      bugun.toISOString(),
      birYilSonra.toISOString(),
      1,
    ]);
    okul1Stmt.free();

    console.log("✅ Okul 974871 eklendi");

    // Okul 2: 123456 (eğer varsa)
    if (fs.existsSync(path.join(veritabaniKlasoru, "okul_123456.db"))) {
      const okul2Stmt = masterDB.prepare(`
        INSERT INTO okullar (
          okul_kodu, okul_adi, sifre, veritabani_dosyasi,
          il, ilce, yetkili_ad, yetkili_unvan,
          lisans_baslangic, lisans_bitis, durum
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      okul2Stmt.run([
        "123456",
        "Test Okulu",
        "Test123!@#",
        "okul_123456.db",
        "İstanbul",
        "Test",
        "Test Yönetici",
        "Müdür",
        bugun.toISOString(),
        birYilSonra.toISOString(),
        1,
      ]);
      okul2Stmt.free();

      console.log("✅ Okul 123456 eklendi");
    }

    // Kaydet (DÜZ DOSYA)
    console.log("\n💾 Master DB kaydediliyor (düz dosya)...");

    const binaryData = masterDB.export();
    fs.writeFileSync(masterDbPath, Buffer.from(binaryData));

    console.log("✅ Master DB kaydedildi");
    console.log("📁 Dosya:", masterDbPath);

    // Kontrol
    console.log("\n🔍 Kontrol ediliyor...");

    const checkStmt = masterDB.prepare("SELECT COUNT(*) as count FROM okullar");
    checkStmt.step();
    const count = checkStmt.getAsObject().count;
    checkStmt.free();

    console.log(`✅ ${count} okul kaydedildi`);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 MASTER DB BAŞARIYLA OLUŞTURULDU!");
    console.log("=".repeat(60));
    console.log("\n⚠️ ÖNEMLİ:");
    console.log(
      "1. Program başlatıldığında master.db → .system.dat.sys'e dönüştürülecek"
    );
    console.log("2. Superadmin şifresi ilk girişte hash'lenecek");
    console.log("\n📋 SONRAKİ ADIM:");
    console.log("   npm start");
    console.log("\n=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error);
  }
}

rebuildMasterDB();
