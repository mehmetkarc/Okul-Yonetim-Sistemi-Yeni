const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const securityManager = require("./src/utils/security-manager");

async function rebuildMasterDB() {
  try {
    console.log("🔧 === MASTER DB YENİDEN OLUŞTURMA ===");

    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    const masterDbPath = path.join(veritabaniKlasoru, ".system.dat.sys");

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

    // Superadmin ekle
    console.log("👤 Superadmin oluşturuluyor...");

    const hashedPassword = securityManager.hashPassword("Superadmin123!");

    const stmt = masterDB.prepare(`
      INSERT INTO sistem_kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([
      "superadmin",
      hashedPassword,
      "Sistem Yöneticisi",
      "super_admin",
    ]);
    stmt.free();

    console.log("✅ Superadmin oluşturuldu");

    // Mevcut okulları ekle (okul_974871.db'den al)
    console.log("\n📋 Mevcut okullar ekleniyor...");

    // Okul 1: 974871
    const okul1Stmt = masterDB.prepare(`
      INSERT INTO okullar (
        okul_kodu, okul_adi, sifre, veritabani_dosyasi,
        il, ilce, yetkili_ad, yetkili_unvan,
        lisans_baslangic, lisans_bitis, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    okul1Stmt.run([
      "974871",
      "Bahçelievler Cumhuriyet Anadolu Lisesi",
      "@7N#Dxq48D5n", // OKUL ŞİFRESİNİ GİRİN
      "okul_974871.db",
      "İstanbul",
      "Bahçelievler",
      "CÜNEYT ÇALIŞIR",
      "Okul Müdürü",
      new Date().toISOString(),
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 yıl sonra
      1,
    ]);
    okul1Stmt.free();

    console.log("✅ Okul 974871 eklendi");

    // Okul 2: 123456
    const okul2Stmt = masterDB.prepare(`
      INSERT INTO okullar (
        okul_kodu, okul_adi, sifre, veritabani_dosyasi,
        il, ilce, yetkili_ad, yetkili_unvan,
        lisans_baslangic, lisans_bitis, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    okul2Stmt.run([
      "123456",
      "Test Okulu", // OKUL ADI
      "TestSifre123!", // OKUL ŞİFRESİ
      "okul_123456.db",
      "İstanbul",
      "Test",
      "Test Yönetici",
      "Müdür",
      new Date().toISOString(),
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      1,
    ]);
    okul2Stmt.free();

    console.log("✅ Okul 123456 eklendi");

    // Kaydet
    console.log("\n💾 Master DB kaydediliyor...");

    const binaryData = masterDB.export();
    const base64Data = Buffer.from(binaryData).toString("base64");

    const masterKey = securityManager.generateMasterKey("Superadmin123!");
    const encryptedData = securityManager.encrypt(base64Data, masterKey);

    fs.writeFileSync(masterDbPath, encryptedData, "utf8");

    // Dosyayı gizle (Windows)
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        execSync(`attrib +h +s "${masterDbPath}"`);
      } catch (err) {
        console.warn("⚠️ Dosya gizlenemedi");
      }
    }

    console.log("✅ Master DB şifrelenmiş olarak kaydedildi");
    console.log("📁 Dosya:", masterDbPath);

    // Kontrol
    console.log("\n🔍 Kontrol ediliyor...");

    const checkStmt = masterDB.prepare("SELECT COUNT(*) as count FROM okullar");
    checkStmt.step();
    const count = checkStmt.getAsObject().count;
    checkStmt.free();

    console.log(`✅ ${count} okul kaydedildi`);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 MASTER DB BAŞARIYLA YENİDEN OLUŞTURULDU!");
    console.log("=".repeat(60));
    console.log("\n📋 SONRAKİ ADIMLAR:");
    console.log("1. Programı başlatın: npm start");
    console.log("2. Superadmin giriş: 000000 / superadmin / Superadmin123!");
    console.log("3. Okul Yönetimi → Okul listesini kontrol edin");
    console.log("\n=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error);
  }
}

rebuildMasterDB();
