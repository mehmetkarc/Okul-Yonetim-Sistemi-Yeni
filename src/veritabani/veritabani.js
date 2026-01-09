/**
 * ============================================
 * VERİTABANI YÖNETİM SİSTEMİ - ULTRA ENHANCED
 * ============================================
 *
 * Türkiye'nin İlk Yapay Zeka Destekli Okul Yönetim Sistemi
 * Veritabanı Katmanı
 *
 * Özellikler:
 * - Multi-tenant okul yönetimi
 * - Otomatik migration sistemi
 * - Ders programı ve algoritma entegrasyonu
 * - Block-based scheduling desteği
 * - Solution variant management
 * - Performance tracking
 * - Comprehensive constraint system
 * - 🔐 PBKDF2 Şifre Hash Sistemi
 * - 🔒 AES-256 Master DB Şifreleme
 *
 * @author SİMRE/MK
 * @version 3.0.0
 * @date 2025
 *
 * ============================================
 */

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto"); // ✅ HASH FONKSİYONLARI İÇİN
const securityManager = require("../utils/security-manager"); // 🔐 Güvenlik modülü

// ============================================
// GLOBAL DEĞİŞKENLER (GÜVENLİK GÜNCELLENDİ)
// ============================================

let SQL;
let masterDB = null;
let activeSchoolDB = null;
let currentSchoolId = null;
let currentSchoolCode = null; // 🔒 Aktif okul kodu (güvenlik için)

// Veritabanı klasör yolları
const belgelerKlasoru = path.join(
  os.homedir(),
  "Documents",
  "OkulYonetimSistemi"
);
const veritabaniKlasoru = path.join(belgelerKlasoru, "Veritabani");
const yedekKlasoru = path.join(belgelerKlasoru, "Yedekler");

// 🔐 Master veritabanı yolu (şifrelenmiş, gizli dosya)
const masterDbPath = path.join(veritabaniKlasoru, ".system.dat.sys");

console.log("📁 Veritabanı Klasörü:", veritabaniKlasoru);
console.log("📁 Yedek Klasörü:", yedekKlasoru);
console.log("🔐 Master DB: .system.dat.sys (şifreli)");

// Klasörleri oluştur
[belgelerKlasoru, veritabaniKlasoru, yedekKlasoru].forEach((klasor) => {
  if (!fs.existsSync(klasor)) {
    fs.mkdirSync(klasor, { recursive: true });
    console.log("✅ Klasör oluşturuldu:", klasor);
  }
});

// ============================================
// VERİTABANI VERSİYON BİLGİSİ - GÜNCELLEME
// ============================================
const CURRENT_DB_VERSION = 14; // ✅ YENİ VERSİYON (arac_tipi kaldırıldı)

const DB_CHANGELOG = {
  1: "Temel tablolar (ilk versiyon)",
  2: "Öğretmenlere branş alanı eklendi",
  3: "Sınıflar tablosu kontrol ve düzeltme",
  4: "Ders programı blok desteği eklendi",
  5: "🚀 Algoritma entegrasyonu: config, variants, performance tracking",
  6: "🔥 sinif_ders_ogretmen: program_id ve haftalik_ders_saati eklendi",
  7: "🔥 blok_dersler tablosu eklendi",
  8: "🔥 program_cozumleri ve programlar tablosu",
  9: "📌 programlar tablosuna ek özellikler",
  10: "✈️ Gezi Planlama Sistemi (10 tablo) - FAZA 1+2+3 hazır",
  11: "🗓️ Öğretmen Nöbet Sistemi (7 tablo) - Haftalık/Aylık/Dönemlik",
  12: "📝 Ortak Sınav (Kelebek) Sistemi (6 tablo) - Kelebek dağıtım, gözetmen, sabitleme",
  13: "🔧 Eksik Tablolar Eklendi: Gezi ödeme, kafile, program tabloları",
  14: "🚗 gezi_araclar tablosundan arac_tipi sütunu kaldırıldı (veri korundu)", // YENİ
};

// ============================================
// SQL.JS BAŞLATMA
// ============================================

async function initDatabase() {
  try {
    SQL = await initSqlJs();
    console.log("✅ SQL.js başlatıldı");

    await loadMasterDB();
    return true;
  } catch (error) {
    console.error("❌ Veritabanı başlatma hatası:", error);
    return false;
  }
}

// ============================================
// MASTER VERİTABANI YÖNETİMİ (TAM GÜVENLİK)
// ============================================

/**
 * Master veritabanını yükle
 * ÖNCELİK SIRASI:
 * 1. .system.dat.sys (şifreli) → Varsa yükle
 * 2. master.db (düz) → Varsa şifreli formata çevir
 * 3. Hiçbiri yok → Yeni oluştur
 */
async function loadMasterDB() {
  try {
    console.log("📂 Master veritabanı yükleniyor...");

    const encryptedDbPath = path.join(veritabaniKlasoru, ".system.dat.sys");
    const oldDbPath = path.join(veritabaniKlasoru, "master.db");

    // ============================================
    // 1️⃣ ŞİFRELİ DOSYA VAR MI? (ÖNCELİK 1)
    // ============================================
    if (fs.existsSync(encryptedDbPath)) {
      console.log("🔓 Şifreli master DB çözülüyor...");

      try {
        const encryptedData = fs.readFileSync(encryptedDbPath, "utf8");
        const masterKey = securityManager.generateMasterKey("Superadmin123!");
        const base64Data = securityManager.decrypt(encryptedData, masterKey);
        const binaryData = Buffer.from(base64Data, "base64");

        masterDB = new SQL.Database(binaryData);
        console.log("✅ Master DB başarıyla yüklendi (şifreli)");

        // ✅ ESKİ DOSYA VARSA SİL (TEMİZLİK)
        if (fs.existsSync(oldDbPath)) {
          try {
            fs.unlinkSync(oldDbPath);
            console.log("🗑️ Eski master.db temizlendi");
          } catch (err) {
            console.warn("⚠️ Eski dosya silinemedi:", err.message);
          }
        }

        return;
      } catch (decryptError) {
        console.error("❌ Şifre çözme hatası:", decryptError);
        console.error("⚠️ Şifreli dosya bozuk, yedekten geri yükleniyor...");

        // Bozuk dosyayı yedekle
        const backupPath = encryptedDbPath + ".corrupted." + Date.now();
        fs.renameSync(encryptedDbPath, backupPath);
        console.log("📦 Bozuk dosya yedeklendi:", backupPath);

        // Eski dosya varsa onunla devam et
        if (!fs.existsSync(oldDbPath)) {
          throw new Error(
            "Şifreli dosya bozuk ve yedek bulunamadı! Lütfen veritabanını geri yükleyin."
          );
        }
        // Aşağıdaki 2. adıma düşecek
      }
    }

    // ============================================
    // 2️⃣ ESKİ DÜZ DOSYA VAR MI? (ÖNCELİK 2)
    // ============================================
    if (fs.existsSync(oldDbPath)) {
      console.log("🔄 Eski master.db bulundu, şifreli formata çevriliyor...");

      try {
        const binaryData = fs.readFileSync(oldDbPath);
        masterDB = new SQL.Database(binaryData);

        console.log("✅ Eski master.db yüklendi");

        // Şifreli olarak kaydet
        saveMasterDB();

        console.log("✅ Şifreli master DB oluşturuldu (.system.dat.sys)");

        // Eski dosyayı sil
        fs.unlinkSync(oldDbPath);
        console.log("🗑️ Eski master.db silindi");

        console.log("🎉 master.db → .system.dat.sys dönüşümü tamamlandı!");
        return;
      } catch (conversionError) {
        console.error("❌ Dönüşüm hatası:", conversionError);
        throw conversionError;
      }
    }

    // ============================================
    // 3️⃣ HİÇBİRİ YOK - YENİ OLUŞTUR (ÖNCELİK 3)
    // ============================================
    console.log("⚠️ Master DB bulunamadı, yeni oluşturuluyor...");

    masterDB = new SQL.Database();
    createMasterTables();
    createSuperAdmin();
    saveMasterDB();

    console.log("✅ Yeni Master DB oluşturuldu ve kaydedildi (şifreli)");
  } catch (error) {
    console.error("❌ Master DB yükleme hatası:", error);
    throw error;
  }
}

/**
 * Master tablolarını oluştur
 */
function createMasterTables() {
  console.log("📋 Master tablolar oluşturuluyor...");

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

  console.log("✅ Master tablolar oluşturuldu");
}

/**
 * Superadmin kullanıcısı oluştur
 */
function createSuperAdmin() {
  console.log("👤 Super admin oluşturuluyor...");

  // 🔐 ŞİFREYİ HASH'LE
  const hashedPassword = securityManager.hashPassword("Superadmin123!");

  const stmt = masterDB.prepare(`
    INSERT INTO sistem_kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(["superadmin", hashedPassword, "Sistem Yöneticisi", "super_admin"]);
  stmt.free();

  console.log("✅ Super admin oluşturuldu");
  console.log("🔑 Kullanıcı Adı: superadmin");
  console.log("🔒 İlk Şifre: Superadmin123!");
}

/**
 * Master DB'yi kaydet (şifreleyerek)
 */
function saveMasterDB() {
  try {
    console.log("💾 Master DB kaydediliyor...");

    const encryptedDbPath = path.join(veritabaniKlasoru, ".system.dat.sys");

    // ✅ ÖNCE DOSYA İZİNLERİNİ KALDIR
    if (fs.existsSync(encryptedDbPath)) {
      try {
        if (process.platform === "win32") {
          const { execSync } = require("child_process");
          execSync(`attrib -h -s "${encryptedDbPath}"`, { stdio: "ignore" });
          console.log("🔓 Dosya izinleri kaldırıldı");
        }
      } catch (err) {
        console.warn("⚠️ İzin kaldırma hatası:", err.message);
      }
    }

    // Veritabanını export et
    const binaryData = masterDB.export();
    const base64Data = Buffer.from(binaryData).toString("base64");

    // Master key ile şifrele
    const masterKey = securityManager.generateMasterKey("Superadmin123!");
    const encryptedData = securityManager.encrypt(base64Data, masterKey);

    // Dosyaya yaz
    fs.writeFileSync(encryptedDbPath, encryptedData, "utf8");

    // ✅ SONRA TEKRAR GİZLE
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        execSync(`attrib +h +s "${encryptedDbPath}"`, { stdio: "ignore" });
        console.log("🔒 Dosya tekrar gizlendi");
      } catch (err) {
        console.warn("⚠️ Gizleme hatası:", err.message);
      }
    }

    console.log("✅ Master DB başarıyla kaydedildi");
  } catch (error) {
    console.error("❌ Master DB kayıt hatası:", error);
    throw error;
  }
}

/**
 * 🛠️ OKULU MASTER DB'YE ZORLA KAYDET (TAMİR MODU + DERİN DEBUG)
 */
async function repairSchoolRecord(license) {
  try {
    console.log("--- [DEBUG: REPAIR BAŞLADI] ---");
    console.log("📍 İşlenen Okul Kodu:", license.okul_kodu);
    console.log(
      "🔑 Lisanstaki Şifre/Hash:",
      license.sifre ? "MEVCUT" : "EKSİK!"
    );

    // Geçerli tarihleri hazırla
    const baslangic = new Date().toISOString();
    const bitis = new Date(license.gecerlilik || new Date()).toISOString();
    const dbFileName = `okul_${license.okul_kodu}.db`;

    console.log(`📂 DB Dosya Adı: ${dbFileName}`);

    // Master DB içinde okulu güncelle veya yeniden oluştur
    const stmt = masterDB.prepare(`
      INSERT OR REPLACE INTO okullar (
        okul_kodu, okul_adi, sifre, veritabani_dosyasi,
        lisans_baslangic, lisans_bitis, durum
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run([
      String(license.okul_kodu),
      license.okul_adi,
      license.sifre, // Lisanstaki mevcut hashli şifre
      dbFileName,
      baslangic,
      bitis,
    ]);
    stmt.free();

    // Kaydet ve doğrula
    saveMasterDB();

    // Doğrulama logu
    const checkRow = masterDB
      .prepare("SELECT * FROM okullar WHERE okul_kodu = ?")
      .get(String(license.okul_kodu));
    console.log(
      "📊 Master DB Son Kayıt Durumu:",
      checkRow ? "BAŞARILI" : "KAYIT BAŞARISIZ!"
    );
    console.log("--- [DEBUG: REPAIR TAMAMLANDI] ---");

    return true;
  } catch (error) {
    console.error("❌ [REPAIR KRİTİK HATA]:", error);
    return false;
  }
}

// ============================================
// OKUL VERİTABANI TABLO OLUŞTURMA
// ============================================

function createSchoolTables(db) {
  console.log("📋 Okul tabloları oluşturuluyor...");

  // ==========================================
  // TEMEL TABLOLAR
  // ==========================================

  // Kullanıcılar
  db.run(`
    CREATE TABLE IF NOT EXISTS kullanicilar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_adi TEXT UNIQUE NOT NULL,
      sifre TEXT NOT NULL,
      ad_soyad TEXT NOT NULL,
      tc_no TEXT UNIQUE,
      email TEXT,
      telefon TEXT,
      rol TEXT NOT NULL,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      son_giris TEXT
    )
  `);

  // Öğretmenler
  db.run(`
    CREATE TABLE IF NOT EXISTS ogretmenler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id INTEGER UNIQUE,
      tc_no TEXT UNIQUE NOT NULL,
      ad_soyad TEXT NOT NULL,
      kisa_ad TEXT,
      brans TEXT,
      cinsiyet TEXT,
      dogum_tarihi TEXT,
      dogum_yeri TEXT,
      baba_adi TEXT,
      unvan TEXT,
      kariyer TEXT,
      gorev TEXT,
      durum INTEGER DEFAULT 1,
      gorev_yeri TEXT,
      goreve_baslama TEXT,
      kurumda_baslama TEXT,
      ogrenim_durumu TEXT,
      mezun_universite TEXT,
      derece INTEGER,
      kademe INTEGER,
      emekli_sicil_no TEXT,
      kbs_personel_no TEXT,
      iban TEXT,
      banka_subesi TEXT,
      yabanci_dil_tazminati TEXT,
      ek_gosterge TEXT,
      aile_durumu TEXT,
      cocuk_0_6 INTEGER DEFAULT 0,
      cocuk_6_ustu INTEGER DEFAULT 0,
      bes TEXT,
      telefon TEXT,
      email TEXT,
      adres TEXT,
      ayrilma_tarihi TEXT,
      ayrilis_nedeni TEXT,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT,
      FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
    )
  `);

  // Sınıflar
  db.run(`
    CREATE TABLE IF NOT EXISTS siniflar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinif_adi TEXT NOT NULL,
      sinif_duzey INTEGER NOT NULL,
      sube TEXT NOT NULL,
      alan TEXT,
      sinif_ogretmeni_id INTEGER,
      mudur_yardimcisi_id INTEGER,
      rehber_ogretmen_id INTEGER,
      ogrenci_sayisi INTEGER DEFAULT 0,
      erkek_sayisi INTEGER DEFAULT 0,
      kiz_sayisi INTEGER DEFAULT 0,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT,
      FOREIGN KEY (sinif_ogretmeni_id) REFERENCES ogretmenler(id),
      FOREIGN KEY (mudur_yardimcisi_id) REFERENCES ogretmenler(id),
      FOREIGN KEY (rehber_ogretmen_id) REFERENCES ogretmenler(id),
      UNIQUE(sinif_duzey, sube)
    )
  `);

  // Öğrenciler
  db.run(`
    CREATE TABLE IF NOT EXISTS ogrenciler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tc_no TEXT UNIQUE,
      ad TEXT NOT NULL,
      soyad TEXT NOT NULL,
      okul_no TEXT UNIQUE NOT NULL,
      ad_soyad TEXT NOT NULL,
      sinif TEXT,
      cinsiyet TEXT,
      alan TEXT,
      dal TEXT,
      durum INTEGER DEFAULT 1,
      dogum_yeri TEXT,
      dogum_tarihi TEXT,
      fotograf_path TEXT,
      anne_ad_soyad TEXT,
      anne_telefon TEXT,
      baba_ad_soyad TEXT,
      baba_telefon TEXT,
      kayit_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Dersler
  db.run(`
    CREATE TABLE IF NOT EXISTS dersler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ders_adi TEXT NOT NULL,
      ders_kodu TEXT UNIQUE NOT NULL,
      sinif_seviyeleri TEXT,
      alan TEXT,
      brans TEXT NOT NULL,
      ders_turu TEXT NOT NULL DEFAULT 'Ortak',
      secmeli_grup TEXT,
      haftalik_saat INTEGER NOT NULL,
      ders_blogu TEXT NOT NULL,
      ders_rengi TEXT,
      notlar TEXT,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT
    )
  `);

  // Ders-Öğretmen İlişkisi
  db.run(`
    CREATE TABLE IF NOT EXISTS ders_ogretmen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ders_id INTEGER NOT NULL,
      ogretmen_id INTEGER NOT NULL,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ders_id) REFERENCES dersler(id) ON DELETE CASCADE,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
      UNIQUE(ders_id, ogretmen_id)
    )
  `);

  // ✅ SINİF-DERS-ÖĞRETMEN TABLOSU (EKLENDİ!)
  db.run(`
    CREATE TABLE IF NOT EXISTS sinif_ders_ogretmen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinif_id INTEGER NOT NULL,
      ders_id INTEGER NOT NULL,
      ogretmen_id INTEGER,
      haftalik_ders_saati INTEGER DEFAULT 0,
      program_id INTEGER,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE,
      FOREIGN KEY (ders_id) REFERENCES dersler(id) ON DELETE CASCADE,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE SET NULL,
      UNIQUE(sinif_id, ders_id)
    )
  `);

  // Blok Dersler
  db.run(`
    CREATE TABLE IF NOT EXISTS blok_dersler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      sinif_id INTEGER NOT NULL,
      ders_id INTEGER NOT NULL,
      ogretmen_id INTEGER NOT NULL,
      blok_yapisi TEXT NOT NULL,
      blok_sayisi INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE,
      FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE,
      FOREIGN KEY (ders_id) REFERENCES dersler(id) ON DELETE CASCADE,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
      UNIQUE(program_id, sinif_id, ders_id, ogretmen_id)
    )
  `);

  console.log("✅ Temel tablolar oluşturuldu");

  // ==========================================
  // DERS PROGRAMI TABLOLARI
  // ==========================================

  // Programlar Tablosu (ANA TABLO - YENİ)
  db.run(`
    CREATE TABLE IF NOT EXISTS programlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL,
      yil INTEGER NOT NULL,
      donem INTEGER NOT NULL,
      sinif_id INTEGER NOT NULL,
      program_turu TEXT DEFAULT 'normal',
      donem_tipi TEXT DEFAULT 'guz',
      kilitli INTEGER DEFAULT 0,
      aciklama TEXT,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE
    )
  `);

  // Program Çözümleri
  db.run(`
    CREATE TABLE IF NOT EXISTS program_cozumleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      cozum_adi TEXT NOT NULL,
      cozum_data TEXT NOT NULL,
      metadata TEXT,
      aktif INTEGER DEFAULT 0,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES programlar(id) ON DELETE CASCADE
    )
  `);

  // Ana Ders Programları
  db.run(`
    CREATE TABLE IF NOT EXISTS ders_programlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinif_id INTEGER NOT NULL,
      program_adi TEXT NOT NULL,
      donem TEXT NOT NULL,
      akademik_yil TEXT NOT NULL,
      hafta_gunu INTEGER NOT NULL DEFAULT 5,
      gunluk_ders_sayisi INTEGER NOT NULL DEFAULT 8,
      ders_suresi INTEGER NOT NULL DEFAULT 40,
      teneffus_suresi INTEGER NOT NULL DEFAULT 10,
      baslangic_saati TEXT NOT NULL DEFAULT '08:00',
      ogle_arasi_var INTEGER DEFAULT 0,
      ogle_arasi_ders_sonrasi INTEGER DEFAULT 4,
      ogle_arasi_suresi INTEGER DEFAULT 60,
      durum INTEGER DEFAULT 1,
      olusturan_kullanici_id INTEGER,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT,
      silme_tarihi TEXT,
      notlar TEXT,
      FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE,
      FOREIGN KEY (olusturan_kullanici_id) REFERENCES kullanicilar(id)
    )
  `);

  // Program Detayları (Hücreler) - BLOK DESTEĞİ İLE
  db.run(`
    CREATE TABLE IF NOT EXISTS program_detaylar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      gun INTEGER NOT NULL,
      saat INTEGER NOT NULL,
      ders_id INTEGER,
      ogretmen_id INTEGER,
      blok_id TEXT,
      blok_index INTEGER DEFAULT 0,
      blok_buyukluk INTEGER DEFAULT 1,
      renk TEXT,
      notlar TEXT,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE,
      FOREIGN KEY (ders_id) REFERENCES dersler(id) ON DELETE SET NULL,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE SET NULL,
      UNIQUE(program_id, gun, saat)
    )
  `);

  console.log("✅ Ders programı tabloları (BLOK DESTEĞİYLE) oluşturuldu");

  // ==========================================
  // 🚀 ALGORİTMA ENTEGRASYON TABLOLARI
  // ==========================================

  // Algorithm Configuration
  db.run(`
    CREATE TABLE IF NOT EXISTS algorithm_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      config_json TEXT NOT NULL,
      config_name TEXT DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE
    )
  `);

  // Solution Variants (Farklı çözüm varyantları)
  db.run(`
    CREATE TABLE IF NOT EXISTS solution_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      variant_name TEXT NOT NULL,
      solution_json TEXT NOT NULL,
      score REAL,
      metadata_json TEXT,
      is_best INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE
    )
  `);

  // Performance Metrics
  db.run(`
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      session_name TEXT,
      total_time INTEGER,
      iterations INTEGER,
      score REAL,
      success INTEGER DEFAULT 1,
      metrics_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE
    )
  `);

  console.log("✅ 🚀 Algoritma entegrasyon tabloları oluşturuldu");

  // ==========================================
  // KISITLAR VE TERCİHLER
  // ==========================================

  // Kısıtlar
  db.run(`
    CREATE TABLE IF NOT EXISTS kisitlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER,
      kisit_turu TEXT NOT NULL,
      ogretmen_id INTEGER,
      min_gunluk_ders INTEGER DEFAULT 2,
      max_gunluk_ders INTEGER DEFAULT 8,
      max_bos_pencere INTEGER DEFAULT 2,
      ayni_gun_ayni_sinif INTEGER DEFAULT 0,
      blok_farkli_gun INTEGER DEFAULT 1,
      tek_saat_yasak INTEGER DEFAULT 1,
      tum_ogretmenlere_uygula INTEGER DEFAULT 0,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE
    )
  `);

  // Öğretmen Tercihleri
  db.run(`
    CREATE TABLE IF NOT EXISTS ogretmen_tercihleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ogretmen_id INTEGER NOT NULL,
      program_id INTEGER,
      bos_gun INTEGER,
      kapali_saatler TEXT,
      tercih_notlari TEXT,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE,
      UNIQUE(ogretmen_id, program_id)
    )
  `);

  // Kısıt Uyarıları
  db.run(`
    CREATE TABLE IF NOT EXISTS kisit_uyarilari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER,
      uyari_tipi TEXT NOT NULL,
      gun INTEGER,
      saat INTEGER,
      ogretmen_id INTEGER,
      ogretmen_sayisi INTEGER,
      aciklama TEXT,
      cozum_onerisi TEXT,
      oncelik TEXT DEFAULT 'orta',
      durum TEXT DEFAULT 'aktif',
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      cozum_tarihi TEXT,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE SET NULL
    )
  `);

  // Çakışma Geçmişi
  db.run(`
    CREATE TABLE IF NOT EXISTS cakisma_gecmisi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      ogretmen_id INTEGER NOT NULL,
      gun INTEGER NOT NULL,
      saat INTEGER NOT NULL,
      cakisan_program_id INTEGER NOT NULL,
      cakisan_gun INTEGER NOT NULL,
      cakisan_saat INTEGER NOT NULL,
      tespit_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      cozuldu INTEGER DEFAULT 0,
      cozum_tarihi TEXT,
      FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE
    )
  `);

  console.log("✅ Kısıtlar ve tercihler tabloları oluşturuldu");

  // ==========================================
  // ✈️ GEZİ PLANLAMA TABLOLARI (KOMPLE GÜNCEL + ARAÇ_TİPİ TAMAMEN KALDIRILDI)
  // ==========================================

  // Ana Geziler Tablosu
  db.run(`
  CREATE TABLE IF NOT EXISTS geziler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    okul_id INTEGER NOT NULL,
    gezi_adi TEXT NOT NULL,
    duzenlenen_yer TEXT NOT NULL,
    guzergah TEXT NOT NULL,
    gezi_tarihi TEXT NOT NULL,
    cikis_saati TEXT NOT NULL,
    donus_tarihi TEXT NOT NULL,
    donus_saati TEXT NOT NULL,
    gezi_konusu TEXT NOT NULL,
    gezi_amaci TEXT NOT NULL,
    arastirma_gorevi TEXT,
    degerlendirme TEXT,
    gezi_turu TEXT NOT NULL CHECK(gezi_turu IN ('ilce_ici', 'il_ici', 'il_disi', 'yurt_disi')),
    kafile_baskani_id INTEGER NOT NULL,
    durum TEXT DEFAULT 'planlanan' CHECK(durum IN ('planlanan', 'aktif', 'tamamlanan', 'iptal')),
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TEXT,
    FOREIGN KEY (kafile_baskani_id) REFERENCES ogretmenler(id)
  )
`);

  // Gezi Öğrencileri
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_ogrenciler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    ogrenci_id INTEGER NOT NULL,
    katilim_durumu TEXT DEFAULT 'onaylandi',
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id) ON DELETE CASCADE,
    UNIQUE(gezi_id, ogrenci_id)
  )
`);

  // Gezi Öğretmenleri
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_ogretmenler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    ogretmen_id INTEGER NOT NULL,
    gorev TEXT DEFAULT 'Sorumlu Öğretmen',
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE,
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
    UNIQUE(gezi_id, ogretmen_id)
  )
`);

  // Gezi Misafirleri
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_misafirler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    ad_soyad TEXT NOT NULL,
    tc_no TEXT NOT NULL,
    cinsiyet TEXT NOT NULL,
    telefon TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
  )
`);

  // Gezi Araçları (arac_tipi SÜTUNU TAMAMEN KALDIRILDI - Modalda alan yoktu)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_araclar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    plaka TEXT,
    sofor_adi TEXT,
    sofor_telefon TEXT,
    kapasite INTEGER,
    ucret REAL,
    arac_modeli TEXT,
    trafige_cikis_tarihi TEXT,
    son_muayene_tarihi TEXT,
    mali_sorumluluk_police_no TEXT,
    mali_sorumluluk_bitis_tarihi TEXT,
    ferdi_kaza_police_no TEXT,
    ferdi_kaza_bitis_tarihi TEXT,
    arac_ozellikleri TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
  )
`);

  // === YENİ: Araç Şoförleri ===
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_arac_soforler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arac_id INTEGER NOT NULL,
    tc_no TEXT NOT NULL,
    ad_soyad TEXT NOT NULL,
    telefon TEXT,
    src_belge_no TEXT,
    src_belge_tarihi TEXT,
    sofor_tipi TEXT NOT NULL CHECK(sofor_tipi IN ('ana_sofor', 'ikinci_sofor')),
    FOREIGN KEY (arac_id) REFERENCES gezi_araclar(id) ON DELETE CASCADE
  )
`);

  // === YENİ: Araç Belgeleri ===
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_arac_belgeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arac_id INTEGER NOT NULL,
    belge_tipi TEXT,
    belge_adi TEXT NOT NULL,
    dosya_yolu TEXT NOT NULL,
    dosya_uzantisi TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (arac_id) REFERENCES gezi_araclar(id) ON DELETE CASCADE
  )
`);

  // Gezi Ödemeleri (Tamamen Yeniden Tanımlanmış - Taksit Bazlı Sistem İçin)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_odemeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    katilimci_ucret_id INTEGER NOT NULL,
    taksit_no INTEGER NOT NULL,
    taksit_tutari REAL NOT NULL,
    vade_tarihi TEXT NOT NULL,
    odeme_durumu TEXT DEFAULT 'bekliyor' CHECK(odeme_durumu IN ('bekliyor', 'odendi', 'gecikti')),
    odeme_tarihi TEXT,
    odeme_sekli TEXT,
    makbuz_no TEXT,
    notlar TEXT,
    FOREIGN KEY (katilimci_ucret_id) REFERENCES gezi_katilimci_ucretler(id) ON DELETE CASCADE
  )
`);

  // Gezi Pasaportlar (Genişletilmiş)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_pasaportlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    katilimci_tipi TEXT NOT NULL CHECK(katilimci_tipi IN ('ogrenci', 'ogretmen', 'misafir', 'kafile_baskani')),
    katilimci_id INTEGER NOT NULL,
    ad_soyad TEXT NOT NULL,
    tc_kimlik TEXT,
    pasaport_seri TEXT,
    pasaport_no TEXT NOT NULL,
    pasaport_turu TEXT CHECK(pasaport_turu IN ('bordo', 'gri', 'yesil')),
    son_gecerlilik_tarihi TEXT,
    cift_vatandaslik INTEGER DEFAULT 0,
    ikinci_pasaport_seri TEXT,
    ikinci_pasaport_no TEXT,
    ikinci_pasaport_turu TEXT,
    ikinci_gecerlilik_tarihi TEXT,
    vize_durumu TEXT DEFAULT 'bekliyor' CHECK(vize_durumu IN ('bekliyor', 'basvuruldu', 'alindi', 'reddedildi')),
    vize_tarihi TEXT,
    vize_notlar TEXT,
    notlar TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
  )
`);

  // Gezi Ulaşım (Genişletilmiş - Uçuş Bilgileri İçin)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_ulasim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    ulasim_tipi TEXT NOT NULL CHECK(ulasim_tipi IN ('ucak', 'gemi', 'otobus', 'tren')),
    firma_adi TEXT,
    sefer_no TEXT,
    pnr_kodu TEXT,
    kalkis_yeri TEXT,
    varis_yeri TEXT,
    kalkis_tarihi TEXT,
    kalkis_saati TEXT,
    varis_tarihi TEXT,
    varis_saati TEXT,
    aktarma_var INTEGER DEFAULT 0,
    aktarma_bilgisi TEXT,
    ucret REAL,
    notlar TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
  )
`);

  // Gezi Konaklama (Genişletilmiş)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_konaklama (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    otel_adi TEXT NOT NULL,
    otel_adresi TEXT,
    otel_telefon TEXT,
    otel_email TEXT,
    giris_tarihi TEXT NOT NULL,
    cikis_tarihi TEXT NOT NULL,
    notlar TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
  )
`);

  // === YENİ: Konaklama Odaları ===
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_konaklama_odalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    konaklama_id INTEGER NOT NULL,
    oda_no TEXT NOT NULL,
    oda_tipi TEXT NOT NULL CHECK(oda_tipi IN ('tek', 'cift', 'uc', 'dort')),
    kapasite INTEGER NOT NULL,
    FOREIGN KEY (konaklama_id) REFERENCES gezi_konaklama(id) ON DELETE CASCADE,
    UNIQUE(konaklama_id, oda_no)
  )
`);

  // === YENİ: Konaklama Yerleşim ===
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_konaklama_yerlesim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oda_id INTEGER NOT NULL,
    kisi_tipi TEXT NOT NULL CHECK(kisi_tipi IN ('ogrenci', 'ogretmen', 'misafir', 'kafile_baskani')),
    kisi_id INTEGER NOT NULL,
    tc_no TEXT,
    ad_soyad TEXT NOT NULL,
    dogum_tarihi TEXT,
    FOREIGN KEY (oda_id) REFERENCES gezi_konaklama_odalar(id) ON DELETE CASCADE
  )
`);

  // Gezi Tur Firması (Mevcut - Değişiklik Yok)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_tur_firma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    firma_adi TEXT NOT NULL,
    yetkili_ad_soyad TEXT,
    yetkili_unvan TEXT,
    yetkili_telefon TEXT,
    firma_telefon TEXT,
    firma_adres TEXT,
    firma_email TEXT,
    vergi_dairesi TEXT,
    vergi_no TEXT,
    tursab_no TEXT,
    isletme_belge_no TEXT,
    yetki_belgesi TEXT,
    rehber_ad TEXT,
    rehber_kokart TEXT,
    sozlesme_tarihi TEXT,
    toplam_bedel REAL,
    para_birimi TEXT DEFAULT 'TRY',
    dahil_hizmetler TEXT,
    dahil_olmayan TEXT,
    iptal_kosul TEXT,
    notlar TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
  )
`);

  // Gezi Katılımcı Ücretleri (Mevcut - Değişiklik Yok)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_katilimci_ucretler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    kisi_tipi TEXT NOT NULL CHECK(kisi_tipi IN ('kafile_baskani', 'ogretmen', 'ogrenci', 'misafir')),
    kisi_id INTEGER NOT NULL,
    ad_soyad TEXT NOT NULL,
    ucret_durumu TEXT DEFAULT 'normal' CHECK(ucret_durumu IN ('normal', 'ucretsiz', 'indirimli')),
    ozel_ucret REAL,
    taksit_sayisi INTEGER,
    toplam_ucret REAL DEFAULT 0,
    toplam_odenen REAL DEFAULT 0,
    kalan_borc REAL DEFAULT 0,
    aciklama TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE,
    UNIQUE(gezi_id, kisi_tipi, kisi_id)
  )
`);

  // Gezi Kafile Başkanları (Mevcut - Değişiklik Yok)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_kafile_baskanlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL,
    ogretmen_id INTEGER NOT NULL,
    gorev TEXT DEFAULT 'Kafile Başkanı',
    eklenme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE,
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
    UNIQUE(gezi_id, ogretmen_id)
  )
`);

  // Gezi Ödeme Planı (Mevcut - Değişiklik Yok)
  db.run(`
  CREATE TABLE IF NOT EXISTS gezi_odeme_plani (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gezi_id INTEGER NOT NULL UNIQUE,
    kisi_basi_ucret REAL NOT NULL,
    para_birimi TEXT DEFAULT 'TL',
    taksit_sayisi INTEGER DEFAULT 1,
    pesinat_orani REAL DEFAULT 0,
    odeme_baslangic TEXT,
    taksit_araligi INTEGER DEFAULT 30,
    hatirlatma_gun INTEGER DEFAULT 7,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
  )
`);

  console.log(
    "✅ Gezi planlama tabloları oluşturuldu (Tüm eksik tablolar ve sütunlar eklendi - Toplam 18 tablo)"
  );

  // ==========================================
  // NÖBET SİSTEMİ TABLOLARI
  // ==========================================

  // Nöbet Yerleri
  db.run(`
    CREATE TABLE IF NOT EXISTS nobet_yerleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      yer_adi TEXT NOT NULL,
      aciklama TEXT,
      sira INTEGER DEFAULT 0,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Nöbet Programları
  db.run(`
    CREATE TABLE IF NOT EXISTS nobet_programlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_adi TEXT NOT NULL,
      baslangic_tarihi TEXT NOT NULL,
      bitis_tarihi TEXT NOT NULL,
      program_tipi TEXT DEFAULT 'haftalik' CHECK(program_tipi IN ('haftalik', 'aylik', 'donemlik')),
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT
    )
  `);

  // Nöbet Atamaları
  db.run(`
    CREATE TABLE IF NOT EXISTS nobet_atamalari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      ogretmen_id INTEGER NOT NULL,
      yer_id INTEGER NOT NULL,
      gun TEXT NOT NULL,
      tarih TEXT NOT NULL,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES nobet_programlari(id) ON DELETE CASCADE,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
      FOREIGN KEY (yer_id) REFERENCES nobet_yerleri(id) ON DELETE CASCADE,
      UNIQUE(program_id, ogretmen_id, tarih)
    )
  `);

  // Nöbetçi Müdür Yardımcısı
  db.run(`
    CREATE TABLE IF NOT EXISTS nobet_mudur_yardimcisi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      mudur_yardimcisi_adi TEXT NOT NULL,
      gun TEXT NOT NULL,
      tarih TEXT NOT NULL,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES nobet_programlari(id) ON DELETE CASCADE,
      UNIQUE(program_id, tarih)
    )
  `);

  // Pasif Öğretmenler
  db.run(`
    CREATE TABLE IF NOT EXISTS nobet_pasif_ogretmenler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ogretmen_id INTEGER NOT NULL,
      neden TEXT NOT NULL,
      aciklama TEXT,
      baslangic_tarihi TEXT NOT NULL,
      bitis_tarihi TEXT,
      durum INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE
    )
  `);

  // Öğretmen Nöbet Tercihleri
  db.run(`
    CREATE TABLE IF NOT EXISTS ogretmen_nobet_tercihleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ogretmen_id INTEGER NOT NULL,
      gun TEXT NOT NULL,
      haftalik_min INTEGER DEFAULT 0,
      haftalik_max INTEGER DEFAULT 5,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      guncelleme_tarihi TEXT,
      FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
      UNIQUE(ogretmen_id, gun)
    )
  `);

  // Nöbet Açıklamaları
  db.run(`
    CREATE TABLE IF NOT EXISTS nobet_aciklamalari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      aciklama TEXT NOT NULL,
      sira INTEGER DEFAULT 0,
      olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES nobet_programlari(id) ON DELETE CASCADE
    )
  `);

  console.log("✅ Nöbet sistemi tabloları oluşturuldu");

  // ==========================================
  // ORTAK SINAV (KELEBEK) SİSTEMİ TABLOLARI (GÜNCELLENMİŞ)
  // ==========================================

  // Ortak Sınav Planları
  db.run(`
  CREATE TABLE IF NOT EXISTS ortak_sinav_planlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_adi TEXT NOT NULL,
    sira_sayisi INTEGER NOT NULL DEFAULT 8,
    sutun_sayisi INTEGER NOT NULL DEFAULT 5,
    toplam_kapasite INTEGER NOT NULL,
    duzeni TEXT NOT NULL DEFAULT 'Z',
    durum INTEGER DEFAULT 1,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

  // Ortak Sınav Salonları (GÜNCELLENDİ: satir_sayisi, sutun_sayisi eklendi)
  db.run(`
  CREATE TABLE IF NOT EXISTS ortak_sinav_salonlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_adi TEXT NOT NULL,
    plan_id INTEGER,
    kapasite INTEGER NOT NULL,
    satir_sayisi INTEGER DEFAULT 8,
    sutun_sayisi INTEGER DEFAULT 5,
    durum INTEGER DEFAULT 1,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES ortak_sinav_planlar(id)
  )
`);

  // Ortak Sınavlar (GÜNCELLENDİ: sinif_id eklendi)
  db.run(`
  CREATE TABLE IF NOT EXISTS ortak_sinavlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sinav_kodu TEXT NOT NULL UNIQUE,
    sinav_turu TEXT NOT NULL,
    sinav_adi TEXT NOT NULL,
    sinav_tarihi TEXT NOT NULL,
    sinav_saati TEXT NOT NULL,
    sinif_seviyesi TEXT NOT NULL,
    sinif_id INTEGER,
    sinav_donemi TEXT NOT NULL,
    sinav_no TEXT NOT NULL,
    aciklama TEXT,
    mazeret_telafi INTEGER DEFAULT 0,
    kilitli INTEGER DEFAULT 0,
    durum INTEGER DEFAULT 1,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sinif_id) REFERENCES classes(id)
  )
`);

  // Ortak Sınav Açıklamaları
  db.run(`
  CREATE TABLE IF NOT EXISTS ortak_sinav_aciklamalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aciklama TEXT NOT NULL,
    sira INTEGER NOT NULL,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

  // Ortak Sınav Dağıtım (GÜNCELLENDİ: satir_index, sutun_index eklendi)
  db.run(`
  CREATE TABLE IF NOT EXISTS ortak_sinav_dagitim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sinav_id INTEGER NOT NULL,
    ogrenci_id INTEGER NOT NULL,
    salon_id INTEGER NOT NULL,
    sira_no INTEGER NOT NULL,
    satir_index INTEGER,
    sutun_index INTEGER,
    sabitle INTEGER DEFAULT 0,
    yoklama_durumu TEXT DEFAULT 'Bekleniyor',
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sinav_id) REFERENCES ortak_sinavlar(id) ON DELETE CASCADE,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id) ON DELETE CASCADE,
    FOREIGN KEY (salon_id) REFERENCES ortak_sinav_salonlar(id) ON DELETE CASCADE
  )
`);

  // Ortak Sınav Gözetmenler (GÜNCELLENDİ: gorev_puani, branş_uyumu eklendi)
  db.run(`
  CREATE TABLE IF NOT EXISTS ortak_sinav_gozetmenler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sinav_id INTEGER NOT NULL,
    ogretmen_id INTEGER NOT NULL,
    salon_id INTEGER NOT NULL,
    gorev_turu TEXT NOT NULL,
    gorev_puani INTEGER DEFAULT 0,
    brans_uyumu INTEGER DEFAULT 1,
    gorev_baslangic TEXT,
    gorev_bitis TEXT,
    dijital_imza TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sinav_id) REFERENCES ortak_sinavlar(id) ON DELETE CASCADE,
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
    FOREIGN KEY (salon_id) REFERENCES ortak_sinav_salonlar(id) ON DELETE CASCADE
  )
`);

  // 🆕 YENİ TABLO: Öğrenci Yoklama ve Disiplin Kayıtları
  db.run(`
  CREATE TABLE IF NOT EXISTS sinav_yoklama_kayitlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sinav_id INTEGER NOT NULL,
    ogrenci_id INTEGER NOT NULL,
    salon_id INTEGER NOT NULL,
    yoklama_durumu TEXT NOT NULL,
    yoklama_saati TEXT,
    gozetmen_id INTEGER,
    disiplin_turu TEXT,
    disiplin_aciklama TEXT,
    kanitlar TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sinav_id) REFERENCES ortak_sinavlar(id) ON DELETE CASCADE,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id) ON DELETE CASCADE,
    FOREIGN KEY (salon_id) REFERENCES ortak_sinav_salonlar(id) ON DELETE CASCADE,
    FOREIGN KEY (gozetmen_id) REFERENCES ogretmenler(id)
  )
`);

  // 🆕 YENİ TABLO: QR Kod Kayıtları
  db.run(`
  CREATE TABLE IF NOT EXISTS sinav_qr_kodlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sinav_id INTEGER NOT NULL,
    qr_turu TEXT NOT NULL,
    hedef_id INTEGER NOT NULL,
    qr_data TEXT NOT NULL,
    qr_hash TEXT NOT NULL UNIQUE,
    kullanim_sayisi INTEGER DEFAULT 0,
    son_kullanim TEXT,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sinav_id) REFERENCES ortak_sinavlar(id) ON DELETE CASCADE
  )
`);

  // 🆕 YENİ TABLO: Öğretmen Görev Puanları
  db.run(`
  CREATE TABLE IF NOT EXISTS ogretmen_gorev_puanlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ogretmen_id INTEGER NOT NULL,
    donem TEXT NOT NULL,
    toplam_gorev_sayisi INTEGER DEFAULT 0,
    toplam_gorev_dakika INTEGER DEFAULT 0,
    son_gorev_tarihi TEXT,
    guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
    UNIQUE(ogretmen_id, donem)
  )
`);

  // 🆕 YENİ TABLO: Sınav Kontrol Paneli Uyarıları
  db.run(`
  CREATE TABLE IF NOT EXISTS sinav_kontrol_uyarilari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sinav_id INTEGER NOT NULL,
    uyari_turu TEXT NOT NULL,
    uyari_mesaji TEXT NOT NULL,
    uyari_seviyesi TEXT NOT NULL,
    cozuldu INTEGER DEFAULT 0,
    olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sinav_id) REFERENCES ortak_sinavlar(id) ON DELETE CASCADE
  )
`);

  console.log("✅ Ortak sınav (kelebek) tabloları oluşturuldu (ENHANCED)");
  console.log("✅ 4 YENİ TABLO eklendi:");
  console.log("   • sinav_yoklama_kayitlari (Dijital Yoklama)");
  console.log("   • sinav_qr_kodlari (QR Kod Sistemi)");
  console.log("   • ogretmen_gorev_puanlari (Akıllı Dağıtım)");
  console.log("   • sinav_kontrol_uyarilari (Kontrol Paneli)");

  // ==========================================
  // VERİTABANI VERSİYON TABLOSU
  // ==========================================

  db.run(`
    CREATE TABLE IF NOT EXISTS db_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // İlk versiyon kaydı
  try {
    const versionCheck = db.prepare(
      "SELECT version FROM db_version WHERE id = 1"
    );
    if (!versionCheck.step()) {
      db.run("INSERT INTO db_version (id, version) VALUES (1, 1)");
      console.log("✅ Veritabanı versiyon: 1");
    }
    versionCheck.free();
  } catch (error) {
    console.log("ℹ️ Versiyon tablosu zaten var");
  }

  console.log("✅ Tüm okul tabloları başarıyla oluşturuldu");
}
// ============================================
// OTOMATİK VERİTABANI GÜNCELLEMESİ (MIGRATION)
// ============================================

/**
 * Mevcut veritabanı versiyonunu al
 */
function getDatabaseVersion(db) {
  try {
    const stmt = db.prepare("SELECT version FROM db_version WHERE id = 1");
    if (stmt.step()) {
      const version = stmt.getAsObject().version;
      stmt.free();
      return version;
    }
    stmt.free();
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Veritabanı versiyonunu güncelle
 */
function setDatabaseVersion(db, version) {
  try {
    db.run("UPDATE db_version SET version = ?, updated_at = ? WHERE id = 1", [
      version,
      new Date().toISOString(),
    ]);
    console.log(`✅ Veritabanı versiyonu güncellendi: ${version}`);
    console.log(`📝 Değişiklik: ${DB_CHANGELOG[version]}`);
  } catch (error) {
    console.error("❌ Versiyon güncelleme hatası:", error);
  }
}

/**
 * Sütun var mı kontrol et
 */
function columnExists(db, tableName, columnName) {
  try {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
    let exists = false;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.name === columnName) {
        exists = true;
        break;
      }
    }
    stmt.free();
    return exists;
  } catch (error) {
    return false;
  }
}

/**
 * Tablo var mı kontrol et
 */
function tableExists(db, tableName) {
  try {
    const stmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    );
    stmt.bind([tableName]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  } catch (error) {
    return false;
  }
}

/**
 * Index var mı kontrol et
 */
function indexExists(db, indexName) {
  try {
    const stmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name=?"
    );
    stmt.bind([indexName]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  } catch (error) {
    return false;
  }
}

// ============================================
// MIGRATION FONKSİYONLARI
// ============================================

const migrations = {
  /**
   * Versiyon 1: Temel tablolar (zaten var)
   */
  1: (db) => {
    console.log("📋 Migration v1: Temel tablolar (zaten var)");
    return true;
  },

  /**
   * Versiyon 2: Öğretmenlere branş ekleme
   */
  2: (db) => {
    console.log("📋 Migration v2: Öğretmenlere branş ekleniyor...");
    try {
      if (!columnExists(db, "ogretmenler", "brans")) {
        db.run("ALTER TABLE ogretmenler ADD COLUMN brans TEXT");
        console.log("✅ ogretmenler.brans eklendi");
      }
      return true;
    } catch (error) {
      console.error("❌ Migration v2 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 3: Sınıflar tablosu kontrol
   */
  3: (db) => {
    console.log("📋 Migration v3: Sınıflar tablosu kontrol ediliyor...");
    try {
      if (!tableExists(db, "siniflar")) {
        db.run(`
          CREATE TABLE siniflar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sinif_adi TEXT NOT NULL,
            sinif_duzey INTEGER NOT NULL,
            sube TEXT NOT NULL,
            alan TEXT,
            sinif_ogretmeni_id INTEGER,
            mudur_yardimcisi_id INTEGER,
            rehber_ogretmen_id INTEGER,
            ogrenci_sayisi INTEGER DEFAULT 0,
            erkek_sayisi INTEGER DEFAULT 0,
            kiz_sayisi INTEGER DEFAULT 0,
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT,
            FOREIGN KEY (sinif_ogretmeni_id) REFERENCES ogretmenler(id),
            FOREIGN KEY (mudur_yardimcisi_id) REFERENCES ogretmenler(id),
            FOREIGN KEY (rehber_ogretmen_id) REFERENCES ogretmenler(id),
            UNIQUE(sinif_duzey, sube)
          )
        `);
        console.log("✅ siniflar tablosu oluşturuldu");
      }
      return true;
    } catch (error) {
      console.error("❌ Migration v3 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 4: 🚀 BLOK DESTEĞI EKLEME
   */
  4: (db) => {
    console.log("📋 Migration v4: 🚀 Blok desteği ekleniyor...");
    try {
      let changed = false;

      // program_detaylar tablosuna blok alanları ekle
      if (!columnExists(db, "program_detaylar", "blok_id")) {
        db.run("ALTER TABLE program_detaylar ADD COLUMN blok_id TEXT");
        console.log("✅ program_detaylar.blok_id eklendi");
        changed = true;
      }

      if (!columnExists(db, "program_detaylar", "blok_index")) {
        db.run(
          "ALTER TABLE program_detaylar ADD COLUMN blok_index INTEGER DEFAULT 0"
        );
        console.log("✅ program_detaylar.blok_index eklendi");
        changed = true;
      }

      if (!columnExists(db, "program_detaylar", "blok_buyukluk")) {
        db.run(
          "ALTER TABLE program_detaylar ADD COLUMN blok_buyukluk INTEGER DEFAULT 1"
        );
        console.log("✅ program_detaylar.blok_buyukluk eklendi");
        changed = true;
      }

      if (changed) {
        console.log("✅ Blok desteği başarıyla eklendi");
      } else {
        console.log("ℹ️ Blok alanları zaten mevcut");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v4 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 5: 🚀 ALGORİTMA ENTEGRASYONU
   */
  5: (db) => {
    console.log(
      "📋 Migration v5: 🚀 Algoritma entegrasyon tabloları ekleniyor..."
    );
    try {
      let tablesCreated = 0;

      // Algorithm Config
      if (!tableExists(db, "algorithm_config")) {
        db.run(`
          CREATE TABLE algorithm_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            config_json TEXT NOT NULL,
            config_name TEXT DEFAULT 'default',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ algorithm_config tablosu oluşturuldu");
        tablesCreated++;
      }

      // Solution Variants
      if (!tableExists(db, "solution_variants")) {
        db.run(`
          CREATE TABLE solution_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            variant_name TEXT NOT NULL,
            solution_json TEXT NOT NULL,
            score REAL,
            metadata_json TEXT,
            is_best INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ solution_variants tablosu oluşturuldu");
        tablesCreated++;

        // Index ekle (performance için)
        if (!indexExists(db, "idx_variants_program")) {
          db.run(
            "CREATE INDEX idx_variants_program ON solution_variants(program_id)"
          );
          console.log("✅ solution_variants index eklendi");
        }
      }

      // Performance Metrics
      if (!tableExists(db, "performance_metrics")) {
        db.run(`
          CREATE TABLE performance_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            session_name TEXT,
            total_time INTEGER,
            iterations INTEGER,
            score REAL,
            success INTEGER DEFAULT 1,
            metrics_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ performance_metrics tablosu oluşturuldu");
        tablesCreated++;

        // Index ekle
        if (!indexExists(db, "idx_metrics_program")) {
          db.run(
            "CREATE INDEX idx_metrics_program ON performance_metrics(program_id)"
          );
          console.log("✅ performance_metrics index eklendi");
        }
      }

      if (tablesCreated > 0) {
        console.log(`🎉 ${tablesCreated} yeni tablo eklendi`);
      } else {
        console.log("ℹ️ Algoritma tabloları zaten mevcut");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v5 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 6: 🔥 sinif_ders_ogretmen tablosuna eksik sütunlar
   */
  6: (db) => {
    console.log("📋 Migration v6: 🔥 sinif_ders_ogretmen kontrol ediliyor...");

    try {
      // ✅ ÖNCE TABLO VAR MI KONTROL ET
      if (!tableExists(db, "sinif_ders_ogretmen")) {
        console.log("⚠️ sinif_ders_ogretmen tablosu yok, oluşturuluyor...");

        db.run(`
        CREATE TABLE IF NOT EXISTS sinif_ders_ogretmen (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sinif_id INTEGER NOT NULL,
          ders_id INTEGER NOT NULL,
          ogretmen_id INTEGER,
          haftalik_ders_saati INTEGER DEFAULT 0,
          program_id INTEGER,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE,
          FOREIGN KEY (ders_id) REFERENCES dersler(id) ON DELETE CASCADE,
          FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE SET NULL,
          UNIQUE(sinif_id, ders_id)
        )
      `);

        console.log("✅ sinif_ders_ogretmen tablosu oluşturuldu");
        return true;
      }

      // ✅ TABLO VARSA SÜTUNLARI KONTROL ET
      let changed = false;

      // program_id ekle
      if (!columnExists(db, "sinif_ders_ogretmen", "program_id")) {
        db.run("ALTER TABLE sinif_ders_ogretmen ADD COLUMN program_id INTEGER");
        console.log("✅ sinif_ders_ogretmen.program_id eklendi");
        changed = true;
      }

      // haftalik_ders_saati ekle
      if (!columnExists(db, "sinif_ders_ogretmen", "haftalik_ders_saati")) {
        db.run(
          "ALTER TABLE sinif_ders_ogretmen ADD COLUMN haftalik_ders_saati INTEGER DEFAULT 0"
        );
        console.log("✅ sinif_ders_ogretmen.haftalik_ders_saati eklendi");
        changed = true;
      }

      if (changed) {
        console.log("✅ sinif_ders_ogretmen tablosu güncellendi");
      } else {
        console.log("ℹ️ Tüm sütunlar mevcut");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v6 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 7: 🔥 blok_dersler tablosu ekleme
   */
  7: (db) => {
    console.log("📋 Migration v7: 🔥 blok_dersler tablosu ekleniyor...");
    try {
      // blok_dersler tablosunu kontrol et ve oluştur
      if (!tableExists(db, "blok_dersler")) {
        db.run(`
        CREATE TABLE blok_dersler (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id INTEGER NOT NULL,
          sinif_id INTEGER NOT NULL,
          ders_id INTEGER NOT NULL,
          ogretmen_id INTEGER NOT NULL,
          blok_yapisi TEXT NOT NULL,
          blok_sayisi INTEGER DEFAULT 1,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES ders_programlari(id) ON DELETE CASCADE,
          FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE,
          FOREIGN KEY (ders_id) REFERENCES dersler(id) ON DELETE CASCADE,
          FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
          UNIQUE(program_id, sinif_id, ders_id, ogretmen_id)
        )
      `);
        console.log("✅ blok_dersler tablosu oluşturuldu");
      } else {
        console.log("ℹ️ blok_dersler tablosu zaten mevcut");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v7 hatası:", error);
      return false;
    }
  },
  /**
   * Versiyon 8: 🔥 program_cozumleri tablosu ve programlar tablosu
   */
  8: (db) => {
    console.log(
      "📋 Migration v8: program_cozumleri ve programlar tablosu ekleniyor..."
    );
    try {
      // programlar tablosu yoksa oluştur
      if (!tableExists(db, "programlar")) {
        console.log("📋 programlar tablosu mevcut değil, oluşturuluyor...");
        db.run(`
        CREATE TABLE programlar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ad TEXT NOT NULL,
          yil INTEGER NOT NULL,
          donem INTEGER NOT NULL,
          sinif_id INTEGER NOT NULL,
          program_turu TEXT DEFAULT 'normal',
          donem_tipi TEXT DEFAULT 'guz',
          kilitli INTEGER DEFAULT 0,
          aciklama TEXT,
          olusturma_tarihi TEXT NOT NULL,
          guncelleme_tarihi TEXT NOT NULL,
          FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE
        );
      `);
        db.run(
          `CREATE INDEX IF NOT EXISTS idx_programlar_sinif ON programlar(sinif_id);`
        );
        console.log("✅ programlar tablosu oluşturuldu");
      } else {
        console.log("ℹ️ programlar tablosu zaten mevcut");
      }

      // program_cozumleri tablosu
      if (!tableExists(db, "program_cozumleri")) {
        db.run(`
        CREATE TABLE program_cozumleri (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id INTEGER NOT NULL,
          cozum_adi TEXT NOT NULL,
          cozum_data TEXT NOT NULL,
          metadata TEXT,
          aktif INTEGER DEFAULT 0,
          olusturma_tarihi TEXT NOT NULL,
          guncelleme_tarihi TEXT NOT NULL,
          FOREIGN KEY (program_id) REFERENCES programlar(id) ON DELETE CASCADE
        )
      `);
        console.log("✅ program_cozumleri tablosu oluşturuldu");

        if (!indexExists(db, "idx_cozumleri_program")) {
          db.run(
            "CREATE INDEX idx_cozumleri_program ON program_cozumleri(program_id)"
          );
          console.log("✅ program_cozumleri index eklendi");
        }
      } else {
        console.log("ℹ️ program_cozumleri tablosu zaten mevcut");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v8 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 9: 📌 programlar tablosuna ek özellikler
   * - program_turu (örn: haftalık, sınav, etüt)
   * - donem_tipi (örn: güz, bahar)
   * - kilitli (0/1)
   * - aciklama
   */
  9: (db) => {
    console.log(
      "📋 Migration v9: programlar tablosuna yeni alanlar ekleniyor..."
    );
    try {
      if (!tableExists(db, "programlar")) {
        console.error(
          "❌ programlar tablosu bulunamadı. Migration v9 uygulanamadı."
        );
        return false;
      }

      if (!columnExists(db, "programlar", "program_turu")) {
        db.run(
          `ALTER TABLE programlar ADD COLUMN program_turu TEXT DEFAULT 'normal'`
        );
        console.log("✅ program_turu eklendi");
      }
      if (!columnExists(db, "programlar", "donem_tipi")) {
        db.run(
          `ALTER TABLE programlar ADD COLUMN donem_tipi TEXT DEFAULT 'guz'`
        );
        console.log("✅ donem_tipi eklendi");
      }
      if (!columnExists(db, "programlar", "kilitli")) {
        db.run(`ALTER TABLE programlar ADD COLUMN kilitli INTEGER DEFAULT 0`);
        console.log("✅ kilitli eklendi");
      }
      if (!columnExists(db, "programlar", "aciklama")) {
        db.run(`ALTER TABLE programlar ADD COLUMN aciklama TEXT`);
        console.log("✅ aciklama eklendi");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v9 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 10: ✈️ GEZİ PLANLAMA SİSTEMİ (VERİ KORUMALI YENİDEN OLUŞTURMA)
   */
  10: (db) => {
    console.log("📋 Migration v10: ✈️ Gezi Planlama Sistemi ekleniyor...");
    try {
      let tablesCreated = 0;

      // ... (Diğer gezi tabloları buraya gelecek - değiştirme)

      // ============================================
      // GEZİ_TUR_FİRMA TABLOSU - VERİ KORUMALI YENİDEN OLUŞTURMA
      // ============================================
      console.log("🔄 gezi_tur_firma tablosu kontrol ediliyor...");

      const firmaTableCheck = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='gezi_tur_firma'"
      );

      if (
        firmaTableCheck &&
        firmaTableCheck.length > 0 &&
        firmaTableCheck[0].values.length > 0
      ) {
        console.log("📊 Mevcut gezi_tur_firma tablosu bulundu");

        // Sütunları kontrol et
        const currentColumns = db.exec("PRAGMA table_info(gezi_tur_firma)");
        const columnNames = currentColumns[0].values.map((row) => row[1]);

        console.log("📋 Mevcut sütunlar:", columnNames.join(", "));

        // Gerekli sütunlar
        const requiredColumns = [
          "id",
          "gezi_id",
          "firma_adi",
          "yetkili_ad_soyad",
          "yetkili_unvan",
          "yetkili_telefon",
          "firma_telefon",
          "firma_adres",
          "firma_email",
          "vergi_dairesi",
          "vergi_no",
          "tursab_no",
          "isletme_belge_no",
          "yetki_belgesi",
          "rehber_ad",
          "rehber_kokart",
          "sozlesme_tarihi",
          "toplam_bedel",
          "para_birimi",
          "dahil_hizmetler",
          "dahil_olmayan",
          "iptal_kosul",
          "notlar",
          "olusturma_tarihi",
        ];

        const missingColumns = requiredColumns.filter(
          (col) => !columnNames.includes(col)
        );

        if (missingColumns.length > 0) {
          console.log("⚠️ Eksik sütunlar bulundu:", missingColumns.join(", "));
          console.log("🔄 Tablo yeniden oluşturulacak (VERİ KORUNACAK)...");

          // 1. MEVCUT VERİLERİ YEDEKLE
          console.log("💾 Mevcut veriler yedekleniyor...");
          const backupStmt = db.prepare("SELECT * FROM gezi_tur_firma");
          const backupData = [];
          while (backupStmt.step()) {
            backupData.push(backupStmt.getAsObject());
          }
          backupStmt.free();
          console.log(`💾 ${backupData.length} kayıt yedeklendi`);

          // 2. ESKİ TABLOYU SİL
          console.log("🗑️ Eski tablo siliniyor...");
          db.run("DROP TABLE IF EXISTS gezi_tur_firma");

          // 3. YENİ TABLOYU OLUŞTUR
          console.log("🆕 Yeni tablo oluşturuluyor...");
          db.run(`
          CREATE TABLE gezi_tur_firma (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gezi_id INTEGER NOT NULL,
            firma_adi TEXT NOT NULL,
            yetkili_ad_soyad TEXT,
            yetkili_unvan TEXT,
            yetkili_telefon TEXT,
            firma_telefon TEXT,
            firma_adres TEXT,
            firma_email TEXT,
            vergi_dairesi TEXT,
            vergi_no TEXT,
            tursab_no TEXT,
            isletme_belge_no TEXT,
            yetki_belgesi TEXT,
            rehber_ad TEXT,
            rehber_kokart TEXT,
            sozlesme_tarihi TEXT,
            toplam_bedel REAL,
            para_birimi TEXT DEFAULT 'TRY',
            dahil_hizmetler TEXT,
            dahil_olmayan TEXT,
            iptal_kosul TEXT,
            notlar TEXT,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
          )
        `);
          console.log("✅ Yeni tablo oluşturuldu");

          // 4. VERİLERİ GERİ YÜKLE
          if (backupData.length > 0) {
            console.log("📥 Veriler geri yükleniyor...");
            const insertStmt = db.prepare(`
            INSERT INTO gezi_tur_firma (
              gezi_id, firma_adi, yetkili_ad_soyad, yetkili_unvan, yetkili_telefon,
              firma_telefon, firma_adres, firma_email, vergi_dairesi, vergi_no,
              tursab_no, isletme_belge_no, yetki_belgesi, rehber_ad, rehber_kokart,
              sozlesme_tarihi, toplam_bedel, para_birimi, dahil_hizmetler,
              dahil_olmayan, iptal_kosul, notlar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

            let restoredCount = 0;
            for (const row of backupData) {
              try {
                insertStmt.run([
                  row.gezi_id,
                  row.firma_adi || null,
                  row.yetkili_ad_soyad || row.yetkili_adi || null, // ESKİ SÜTUN ADI UYUMU
                  row.yetkili_unvan || null,
                  row.yetkili_telefon || row.telefon || null, // ESKİ SÜTUN ADI UYUMU
                  row.firma_telefon || null,
                  row.firma_adres || row.adres || null,
                  row.firma_email || row.email || null,
                  row.vergi_dairesi || null,
                  row.vergi_no || null,
                  row.tursab_no || null,
                  row.isletme_belge_no || null,
                  row.yetki_belgesi || null,
                  row.rehber_ad || null,
                  row.rehber_kokart || null,
                  row.sozlesme_tarihi || null,
                  row.toplam_bedel || null,
                  row.para_birimi || "TRY",
                  row.dahil_hizmetler || null,
                  row.dahil_olmayan || null,
                  row.iptal_kosul || null,
                  row.notlar || null,
                ]);
                restoredCount++;
              } catch (e) {
                console.warn("⚠️ Kayıt geri yüklenemedi:", e.message);
              }
            }
            insertStmt.free();
            console.log(`✅ ${restoredCount} kayıt geri yüklendi`);
          }

          tablesCreated++;
        } else {
          console.log("✅ gezi_tur_firma tablosu güncel");
        }
      } else {
        // TABLO YOK - YENİ OLUŞTUR
        console.log("📊 gezi_tur_firma tablosu oluşturuluyor...");

        db.run(`
        CREATE TABLE gezi_tur_firma (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gezi_id INTEGER NOT NULL,
          firma_adi TEXT NOT NULL,
          yetkili_ad_soyad TEXT,
          yetkili_unvan TEXT,
          yetkili_telefon TEXT,
          firma_telefon TEXT,
          firma_adres TEXT,
          firma_email TEXT,
          vergi_dairesi TEXT,
          vergi_no TEXT,
          tursab_no TEXT,
          isletme_belge_no TEXT,
          yetki_belgesi TEXT,
          rehber_ad TEXT,
          rehber_kokart TEXT,
          sozlesme_tarihi TEXT,
          toplam_bedel REAL,
          para_birimi TEXT DEFAULT 'TRY',
          dahil_hizmetler TEXT,
          dahil_olmayan TEXT,
          iptal_kosul TEXT,
          notlar TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
        )
      `);

        console.log("✅ gezi_tur_firma tablosu oluşturuldu");
        tablesCreated++;
      }

      // ... (Diğer gezi tabloları devam eder)

      if (tablesCreated > 0) {
        console.log(`🎉 ${tablesCreated} gezi tablosu güncellendi/eklendi`);
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v10 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 11: 🗓️ ÖĞRETMEN NÖBET SİSTEMİ
   */
  11: (db) => {
    console.log("📋 Migration v11: 🗓️ Öğretmen Nöbet Sistemi ekleniyor...");
    try {
      let tablesCreated = 0;

      // Nöbet Yerleri
      if (!tableExists(db, "nobet_yerleri")) {
        db.run(`
          CREATE TABLE nobet_yerleri (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            yer_adi TEXT NOT NULL,
            aciklama TEXT,
            sira INTEGER DEFAULT 0,
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("✅ nobet_yerleri tablosu oluşturuldu");
        tablesCreated++;
      }

      // Nöbet Programları
      if (!tableExists(db, "nobet_programlari")) {
        db.run(`
          CREATE TABLE nobet_programlari (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_adi TEXT NOT NULL,
            baslangic_tarihi TEXT NOT NULL,
            bitis_tarihi TEXT NOT NULL,
            program_tipi TEXT DEFAULT 'haftalik' CHECK(program_tipi IN ('haftalik', 'aylik', 'donemlik')),
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT
          )
        `);
        console.log("✅ nobet_programlari tablosu oluşturuldu");
        tablesCreated++;
      }

      // Nöbet Atamaları
      if (!tableExists(db, "nobet_atamalari")) {
        db.run(`
          CREATE TABLE nobet_atamalari (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            ogretmen_id INTEGER NOT NULL,
            yer_id INTEGER NOT NULL,
            gun TEXT NOT NULL,
            tarih TEXT NOT NULL,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES nobet_programlari(id) ON DELETE CASCADE,
            FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
            FOREIGN KEY (yer_id) REFERENCES nobet_yerleri(id) ON DELETE CASCADE,
            UNIQUE(program_id, ogretmen_id, tarih)
          )
        `);
        console.log("✅ nobet_atamalari tablosu oluşturuldu");
        tablesCreated++;
      }

      // Nöbetçi Müdür Yardımcısı
      if (!tableExists(db, "nobet_mudur_yardimcisi")) {
        db.run(`
          CREATE TABLE nobet_mudur_yardimcisi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            mudur_yardimcisi_adi TEXT NOT NULL,
            gun TEXT NOT NULL,
            tarih TEXT NOT NULL,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES nobet_programlari(id) ON DELETE CASCADE,
            UNIQUE(program_id, tarih)
          )
        `);
        console.log("✅ nobet_mudur_yardimcisi tablosu oluşturuldu");
        tablesCreated++;
      }

      // Pasif Öğretmenler
      if (!tableExists(db, "nobet_pasif_ogretmenler")) {
        db.run(`
          CREATE TABLE nobet_pasif_ogretmenler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ogretmen_id INTEGER NOT NULL,
            neden TEXT NOT NULL,
            aciklama TEXT,
            baslangic_tarihi TEXT NOT NULL,
            bitis_tarihi TEXT,
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ nobet_pasif_ogretmenler tablosu oluşturuldu");
        tablesCreated++;
      }

      // Öğretmen Nöbet Tercihleri
      if (!tableExists(db, "ogretmen_nobet_tercihleri")) {
        db.run(`
          CREATE TABLE ogretmen_nobet_tercihleri (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ogretmen_id INTEGER NOT NULL,
            gun TEXT NOT NULL,
            haftalik_min INTEGER DEFAULT 0,
            haftalik_max INTEGER DEFAULT 5,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT,
            FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
            UNIQUE(ogretmen_id, gun)
          )
        `);
        console.log("✅ ogretmen_nobet_tercihleri tablosu oluşturuldu");
        tablesCreated++;
      }

      // Nöbet Açıklamaları
      if (!tableExists(db, "nobet_aciklamalari")) {
        db.run(`
          CREATE TABLE nobet_aciklamalari (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            aciklama TEXT NOT NULL,
            sira INTEGER DEFAULT 0,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES nobet_programlari(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ nobet_aciklamalari tablosu oluşturuldu");
        tablesCreated++;
      }

      if (tablesCreated > 0) {
        console.log(`🎉 ${tablesCreated} nöbet tablosu eklendi`);
        console.log("🗓️ Haftalık/Aylık/Dönemlik program desteği");
        console.log("👥 Pasif öğretmen yönetimi");
        console.log("📅 Gün tercihleri ve rotasyon");
        console.log("🤖 Akıllı atama algoritması hazır");
      } else {
        console.log("ℹ️ Nöbet tabloları zaten mevcut");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v11 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 12: 📝 ORTAK SINAV (KELEBEK) SİSTEMİ
   */
  12: (db) => {
    console.log(
      "📋 Migration v12: 📝 Ortak Sınav (Kelebek) Sistemi ekleniyor..."
    );
    try {
      let tablesCreated = 0;

      // 1. Ortak Sınav Planları (Oturma Planları)
      if (!tableExists(db, "ortak_sinav_planlar")) {
        db.run(`
          CREATE TABLE ortak_sinav_planlar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_adi TEXT NOT NULL,
            sira_sayisi INTEGER NOT NULL DEFAULT 8,
            sutun_sayisi INTEGER NOT NULL DEFAULT 5,
            toplam_kapasite INTEGER NOT NULL,
            duzeni TEXT NOT NULL DEFAULT 'Z',
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("✅ ortak_sinav_planlar tablosu oluşturuldu");
        tablesCreated++;

        // Örnek planlar ekle
        db.run(`
          INSERT INTO ortak_sinav_planlar (id, plan_adi, sira_sayisi, sutun_sayisi, toplam_kapasite, duzeni)
          VALUES 
            (1, 'Plan-1 (3 Sütun)', 8, 3, 24, 'Z'),
            (2, 'Plan-2 (4 Sütun)', 8, 4, 32, 'Z'),
            (3, 'Plan-3 (5 Sütun)', 8, 5, 40, 'Z'),
            (4, 'Plan-8 (8 Sütun)', 5, 8, 40, 'Z')
        `);
      }

      // 2. Ortak Sınav Salonları
      if (!tableExists(db, "ortak_sinav_salonlar")) {
        db.run(`
          CREATE TABLE ortak_sinav_salonlar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_adi TEXT NOT NULL,
            plan_id INTEGER,
            kapasite INTEGER NOT NULL,
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plan_id) REFERENCES ortak_sinav_planlar(id)
          )
        `);
        console.log("✅ ortak_sinav_salonlar tablosu oluşturuldu");
        tablesCreated++;
      }

      // 3. Ortak Sınavlar
      if (!tableExists(db, "ortak_sinavlar")) {
        db.run(`
          CREATE TABLE ortak_sinavlar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sinav_kodu TEXT NOT NULL UNIQUE,
            sinav_turu TEXT NOT NULL,
            sinav_adi TEXT NOT NULL,
            sinav_tarihi TEXT NOT NULL,
            sinav_saati TEXT NOT NULL,
            sinif_seviyesi TEXT NOT NULL,
            sinav_donemi TEXT NOT NULL,
            sinav_no TEXT NOT NULL,
            aciklama TEXT,
            mazeret_telafi INTEGER DEFAULT 0,
            kilitli INTEGER DEFAULT 0,
            durum INTEGER DEFAULT 1,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("✅ ortak_sinavlar tablosu oluşturuldu");
        tablesCreated++;
      }

      // 4. Ortak Sınav Açıklamaları
      if (!tableExists(db, "ortak_sinav_aciklamalar")) {
        db.run(`
          CREATE TABLE ortak_sinav_aciklamalar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            aciklama TEXT NOT NULL,
            sira INTEGER NOT NULL,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("✅ ortak_sinav_aciklamalar tablosu oluşturuldu");
        tablesCreated++;

        // Örnek açıklamalar ekle
        db.run(`
          INSERT INTO ortak_sinav_aciklamalar (sira, aciklama)
          VALUES 
            (1, 'Öğrenciler sınav salonuna giriş yapmadan önce sınavla ilgili tüm bilgileri kontrol etmelidir.'),
            (2, 'Sınav esnasında elektronik cihaz bulundurmak kesinlikle yasaktır.'),
            (3, 'Kopya çeken öğrencilerin sınavı geçersiz sayılacaktır.'),
            (4, 'Sınav süresi bitiminde öğrenciler salondan ayrılabilir.'),
            (5, 'Sınav esnasında tuvalete çıkış yasaktır.')
        `);
      }

      // 5. Ortak Sınav Dağıtım (Kelebek Dağıtımı)
      if (!tableExists(db, "ortak_sinav_dagitim")) {
        db.run(`
          CREATE TABLE ortak_sinav_dagitim (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sinav_id INTEGER NOT NULL,
            ogrenci_id INTEGER NOT NULL,
            salon_id INTEGER NOT NULL,
            sira_no INTEGER NOT NULL,
            sutun_no INTEGER NOT NULL,
            sabitle INTEGER DEFAULT 0,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sinav_id) REFERENCES ortak_sinavlar(id) ON DELETE CASCADE,
            FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id) ON DELETE CASCADE,
            FOREIGN KEY (salon_id) REFERENCES ortak_sinav_salonlar(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ ortak_sinav_dagitim tablosu oluşturuldu");
        tablesCreated++;

        // Index ekle (performance için)
        db.run(
          "CREATE INDEX IF NOT EXISTS idx_dagitim_sinav ON ortak_sinav_dagitim(sinav_id)"
        );
        db.run(
          "CREATE INDEX IF NOT EXISTS idx_dagitim_ogrenci ON ortak_sinav_dagitim(ogrenci_id)"
        );
        db.run(
          "CREATE INDEX IF NOT EXISTS idx_dagitim_salon ON ortak_sinav_dagitim(salon_id)"
        );
      }

      // 6. Ortak Sınav Gözetmenler
      if (!tableExists(db, "ortak_sinav_gozetmenler")) {
        db.run(`
          CREATE TABLE ortak_sinav_gozetmenler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sinav_id INTEGER NOT NULL,
            ogretmen_id INTEGER NOT NULL,
            salon_id INTEGER NOT NULL,
            gorev_turu TEXT NOT NULL,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sinav_id) REFERENCES ortak_sinavlar(id) ON DELETE CASCADE,
            FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
            FOREIGN KEY (salon_id) REFERENCES ortak_sinav_salonlar(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ ortak_sinav_gozetmenler tablosu oluşturuldu");
        tablesCreated++;

        // Index ekle
        db.run(
          "CREATE INDEX IF NOT EXISTS idx_gozetmen_sinav ON ortak_sinav_gozetmenler(sinav_id)"
        );
      }

      if (tablesCreated > 0) {
        console.log(`🎉 ${tablesCreated} ortak sınav tablosu eklendi`);
        console.log("📝 Sınav oluşturma ve yönetim");
        console.log("🦋 Kelebek dağıtım algoritması");
        console.log("📌 Öğrenci sabitleme sistemi");
        console.log("👨‍🏫 Gözetmen atama sistemi");
        console.log("📄 7 farklı PDF rapor desteği");
      } else {
        console.log("ℹ️ Ortak sınav tabloları zaten mevcut");
      }

      return true;
    } catch (error) {
      console.error("❌ Migration v12 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 13: 🔧 EKSİK TABLOLARI EKLE
   */
  13: (db) => {
    console.log("📋 Migration v13: 🔧 Eksik tablolar ekleniyor...");
    try {
      let tablesCreated = 0;

      // 1. GEZİ_KATİLİMCİ_ÜCRETLERİ
      if (!tableExists(db, "gezi_katilimci_ucretler")) {
        console.log("📊 gezi_katilimci_ucretler oluşturuluyor...");
        db.run(`
          CREATE TABLE gezi_katilimci_ucretler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gezi_id INTEGER NOT NULL,
            kisi_tipi TEXT NOT NULL CHECK(kisi_tipi IN ('kafile_baskani', 'ogretmen', 'ogrenci', 'misafir')),
            kisi_id INTEGER NOT NULL,
            ad_soyad TEXT NOT NULL,
            ucret_durumu TEXT DEFAULT 'normal' CHECK(ucret_durumu IN ('normal', 'ucretsiz', 'indirimli')),
            ozel_ucret REAL,
            taksit_sayisi INTEGER,
            toplam_ucret REAL DEFAULT 0,
            toplam_odenen REAL DEFAULT 0,
            kalan_borc REAL DEFAULT 0,
            aciklama TEXT,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE,
            UNIQUE(gezi_id, kisi_tipi, kisi_id)
          )
        `);
        console.log("✅ gezi_katilimci_ucretler oluşturuldu");
        tablesCreated++;
      }

      // 2. GEZİ_KAFİLE_BAŞKANLARI
      if (!tableExists(db, "gezi_kafile_baskanlari")) {
        console.log("📊 gezi_kafile_baskanlari oluşturuluyor...");
        db.run(`
          CREATE TABLE gezi_kafile_baskanlari (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gezi_id INTEGER NOT NULL,
            ogretmen_id INTEGER NOT NULL,
            gorev TEXT DEFAULT 'Kafile Başkanı',
            eklenme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE,
            FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id) ON DELETE CASCADE,
            UNIQUE(gezi_id, ogretmen_id)
          )
        `);
        console.log("✅ gezi_kafile_baskanlari oluşturuldu");
        tablesCreated++;
      }

      // 3. GEZİ_ÖDEME_PLANI
      if (!tableExists(db, "gezi_odeme_plani")) {
        console.log("📊 gezi_odeme_plani oluşturuluyor...");
        db.run(`
          CREATE TABLE gezi_odeme_plani (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gezi_id INTEGER NOT NULL UNIQUE,
            kisi_basi_ucret REAL NOT NULL,
            para_birimi TEXT DEFAULT 'TL',
            taksit_sayisi INTEGER DEFAULT 1,
            pesinat_orani REAL DEFAULT 0,
            odeme_baslangic TEXT,
            taksit_araligi INTEGER DEFAULT 30,
            hatirlatma_gun INTEGER DEFAULT 7,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ gezi_odeme_plani oluşturuldu");
        tablesCreated++;
      }

      // 4. PROGRAMLAR
      if (!tableExists(db, "programlar")) {
        console.log("📊 programlar oluşturuluyor...");
        db.run(`
          CREATE TABLE programlar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad TEXT NOT NULL,
            yil INTEGER NOT NULL,
            donem INTEGER NOT NULL,
            sinif_id INTEGER NOT NULL,
            program_turu TEXT DEFAULT 'normal',
            donem_tipi TEXT DEFAULT 'guz',
            kilitli INTEGER DEFAULT 0,
            aciklama TEXT,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sinif_id) REFERENCES siniflar(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ programlar oluşturuldu");
        tablesCreated++;
      }

      // 5. PROGRAM_ÇÖZÜMLERİ
      if (!tableExists(db, "program_cozumleri")) {
        console.log("📊 program_cozumleri oluşturuluyor...");
        db.run(`
          CREATE TABLE program_cozumleri (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            cozum_adi TEXT NOT NULL,
            cozum_data TEXT NOT NULL,
            metadata TEXT,
            aktif INTEGER DEFAULT 0,
            olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            guncelleme_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES programlar(id) ON DELETE CASCADE
          )
        `);
        console.log("✅ program_cozumleri oluşturuldu");
        tablesCreated++;
      }

      console.log(`🎉 ${tablesCreated} yeni tablo eklendi`);
      return true;
    } catch (error) {
      console.error("❌ Migration v13 hatası:", error);
      return false;
    }
  },

  /**
   * Versiyon 14: 🚗 gezi_araclar tablosundan arac_tipi sütunu kaldırıldı (VERİ KORUNARAK)
   */
  14: (db) => {
    console.log(
      "📋 Migration v14: gezi_araclar tablosundan arac_tipi sütunu kaldırılıyor (veri korunarak)..."
    );
    try {
      // Tablo var mı kontrol et
      if (!tableExists(db, "gezi_araclar")) {
        console.log("ℹ️ gezi_araclar tablosu yok, migration atlanıyor");
        return true;
      }

      // arac_tipi sütunu var mı kontrol et
      if (!columnExists(db, "gezi_araclar", "arac_tipi")) {
        console.log("ℹ️ arac_tipi sütunu zaten yok, migration tamam");
        return true;
      }

      console.log(
        "🔄 arac_tipi sütunu bulundu → Veri korunarak tablo yeniden oluşturulacak"
      );

      // 1. Mevcut veriyi yedekle
      console.log("💾 Mevcut veriler yedekleniyor...");
      const backupStmt = db.prepare("SELECT * FROM gezi_araclar");
      const backupData = [];
      while (backupStmt.step()) {
        backupData.push(backupStmt.getAsObject());
      }
      backupStmt.free();
      console.log(`💾 ${backupData.length} araç kaydı yedeklendi`);

      // 2. Eski tabloyu sil
      console.log("🗑️ Eski tablo siliniyor...");
      db.run("DROP TABLE gezi_araclar");

      // 3. Yeni tabloyu oluştur (arac_tipi olmadan - güncel tanım)
      console.log("🆕 Yeni tablo oluşturuluyor (arac_tipi olmadan)...");
      db.run(`
        CREATE TABLE gezi_araclar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gezi_id INTEGER NOT NULL,
          plaka TEXT,
          sofor_adi TEXT,
          sofor_telefon TEXT,
          kapasite INTEGER,
          ucret REAL,
          arac_modeli TEXT,
          trafige_cikis_tarihi TEXT,
          son_muayene_tarihi TEXT,
          mali_sorumluluk_police_no TEXT,
          mali_sorumluluk_bitis_tarihi TEXT,
          ferdi_kaza_police_no TEXT,
          ferdi_kaza_bitis_tarihi TEXT,
          arac_ozellikleri TEXT,
          olusturma_tarihi TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (gezi_id) REFERENCES geziler(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Yeni gezi_araclar tablosu oluşturuldu");

      // 4. Verileri geri yükle (arac_tipi hariç)
      if (backupData.length > 0) {
        console.log("📥 Veriler geri yükleniyor...");
        const insertStmt = db.prepare(`
          INSERT INTO gezi_araclar 
          (id, gezi_id, plaka, sofor_adi, sofor_telefon, kapasite, ucret,
           arac_modeli, trafige_cikis_tarihi, son_muayene_tarihi,
           mali_sorumluluk_police_no, mali_sorumluluk_bitis_tarihi,
           ferdi_kaza_police_no, ferdi_kaza_bitis_tarihi,
           arac_ozellikleri, olusturma_tarihi)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let restoredCount = 0;
        for (const row of backupData) {
          try {
            insertStmt.run([
              row.id,
              row.gezi_id,
              row.plaka || null,
              row.sofor_adi || null,
              row.sofor_telefon || null,
              row.kapasite || null,
              row.ucret || null,
              row.arac_modeli || null,
              row.trafige_cikis_tarihi || null,
              row.son_muayene_tarihi || null,
              row.mali_sorumluluk_police_no || null,
              row.mali_sorumluluk_bitis_tarihi || null,
              row.ferdi_kaza_police_no || null,
              row.ferdi_kaza_bitis_tarihi || null,
              row.arac_ozellikleri || null,
              row.olusturma_tarihi || null,
            ]);
            restoredCount++;
          } catch (e) {
            console.warn("⚠️ Kayıt geri yüklenemedi:", e.message);
          }
        }
        insertStmt.free();
        console.log(
          `✅ ${restoredCount}/${backupData.length} kayıt geri yüklendi`
        );
      }

      console.log("✅ Migration v14 başarıyla tamamlandı");
      return true;
    } catch (error) {
      console.error("❌ Migration v14 hatası:", error);
      return false;
    }
  },
};

/**
 * Tüm migration'ları çalıştır
 */
function runMigrations(db) {
  console.log("\n🔄 VERİTABANI MIGRATION SİSTEMİ");
  console.log("=".repeat(60));
  console.log("👨‍💻 Geliştirici: SİMRE/MK");
  console.log("=".repeat(60));

  try {
    // Versiyon tablosu yoksa oluştur
    if (!tableExists(db, "db_version")) {
      db.run(`
        CREATE TABLE IF NOT EXISTS db_version (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          version INTEGER NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      db.run("INSERT INTO db_version (id, version) VALUES (1, 0)");
      console.log("✅ db_version tablosu oluşturuldu");
    }

    const currentVersion = getDatabaseVersion(db);
    const latestVersion = CURRENT_DB_VERSION;

    console.log(`\n📊 Mevcut versiyon: ${currentVersion}`);
    console.log(`📊 Hedef versiyon: ${latestVersion}`);

    if (currentVersion >= latestVersion) {
      console.log("✅ Veritabanı güncel!");
      console.log("=".repeat(60) + "\n");
      return true;
    }

    console.log(
      `\n🔄 ${latestVersion - currentVersion} migration çalıştırılacak...\n`
    );

    // Migration'ları sırayla çalıştır
    for (let v = currentVersion + 1; v <= latestVersion; v++) {
      if (migrations[v]) {
        console.log(`🔄 Migration v${v} çalıştırılıyor...`);
        const success = migrations[v](db);

        if (success) {
          setDatabaseVersion(db, v);
          console.log(`✅ Migration v${v} başarılı\n`);
        } else {
          console.error(`❌ Migration v${v} başarısız!`);
          console.log("=".repeat(60) + "\n");
          return false;
        }
      }
    }

    console.log("=".repeat(60));
    console.log("🎉 TÜM MIGRATION'LAR BAŞARIYLA TAMAMLANDI!");
    console.log("=".repeat(60) + "\n");

    return true;
  } catch (error) {
    console.error("❌ Migration hatası:", error);
    console.log("=".repeat(60) + "\n");
    return false;
  }
}

// ============================================
// YARDIMCI MİGRATİON FONKSİYONLARI
// ============================================

/**
 * Veritabanını yedekle (migration öncesi)
 */
function backupDatabase(db, schoolCode) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup_${schoolCode}_${timestamp}.db`;
    const backupPath = path.join(yedekKlasoru, backupFileName);

    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(backupPath, buffer);

    console.log(`💾 Yedek oluşturuldu: ${backupFileName}`);
    return { success: true, path: backupPath };
  } catch (error) {
    console.error("❌ Yedekleme hatası:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Migration sonrası veritabanı bütünlüğü kontrolü
 */
function verifyDatabaseIntegrity(db) {
  try {
    console.log("🔍 Veritabanı bütünlüğü kontrol ediliyor...");

    // Integrity check
    const integrityStmt = db.prepare("PRAGMA integrity_check");
    let integrityOk = false;

    if (integrityStmt.step()) {
      const result = integrityStmt.getAsObject();
      integrityOk = result.integrity_check === "ok";
    }
    integrityStmt.free();

    if (!integrityOk) {
      console.error("❌ Veritabanı bütünlük kontrolü başarısız!");
      return false;
    }

    // Foreign key check
    const fkStmt = db.prepare("PRAGMA foreign_key_check");
    let fkErrors = 0;

    while (fkStmt.step()) {
      fkErrors++;
    }
    fkStmt.free();

    if (fkErrors > 0) {
      console.warn(`⚠️ ${fkErrors} foreign key hatası tespit edildi`);
    }

    console.log("✅ Veritabanı bütünlük kontrolü başarılı");
    return true;
  } catch (error) {
    console.error("❌ Bütünlük kontrolü hatası:", error);
    return false;
  }
}

/**
 * Veritabanı istatistiklerini göster
 */
function printDatabaseStats(db) {
  try {
    console.log("\n📊 VERİTABANI İSTATİSTİKLERİ");
    console.log("=".repeat(60));

    // Tablo sayısı ve satır sayıları
    const tableStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const tables = [];
    while (tableStmt.step()) {
      tables.push(tableStmt.getAsObject().name);
    }
    tableStmt.free();

    console.log(`📋 Toplam Tablo: ${tables.length}`);
    console.log("\n📊 Tablo Detayları:");

    for (const tableName of tables) {
      try {
        const countStmt = db.prepare(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        let count = 0;

        if (countStmt.step()) {
          count = countStmt.getAsObject().count;
        }
        countStmt.free();

        console.log(`  • ${tableName.padEnd(30)} : ${count} kayıt`);
      } catch (error) {
        console.log(`  • ${tableName.padEnd(30)} : Hata`);
      }
    }

    // Veritabanı boyutu
    const sizeStmt = db.prepare("PRAGMA page_count");
    const pageCountStmt = db.prepare("PRAGMA page_size");

    let pageCount = 0;
    let pageSize = 0;

    if (sizeStmt.step()) {
      pageCount = sizeStmt.getAsObject().page_count;
    }
    sizeStmt.free();

    if (pageCountStmt.step()) {
      pageSize = pageCountStmt.getAsObject().page_size;
    }
    pageCountStmt.free();

    const totalSize = pageCount * pageSize;
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`\n💾 Veritabanı Boyutu: ${sizeMB} MB`);
    console.log("=".repeat(60) + "\n");

    return true;
  } catch (error) {
    console.error("❌ İstatistik hatası:", error);
    return false;
  }
}

// ============================================
// OTOMATİK MİGRATİON TETİKLEME
// ============================================

/**
 * Okul veritabanı yüklendiğinde otomatik migration çalıştır
 */
function autoRunMigrations(db, schoolCode) {
  console.log(`\n🔄 ${schoolCode} için otomatik migration kontrolü...`);

  // Önce yedek al
  const backup = backupDatabase(db, schoolCode);
  if (!backup.success) {
    console.warn("⚠️ Yedekleme başarısız, migration atlanıyor!");
    return false;
  }

  // Migration çalıştır
  const migrationSuccess = runMigrations(db);

  if (migrationSuccess) {
    // Bütünlük kontrolü
    verifyDatabaseIntegrity(db);

    // İstatistikleri göster
    printDatabaseStats(db);
  } else {
    console.error("❌ Migration başarısız!");
    console.log("💡 Yedek dosyası: " + backup.path);
  }

  return migrationSuccess;
}
// ============================================
// 🔐 ŞİFRE HASH SİSTEMİ (PBKDF2)
// ============================================

/**
 * Kullanıcı şifresini hash'le (PBKDF2)
 * @param {string} plainPassword - Düz metin şifre
 * @returns {string} salt:hash formatında hash'lenmiş şifre
 */
function hashUserPassword(plainPassword) {
  try {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(plainPassword, salt, 100000, 64, "sha512")
      .toString("hex");

    return `${salt}:${hash}`;
  } catch (error) {
    console.error("❌ Şifre hash hatası:", error);
    throw new Error("Şifre hash'lenemedi!");
  }
}

/**
 * Hash'lenmiş şifreyi doğrula
 * @param {string} plainPassword - Düz metin şifre
 * @param {string} hashedPassword - salt:hash formatında hash'lenmiş şifre
 * @returns {boolean} Şifre doğru mu?
 */
function verifyUserPassword(plainPassword, hashedPassword) {
  try {
    const [salt, originalHash] = hashedPassword.split(":");

    if (!salt || !originalHash) {
      console.error("❌ Geçersiz hash formatı!");
      return false;
    }

    const hash = crypto
      .pbkdf2Sync(plainPassword, salt, 100000, 64, "sha512")
      .toString("hex");

    return hash === originalHash;
  } catch (error) {
    console.error("❌ Şifre doğrulama hatası:", error);
    return false;
  }
}

console.log("🔐 Şifre hash sistemi yüklendi (PBKDF2 - 100000 iterasyon)");

// ============================================
// OKUL YÖNETİMİ FONKSİYONLARI
// ============================================

/**
 * Yeni okul oluştur (TAM HASH SİSTEMİ + SOFT DELETE KONTROLÜ)
 */
async function createSchool(okulBilgileri) {
  try {
    console.log("🏫 Yeni okul oluşturuluyor:", okulBilgileri.okul_adi);

    // Okul kodu kontrol (sadece rakam)
    if (!/^\d+$/.test(okulBilgileri.okul_kodu)) {
      return {
        success: false,
        message: "Okul kodu sadece rakamlardan oluşmalıdır!",
      };
    }

    // ✅ Okul kodu kontrol (AKTİF + SİLİNMİŞ)
    const checkStmt = masterDB.prepare(
      "SELECT id, durum FROM okullar WHERE okul_kodu = ?"
    );
    checkStmt.bind([okulBilgileri.okul_kodu]);

    if (checkStmt.step()) {
      const existingSchool = checkStmt.getAsObject();
      checkStmt.free();

      // ✅ AKTİF OKUL VAR MI?
      if (existingSchool.durum === 1) {
        return { success: false, message: "Bu okul kodu zaten kayıtlı!" };
      }

      // ✅ SİLİNMİŞ OKUL - YENİDEN AKTİFLEŞTİR
      console.log("⚠️ Silinmiş okul bulundu, yeniden aktifleştiriliyor...");

      const baslangic = new Date();
      const bitis = new Date();
      bitis.setFullYear(bitis.getFullYear() + 1);

      const updateStmt = masterDB.prepare(`
        UPDATE okullar 
        SET okul_adi = ?, sifre = ?, 
            il = ?, ilce = ?, adres = ?, telefon = ?, email = ?,
            yetkili_ad = ?, yetkili_unvan = ?,
            lisans_baslangic = ?, lisans_bitis = ?,
            durum = 1, guncelleme_tarihi = ?
        WHERE id = ?
      `);

      updateStmt.run([
        okulBilgileri.okul_adi,
        okulBilgileri.okul_sifre,
        okulBilgileri.il || "",
        okulBilgileri.ilce || "",
        okulBilgileri.adres || "",
        okulBilgileri.telefon || "",
        okulBilgileri.email || "",
        okulBilgileri.yetkili_ad || "",
        okulBilgileri.yetkili_unvan || "",
        baslangic.toISOString(),
        bitis.toISOString(),
        new Date().toISOString(),
        existingSchool.id,
      ]);
      updateStmt.free();

      saveMasterDB();

      console.log("✅ Silinmiş okul yeniden aktifleştirildi");

      return {
        success: true,
        message: "Okul başarıyla oluşturuldu (yeniden aktifleştirildi)",
        data: {
          okul_kodu: okulBilgileri.okul_kodu,
          admin_kullanici: "admin",
          admin_sifre: okulBilgileri.admin_sifre,
          lisans_bitis: bitis.toLocaleDateString("tr-TR"),
        },
      };
    }
    checkStmt.free();

    // ✅ YENİ OKUL OLUŞTUR (NORMAL AKIŞ)
    const baslangic = new Date();
    const bitis = new Date();
    bitis.setFullYear(bitis.getFullYear() + 1);

    // Okul veritabanı dosya adı
    const dbFileName = `okul_${okulBilgileri.okul_kodu}.db`;
    const dbFilePath = path.join(veritabaniKlasoru, dbFileName);

    // Yeni okul veritabanı oluştur
    const schoolDB = new SQL.Database();
    createSchoolTables(schoolDB);

    // 🚀 Migration'ları çalıştır (v12'ye kadar)
    console.log("🔄 Yeni okul için migration'lar çalıştırılıyor...");
    runMigrations(schoolDB);

    // ✅ Okul admin kullanıcısı oluştur (HASH İLE)
    console.log("👤 Admin kullanıcısı oluşturuluyor (hash ile)...");
    const hashedPassword = hashUserPassword(okulBilgileri.admin_sifre);

    const adminStmt = schoolDB.prepare(`
      INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
      VALUES (?, ?, ?, ?)
    `);
    adminStmt.run(["admin", hashedPassword, "Okul Yöneticisi", "admin"]);
    adminStmt.free();

    console.log("✅ Admin kullanıcısı oluşturuldu (şifre hash'lendi)");

    // Okul veritabanını kaydet
    const data = schoolDB.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
    console.log("✅ Okul veritabanı oluşturuldu:", dbFileName);

    // Master veritabanına okul kaydı ekle
    const insertStmt = masterDB.prepare(`
      INSERT INTO okullar (
        okul_kodu, okul_adi, sifre, veritabani_dosyasi,
        il, ilce, adres, telefon, email,
        yetkili_ad, yetkili_unvan,
        lisans_baslangic, lisans_bitis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run([
      okulBilgileri.okul_kodu,
      okulBilgileri.okul_adi,
      okulBilgileri.okul_sifre,
      dbFileName,
      okulBilgileri.il || "",
      okulBilgileri.ilce || "",
      okulBilgileri.adres || "",
      okulBilgileri.telefon || "",
      okulBilgileri.email || "",
      okulBilgileri.yetkili_ad || "",
      okulBilgileri.yetkili_unvan || "",
      baslangic.toISOString(),
      bitis.toISOString(),
    ]);
    insertStmt.free();

    saveMasterDB();

    console.log("✅ Okul başarıyla oluşturuldu");
    console.log("🔑 Okul Kodu:", okulBilgileri.okul_kodu);
    console.log("👤 Admin Kullanıcı: admin");
    console.log("🔒 Admin Şifre (DÜZ):", okulBilgileri.admin_sifre);
    console.log(
      "🔐 Admin Şifre (HASH):",
      hashedPassword.substring(0, 20) + "..."
    );

    return {
      success: true,
      message: "Okul başarıyla oluşturuldu",
      data: {
        okul_kodu: okulBilgileri.okul_kodu,
        admin_kullanici: "admin",
        admin_sifre: okulBilgileri.admin_sifre,
        lisans_bitis: bitis.toLocaleDateString("tr-TR"),
      },
    };
  } catch (error) {
    console.error("❌ Okul oluşturma hatası:", error);
    return { success: false, message: error.message };
  }
}
/**
 * Okul listesini getir (ŞİFRE DAHİL)
 */
function getAllSchools() {
  try {
    console.log("📋 === GET ALL SCHOOLS (veritabani.js) ===");

    if (!masterDB) {
      console.error("❌ Master DB yok!");
      return { success: false, message: "Master veritabanı yüklenmedi" };
    }

    // ✅ ŞİFRE ALANI EKLENDİ
    const stmt = masterDB.prepare(`
      SELECT 
        id, okul_kodu, okul_adi, sifre, il, ilce,
        yetkili_ad, yetkili_unvan, telefon, email,
        adres, lisans_baslangic, lisans_bitis, durum,
        olusturma_tarihi
      FROM okullar
      WHERE durum = 1
      ORDER BY olusturma_tarihi DESC
    `);

    const schools = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const bitis = new Date(row.lisans_bitis);
      const bugun = new Date();
      const kalanGun = Math.ceil((bitis - bugun) / (1000 * 60 * 60 * 24));

      schools.push({
        ...row,
        lisans_kalan_gun: kalanGun,
        lisans_durumu:
          kalanGun > 30 ? "aktif" : kalanGun > 0 ? "uyari" : "bitmis",
      });
    }
    stmt.free();

    console.log(`✅ ${schools.length} okul bulundu`);

    if (schools.length > 0) {
      console.log("🔑 İlk okul şifresi:", schools[0].sifre || "❌ BOŞ");
    }

    console.log("=".repeat(60));

    return { success: true, data: schools };
  } catch (error) {
    console.error("❌ Okul listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Okul bilgilerini güncelle
 */
function updateSchool(okulId, guncelBilgiler) {
  try {
    console.log("=".repeat(60));
    console.log("✏️ OKUL GÜNCELLEME (veritabani.js)");
    console.log("📋 Okul ID:", okulId);
    console.log("📝 Güncel bilgiler:", guncelBilgiler);

    const checkStmt = masterDB.prepare("SELECT id FROM okullar WHERE id = ?");
    checkStmt.bind([parseInt(okulId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }
    checkStmt.free();

    const updateFields = [];
    const values = [];

    Object.keys(guncelBilgiler).forEach((key) => {
      if (guncelBilgiler[key] !== undefined && key !== "id") {
        updateFields.push(`${key} = ?`);
        values.push(guncelBilgiler[key]);
      }
    });

    updateFields.push("guncelleme_tarihi = ?");
    values.push(new Date().toISOString());
    values.push(parseInt(okulId));

    const sql = `UPDATE okullar SET ${updateFields.join(", ")} WHERE id = ?`;

    console.log("📝 SQL:", sql);
    console.log("📊 Values:", values);

    const stmt = masterDB.prepare(sql);
    stmt.run(values);
    stmt.free();

    // ✅ MASTER DB KAYDET (ÖNEMLİ!)
    saveMasterDB();

    console.log("✅ Okul güncellendi ve Master DB kaydedildi");
    console.log("=".repeat(60));

    return { success: true, message: "Okul başarıyla güncellendi!" };
  } catch (error) {
    console.error("❌ Okul güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Okul sil (HARD DELETE - Kalıcı Silme)
 */
function deleteSchool(okulId) {
  try {
    console.log("🗑️ Okul siliniyor (HARD DELETE):", okulId);

    const checkStmt = masterDB.prepare(
      "SELECT okul_adi, okul_kodu, veritabani_dosyasi FROM okullar WHERE id = ?"
    );
    checkStmt.bind([parseInt(okulId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Okul bulunamadı!" };
    }

    const school = checkStmt.getAsObject();
    checkStmt.free();

    // ✅ MASTER DB'DEN SİL
    const deleteStmt = masterDB.prepare("DELETE FROM okullar WHERE id = ?");
    deleteStmt.run([parseInt(okulId)]);
    deleteStmt.free();

    saveMasterDB();

    // ✅ OKUL VERİTABANI DOSYASINI SİL (OPSİYONEL)
    const dbPath = path.join(veritabaniKlasoru, school.veritabani_dosyasi);
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log(
          "✅ Okul veritabanı dosyası silindi:",
          school.veritabani_dosyasi
        );
      } catch (err) {
        console.warn("⚠️ Okul DB dosyası silinemedi:", err.message);
      }
    }

    console.log("✅ Okul kalıcı olarak silindi:", school.okul_adi);
    return { success: true, message: "Okul kalıcı olarak silindi!" };
  } catch (error) {
    console.error("❌ Okul silme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Okul girişi (HASH DOĞRULAMA İLE)
 */
async function loginSchool(okulKodu, kullaniciAdi, sifre) {
  try {
    console.log("🔐 Giriş denemesi:", okulKodu, kullaniciAdi);

    // 🔒 ERİŞİM KONTROLÜ
    if (
      currentSchoolId &&
      currentSchoolCode &&
      currentSchoolCode !== okulKodu
    ) {
      console.warn("⚠️ Yetkisiz DB erişim denemesi engellendi!");
      return {
        success: false,
        message: "Başka bir okulun veritabanına erişim yetkiniz yok!",
      };
    }

    // 1. Super admin girişi
    if (okulKodu === "000000" || okulKodu === "SISTEM") {
      const stmt = masterDB.prepare(`
        SELECT * FROM sistem_kullanicilar 
        WHERE kullanici_adi = ? AND durum = 1
      `);
      stmt.bind([kullaniciAdi]);

      if (stmt.step()) {
        const user = stmt.getAsObject();
        stmt.free();

        // ✅ HASH KONTROLÜ
        if (!securityManager.verifyPassword(sifre, user.sifre)) {
          return {
            success: false,
            message: "Kullanıcı adı veya şifre hatalı!",
          };
        }

        masterDB.run(
          "UPDATE sistem_kullanicilar SET son_giris = ? WHERE id = ?",
          [new Date().toISOString(), user.id]
        );
        saveMasterDB();

        console.log("✅ Super admin girişi başarılı");
        return {
          success: true,
          userType: "super_admin",
          user: {
            id: user.id,
            kullanici_adi: user.kullanici_adi,
            ad_soyad: user.ad_soyad,
            rol: "super_admin",
          },
        };
      }
      stmt.free();
      return { success: false, message: "Kullanıcı adı veya şifre hatalı!" };
    }

    // 2. Okul kontrolü
    const schoolStmt = masterDB.prepare(`
      SELECT * FROM okullar 
      WHERE okul_kodu = ? AND durum = 1
    `);
    schoolStmt.bind([okulKodu]);

    if (!schoolStmt.step()) {
      schoolStmt.free();
      return {
        success: false,
        message: "Okul bulunamadı! Lütfen önce lisans dosyasını yükleyin.",
      };
    }

    const school = schoolStmt.getAsObject();
    schoolStmt.free();

    // 3. Lisans kontrolü
    let kalanGun = null;
    let lisansBitisTarihi = null;
    let lisansBitisFormatted = null;

    if (school.lisans_bitis) {
      try {
        const bitisTarihi = new Date(school.lisans_bitis);
        const bugun = new Date();

        if (!isNaN(bitisTarihi.getTime())) {
          kalanGun = Math.ceil((bitisTarihi - bugun) / (1000 * 60 * 60 * 24));
          lisansBitisTarihi = bitisTarihi.toISOString();
          lisansBitisFormatted = bitisTarihi.toLocaleDateString("tr-TR");

          console.log(
            `📅 Lisans bitiş: ${lisansBitisFormatted} (${kalanGun} gün kaldı)`
          );

          if (bugun > bitisTarihi) {
            return {
              success: false,
              message: "Lisansınızın süresi dolmuştur!",
            };
          }
        }
      } catch (error) {
        console.error("❌ Lisans tarihi parse edilemedi:", error);
      }
    }

    // 4. 🔥 OKUL VERİTABANI YÖNETİMİ
    const dbPath = path.join(veritabaniKlasoru, school.veritabani_dosyasi);
    let isInitialSetup = false;

    if (!fs.existsSync(dbPath)) {
      console.warn("🚀 [İLK KURULUM]: Veritabanı oluşturuluyor...");
      isInitialSetup = true;

      // A. Yeni DB oluştur
      activeSchoolDB = new SQL.Database();

      // B. Tablo mimarisini inşa et
      createSchoolTables(activeSchoolDB);

      // C. Migration'ları çalıştır (v12'ye kadar)
      console.log("🔄 Tabloları v12'ye güncelliyor...");
      runMigrations(activeSchoolDB);

      // D. ✅ İlk kullanıcıyı yetkilendir (HASH İLE)
      console.log("👤 İlk admin oluşturuluyor (hash ile)...");
      const hashedPassword = hashUserPassword(sifre);

      const insertUserStmt = activeSchoolDB.prepare(`
        INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol)
        VALUES (?, ?, ?, ?)
      `);
      insertUserStmt.run([
        kullaniciAdi,
        hashedPassword,
        "Okul Yöneticisi",
        "admin",
      ]);
      insertUserStmt.free();

      console.log("✅ Admin kullanıcısı oluşturuldu (şifre hash'lendi)");

      // E. Diske mühürle
      const data = activeSchoolDB.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
      console.log("✅ [SİSTEM HAZIR]: Veritabanı dosyası oluşturuldu.");
    } else {
      // Mevcut dosyayı yükle
      console.log("📂 Okul veritabanı yükleniyor:", dbPath);
      const dbData = fs.readFileSync(dbPath);
      activeSchoolDB = new SQL.Database(dbData);
    }

    currentSchoolId = school.id;
    global.currentSchoolDb = activeSchoolDB;

    // 🚀 Migration kontrolü (yeni güncellemelerde tablo ekler)
    autoRunMigrations(activeSchoolDB, school.okul_kodu);

    // 5. ✅ Kullanıcı Login Doğrulaması (HASH KONTROLÜ)
    const userStmt = activeSchoolDB.prepare(`
  SELECT 
    k.id as kullanici_id,
    k.kullanici_adi,
    k.sifre,
    k.rol,
    k.durum,
    o.id as ogretmen_id,
    o.ad_soyad,
    o.tc_no,
    o.brans,
    o.unvan,
    o.gorev,
    o.telefon,
    o.email
  FROM kullanicilar k
  LEFT JOIN ogretmenler o ON k.id = o.kullanici_id
  WHERE k.kullanici_adi = ? AND k.durum = 1
`);
    userStmt.bind([kullaniciAdi]);

    if (!userStmt.step()) {
      userStmt.free();
      activeSchoolDB = null;
      global.currentSchoolDb = null;
      return { success: false, message: "Kullanıcı adı veya şifre hatalı!" };
    }

    const user = userStmt.getAsObject();
    userStmt.free();

    // ✅ ŞİFRE KONTROLÜ (HASH veya DÜZ)
    let sifreDogruMu = false;

    if (user.sifre.includes(":")) {
      // HASH'LENMİŞ ŞİFRE
      console.log("🔐 Hash şifre doğrulaması yapılıyor...");
      sifreDogruMu = verifyUserPassword(sifre, user.sifre);
      console.log("🔐 Hash şifre doğrulaması:", sifreDogruMu ? "✅" : "❌");
    } else {
      // DÜZ ŞİFRE (Geriye dönük uyumluluk)
      console.log("⚠️ Düz şifre tespit edildi");
      sifreDogruMu = sifre === user.sifre;

      // DÜZ ŞİFRE İSE HASH'LE VE GÜNCELLE
      if (sifreDogruMu) {
        console.log("⚠️ Düz şifre hash'leniyor...");
        const hashedPassword = hashUserPassword(sifre);

        const updateStmt = activeSchoolDB.prepare(
          "UPDATE kullanicilar SET sifre = ? WHERE id = ?"
        );
        updateStmt.run([hashedPassword, user.kullanici_id]);
        updateStmt.free();

        saveActiveSchoolDB();
        console.log("✅ Şifre hash'lendi ve güncellendi");
      }
    }

    if (!sifreDogruMu) {
      console.warn("⚠️ [WARN]: Kullanıcı adı veya şifre uyuşmuyor.");
      activeSchoolDB = null;
      global.currentSchoolDb = null;
      return { success: false, message: "Kullanıcı adı veya şifre hatalı!" };
    }

    // 6. ✅ Giriş tarihini güncelle
    activeSchoolDB.run("UPDATE kullanicilar SET son_giris = ? WHERE id = ?", [
      new Date().toISOString(),
      user.kullanici_id,
    ]);
    saveActiveSchoolDB();

    console.log("✅ Giriş başarılı:", user.ad_soyad || user.kullanici_adi);

    // 🔒 Aktif okul kodunu kaydet
    currentSchoolCode = okulKodu;
    console.log(`🔐 Aktif okul kodu ayarlandı: ${okulKodu}`);

    // 7. SONUÇ DÖNDÜR
    return {
      success: true,
      userType: "school_user",
      isInitialSetup: isInitialSetup,
      setupMessage: isInitialSetup
        ? "Sistem ilk kullanım için yapılandırılıyor. Tüm tablolar oluşturuldu."
        : null,
      user: {
        id: user.kullanici_id,
        kullanici_adi: user.kullanici_adi,
        ad_soyad: user.ad_soyad || user.kullanici_adi,
        rol: user.rol,
        tc_no: user.tc_no,
        brans: user.brans,
        unvan: user.unvan,
        gorev: user.gorev,
      },
      school: {
        id: school.id,
        okul_adi: school.okul_adi,
        okul_kodu: school.okul_kodu,
        lisans_bitis: lisansBitisTarihi,
        lisans_bitis_formatted: lisansBitisFormatted,
        kalan_gun: kalanGun,
      },
    };
  } catch (error) {
    console.error("❌ Login hatası:", error);
    activeSchoolDB = null;
    global.currentSchoolDb = null;
    return {
      success: false,
      message: "Giriş sırasında bir hata oluştu: " + error.message,
    };
  }
}

// ============================================
// GETTER FONKSİYONLARI
// ============================================

function getMasterDB() {
  return masterDB;
}

function getActiveSchoolDB() {
  if (!activeSchoolDB) {
    console.error("❌ Aktif okul veritabanı yok!");
    throw new Error("Veritabanı bulunamadı! Lütfen giriş yapın.");
  }

  if (!currentSchoolCode) {
    console.error("❌ Okul kodu belirsiz!");
    throw new Error("Geçersiz oturum! Lütfen tekrar giriş yapın.");
  }

  return activeSchoolDB;
}

function getCurrentSchoolId() {
  return currentSchoolId;
}
// ============================================
// ÖĞRETMEN YÖNETİMİ FONKSİYONLARI
// ============================================

/**
 * Yeni öğretmen ekle
 */
async function createTeacher(ogretmenBilgileri) {
  try {
    console.log("👨‍🏫 Yeni öğretmen ekleniyor:", ogretmenBilgileri.ad_soyad);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    // TC No kontrol
    if (!/^\d{11}$/.test(ogretmenBilgileri.tc_no)) {
      return {
        success: false,
        message: "TC Kimlik No 11 haneli rakamlardan oluşmalıdır!",
      };
    }

    // TC No benzersiz mi
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogretmenler WHERE tc_no = ?"
    );
    checkStmt.bind([ogretmenBilgileri.tc_no]);

    if (checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Bu TC Kimlik No zaten kayıtlı!" };
    }
    checkStmt.free();

    // Kısa ad oluştur
    const kisaAd = generateKisaAd(ogretmenBilgileri.ad_soyad);

    // Otomatik şifre
    const otomatikSifre = generateTeacherPassword();

    // Kullanıcı hesabı oluştur
    const userStmt = activeSchoolDB.prepare(`
      INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, tc_no, rol, durum)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    userStmt.run([
      ogretmenBilgileri.tc_no,
      otomatikSifre,
      ogretmenBilgileri.ad_soyad,
      ogretmenBilgileri.tc_no,
      "ogretmen",
      ogretmenBilgileri.durum || 1,
    ]);
    userStmt.free();

    // Kullanıcı ID'sini al
    const getUserStmt = activeSchoolDB.prepare(
      "SELECT id FROM kullanicilar WHERE tc_no = ?"
    );
    getUserStmt.bind([ogretmenBilgileri.tc_no]);
    let kullaniciId = null;
    if (getUserStmt.step()) {
      kullaniciId = getUserStmt.getAsObject().id;
    }
    getUserStmt.free();

    // Öğretmen kaydını ekle
    const insertStmt = activeSchoolDB.prepare(`
      INSERT INTO ogretmenler (
        kullanici_id, tc_no, ad_soyad, kisa_ad, brans, cinsiyet,
        dogum_tarihi, dogum_yeri, baba_adi,
        unvan, kariyer, gorev, durum, gorev_yeri,
        goreve_baslama, kurumda_baslama,
        ogrenim_durumu, mezun_universite, derece, kademe,
        emekli_sicil_no, kbs_personel_no,
        iban, banka_subesi, yabanci_dil_tazminati, ek_gosterge,
        aile_durumu, cocuk_0_6, cocuk_6_ustu, bes,
        telefon, email, adres,
        ayrilma_tarihi, ayrilis_nedeni
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run([
      kullaniciId,
      ogretmenBilgileri.tc_no,
      ogretmenBilgileri.ad_soyad,
      kisaAd,
      ogretmenBilgileri.brans || null,
      ogretmenBilgileri.cinsiyet,
      ogretmenBilgileri.dogum_tarihi || null,
      ogretmenBilgileri.dogum_yeri || null,
      ogretmenBilgileri.baba_adi || null,
      ogretmenBilgileri.unvan,
      ogretmenBilgileri.kariyer,
      ogretmenBilgileri.gorev,
      ogretmenBilgileri.durum || 1,
      ogretmenBilgileri.gorev_yeri || null,
      ogretmenBilgileri.goreve_baslama || null,
      ogretmenBilgileri.kurumda_baslama || null,
      ogretmenBilgileri.ogrenim_durumu || null,
      ogretmenBilgileri.mezun_universite || null,
      ogretmenBilgileri.derece || null,
      ogretmenBilgileri.kademe || null,
      ogretmenBilgileri.emekli_sicil_no || null,
      ogretmenBilgileri.kbs_personel_no || null,
      ogretmenBilgileri.iban || null,
      ogretmenBilgileri.banka_subesi || null,
      ogretmenBilgileri.yabanci_dil_tazminati || null,
      ogretmenBilgileri.ek_gosterge || null,
      ogretmenBilgileri.aile_durumu || null,
      ogretmenBilgileri.cocuk_0_6 || 0,
      ogretmenBilgileri.cocuk_6_ustu || 0,
      ogretmenBilgileri.bes || null,
      ogretmenBilgileri.telefon || null,
      ogretmenBilgileri.email || null,
      ogretmenBilgileri.adres || null,
      ogretmenBilgileri.ayrilma_tarihi || null,
      ogretmenBilgileri.ayrilis_nedeni || null,
    ]);
    insertStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Öğretmen başarıyla eklendi");

    return {
      success: true,
      message: "Öğretmen başarıyla eklendi",
      data: {
        tc_no: ogretmenBilgileri.tc_no,
        ad_soyad: ogretmenBilgileri.ad_soyad,
        kisa_ad: kisaAd,
        otomatik_sifre: otomatikSifre,
      },
    };
  } catch (error) {
    console.error("❌ Öğretmen ekleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm öğretmenleri getir
 */
function getAllTeachers() {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Öğretmenler listesi istendi");

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM ogretmenler
      WHERE durum = 1
      ORDER BY ad_soyad ASC
    `);

    const teachers = [];
    while (stmt.step()) {
      teachers.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${teachers.length} öğretmen bulundu`);

    return { success: true, data: teachers };
  } catch (error) {
    console.error("❌ Öğretmen listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Öğretmen güncelle
 */
function updateTeacher(ogretmenId, guncelBilgiler) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("✏️ Öğretmen güncelleniyor:", ogretmenId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogretmenler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogretmenId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğretmen bulunamadı!" };
    }
    checkStmt.free();

    const updateFields = [];
    const values = [];

    Object.keys(guncelBilgiler).forEach((key) => {
      if (guncelBilgiler[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(guncelBilgiler[key]);
      }
    });

    updateFields.push("guncelleme_tarihi = ?");
    values.push(new Date().toISOString());
    values.push(parseInt(ogretmenId));

    const sql = `UPDATE ogretmenler SET ${updateFields.join(
      ", "
    )} WHERE id = ?`;

    const stmt = activeSchoolDB.prepare(sql);
    stmt.run(values);
    stmt.free();

    if (guncelBilgiler.ayrilma_tarihi) {
      activeSchoolDB.run("UPDATE ogretmenler SET durum = 0 WHERE id = ?", [
        parseInt(ogretmenId),
      ]);
    }

    saveActiveSchoolDB();

    console.log("✅ Öğretmen güncellendi");

    return {
      success: true,
      message: "Öğretmen başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Öğretmen güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Öğretmen sil
 */
function deleteTeacher(ogretmenId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ Öğretmen siliniyor:", ogretmenId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT ad_soyad, kullanici_id FROM ogretmenler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogretmenId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğretmen bulunamadı!" };
    }

    const row = checkStmt.getAsObject();
    const kullaniciId = row.kullanici_id;
    checkStmt.free();

    const deleteStmt = activeSchoolDB.prepare(
      "UPDATE ogretmenler SET durum = 0, guncelleme_tarihi = ? WHERE id = ?"
    );
    deleteStmt.run([new Date().toISOString(), parseInt(ogretmenId)]);
    deleteStmt.free();

    if (kullaniciId) {
      activeSchoolDB.run("UPDATE kullanicilar SET durum = 0 WHERE id = ?", [
        kullaniciId,
      ]);
    }

    saveActiveSchoolDB();

    console.log("✅ Öğretmen silindi");

    return {
      success: true,
      message: "Öğretmen başarıyla silindi!",
    };
  } catch (error) {
    console.error("❌ Öğretmen silme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Kısa ad oluştur
 */
function generateKisaAd(adSoyad) {
  const parts = adSoyad.trim().toUpperCase().split(" ");
  if (parts.length < 2) {
    return adSoyad.substring(0, 5).toUpperCase();
  }
  const ad = parts[0];
  const soyad = parts[parts.length - 1];
  return `${ad.charAt(0)}.${soyad.substring(0, 3)}`;
}

/**
 * Öğretmen şifresi oluştur
 */
function generateTeacherPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================
// ÖĞRENCİ YÖNETİMİ FONKSİYONLARI
// ============================================

/**
 * Yeni öğrenci ekle
 */
async function createStudent(ogrenciBilgileri) {
  try {
    console.log("👨‍🎓 Yeni öğrenci ekleniyor:", ogrenciBilgileri.ad_soyad);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    if (!ogrenciBilgileri.ad_soyad || !ogrenciBilgileri.okul_no) {
      return {
        success: false,
        message: "Ad Soyad ve Okul No zorunludur!",
      };
    }

    if (ogrenciBilgileri.tc_no && !/^\d{11}$/.test(ogrenciBilgileri.tc_no)) {
      return {
        success: false,
        message: "TC Kimlik No 11 haneli rakamlardan oluşmalıdır!",
      };
    }

    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogrenciler WHERE okul_no = ?"
    );
    checkStmt.bind([ogrenciBilgileri.okul_no]);

    if (checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Bu okul numarası zaten kayıtlı!" };
    }
    checkStmt.free();

    const insertStmt = activeSchoolDB.prepare(`
      INSERT INTO ogrenciler (
        tc_no, okul_no, ad, soyad, ad_soyad, sinif, cinsiyet,
        alan, dal, durum, dogum_yeri, dogum_tarihi,
        fotograf_path, anne_ad_soyad, anne_telefon,
        baba_ad_soyad, baba_telefon
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const adParts = ogrenciBilgileri.ad_soyad.trim().split(" ");
    const ad = adParts[0] || "";
    const soyad = adParts.slice(1).join(" ") || "";

    insertStmt.run([
      ogrenciBilgileri.tc_no || null,
      ogrenciBilgileri.okul_no,
      ad,
      soyad,
      ogrenciBilgileri.ad_soyad,
      ogrenciBilgileri.sinif || null,
      ogrenciBilgileri.cinsiyet || null,
      ogrenciBilgileri.alan || null,
      ogrenciBilgileri.dal || null,
      ogrenciBilgileri.durum || 1,
      ogrenciBilgileri.dogum_yeri || null,
      ogrenciBilgileri.dogum_tarihi || null,
      ogrenciBilgileri.fotograf_path || null,
      ogrenciBilgileri.anne_ad_soyad || null,
      ogrenciBilgileri.anne_telefon || null,
      ogrenciBilgileri.baba_ad_soyad || null,
      ogrenciBilgileri.baba_telefon || null,
    ]);
    insertStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Öğrenci başarıyla eklendi");

    return {
      success: true,
      message: "Öğrenci başarıyla eklendi",
      data: {
        okul_no: ogrenciBilgileri.okul_no,
        ad_soyad: ogrenciBilgileri.ad_soyad,
        sinif: ogrenciBilgileri.sinif,
      },
    };
  } catch (error) {
    console.error("❌ Öğrenci ekleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm öğrencileri getir
 */
function getAllStudents() {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Öğrenci listesi istendi");

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM ogrenciler
      WHERE durum = 1
      ORDER BY sinif, ad_soyad ASC
    `);

    const students = [];
    while (stmt.step()) {
      students.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${students.length} öğrenci bulundu`);

    return { success: true, data: students };
  } catch (error) {
    console.error("❌ Öğrenci listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Öğrenci güncelle
 */
function updateStudent(ogrenciId, guncelBilgiler) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("✏️ Öğrenci güncelleniyor:", ogrenciId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogrenciler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogrenciId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğrenci bulunamadı!" };
    }
    checkStmt.free();

    const updateFields = [];
    const values = [];

    Object.keys(guncelBilgiler).forEach((key) => {
      if (guncelBilgiler[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(guncelBilgiler[key]);
      }
    });

    values.push(parseInt(ogrenciId));

    const sql = `UPDATE ogrenciler SET ${updateFields.join(", ")} WHERE id = ?`;

    const stmt = activeSchoolDB.prepare(sql);
    stmt.run(values);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Öğrenci güncellendi");

    return {
      success: true,
      message: "Öğrenci başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Öğrenci güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Öğrenci sil (HARD DELETE - Kalıcı Silme)
 */
function deleteStudent(ogrenciId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ Öğrenci siliniyor (HARD DELETE):", ogrenciId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT ad_soyad, okul_no FROM ogrenciler WHERE id = ?"
    );
    checkStmt.bind([parseInt(ogrenciId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Öğrenci bulunamadı!" };
    }

    const student = checkStmt.getAsObject();
    checkStmt.free();

    // ✅ KALICI SİLME
    const deleteStmt = activeSchoolDB.prepare(
      "DELETE FROM ogrenciler WHERE id = ?"
    );
    deleteStmt.run([parseInt(ogrenciId)]);
    deleteStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Öğrenci kalıcı olarak silindi:", student.ad_soyad);

    return {
      success: true,
      message: "Öğrenci kalıcı olarak silindi!",
    };
  } catch (error) {
    console.error("❌ Öğrenci silme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Excel'den öğrenci import
 */
async function importStudentsFromExcel(excelData) {
  try {
    console.log("📥 Excel'den öğrenci import ediliyor...");

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    if (!Array.isArray(excelData) || excelData.length === 0) {
      return { success: false, message: "Geçerli veri bulunamadı!" };
    }

    let basarili = 0;
    let hatali = 0;
    const hatalar = [];

    for (const row of excelData) {
      try {
        if (!row.ad_soyad || !row.okul_no) {
          hatali++;
          hatalar.push(`${row.ad_soyad || "?"} - Ad/Soyad veya Okul No eksik`);
          continue;
        }

        const result = await createStudent(row);

        if (result.success) {
          basarili++;
        } else {
          hatali++;
          hatalar.push(`${row.ad_soyad} - ${result.message}`);
        }
      } catch (error) {
        hatali++;
        hatalar.push(`${row.ad_soyad || "?"} - ${error.message}`);
      }
    }

    console.log(`✅ Import tamamlandı: ${basarili} başarılı, ${hatali} hatalı`);

    return {
      success: true,
      message: `${basarili} öğrenci başarıyla eklendi!`,
      data: {
        basarili,
        hatali,
        hatalar,
      },
    };
  } catch (error) {
    console.error("❌ Excel import hatası:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// SINIF YÖNETİMİ FONKSİYONLARI
// ============================================

/**
 * Yeni sınıf ekle
 */
async function createClass(sinifBilgileri) {
  try {
    console.log("🏫 Yeni sınıf ekleniyor:", sinifBilgileri.sinif_adi);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM siniflar WHERE sinif_duzey = ? AND sube = ?"
    );
    checkStmt.bind([sinifBilgileri.sinif_duzey, sinifBilgileri.sube]);

    if (checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Bu sınıf zaten kayıtlı!" };
    }
    checkStmt.free();

    const insertStmt = activeSchoolDB.prepare(`
      INSERT INTO siniflar (
        sinif_adi, sinif_duzey, sube, alan,
        sinif_ogretmeni_id, mudur_yardimcisi_id, rehber_ogretmen_id,
        ogrenci_sayisi, erkek_sayisi, kiz_sayisi, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)
    `);

    insertStmt.run([
      sinifBilgileri.sinif_adi,
      sinifBilgileri.sinif_duzey,
      sinifBilgileri.sube,
      sinifBilgileri.alan || null,
      sinifBilgileri.sinif_ogretmeni_id || null,
      sinifBilgileri.mudur_yardimcisi_id || null,
      sinifBilgileri.rehber_ogretmen_id || null,
    ]);
    insertStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Sınıf eklendi:", sinifBilgileri.sinif_adi);

    return {
      success: true,
      message: "Sınıf başarıyla eklendi",
      data: {
        sinif_adi: sinifBilgileri.sinif_adi,
      },
    };
  } catch (error) {
    console.error("❌ Sınıf ekleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm sınıfları getir
 */
function getAllClasses() {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Sınıf listesi istendi");

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM siniflar
      WHERE durum = 1
      ORDER BY sinif_duzey, sube ASC
    `);

    const classes = [];
    while (stmt.step()) {
      classes.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${classes.length} sınıf bulundu`);

    return { success: true, data: classes };
  } catch (error) {
    console.error("❌ Sınıf listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Sınıf güncelle
 */
function updateClass(sinifId, guncelBilgiler) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("✏️ Sınıf güncelleniyor:", sinifId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM siniflar WHERE id = ?"
    );
    checkStmt.bind([parseInt(sinifId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Sınıf bulunamadı!" };
    }
    checkStmt.free();

    const updateFields = [];
    const values = [];

    Object.keys(guncelBilgiler).forEach((key) => {
      if (guncelBilgiler[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(guncelBilgiler[key]);
      }
    });

    updateFields.push("guncelleme_tarihi = ?");
    values.push(new Date().toISOString());
    values.push(parseInt(sinifId));

    const sql = `UPDATE siniflar SET ${updateFields.join(", ")} WHERE id = ?`;

    const stmt = activeSchoolDB.prepare(sql);
    stmt.run(values);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Sınıf güncellendi");

    return {
      success: true,
      message: "Sınıf başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Sınıf güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Sınıf sil (KALICI - Hard Delete)
 */
function deleteClass(sinifId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ KALICI silme işlemi başlatıldı:", sinifId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM siniflar WHERE id = ?"
    );
    checkStmt.bind([parseInt(sinifId)]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (!exists) {
      return { success: false, message: "Sınıf bulunamadı!" };
    }

    // 🔥 Gerçek silme işlemi
    const deleteStmt = activeSchoolDB.prepare(
      "DELETE FROM siniflar WHERE id = ?"
    );
    deleteStmt.run([parseInt(sinifId)]);
    deleteStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Sınıf tamamen silindi:", sinifId);

    return {
      success: true,
      message: "Sınıf kalıcı olarak silindi!",
    };
  } catch (error) {
    console.error("❌ Sınıf kalıcı silme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Sınıf istatistikleri getir
 */
function getStatsForClass(sinifAdi) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📊 Sınıf istatistikleri getiriliyor:", sinifAdi);

    const stmt = activeSchoolDB.prepare(`
      SELECT 
        COUNT(*) as toplam,
        SUM(CASE WHEN cinsiyet = 'Erkek' THEN 1 ELSE 0 END) as erkek,
        SUM(CASE WHEN cinsiyet = 'Kız' THEN 1 ELSE 0 END) as kiz
      FROM ogrenciler
      WHERE sinif = ? AND durum = 1
    `);
    stmt.bind([sinifAdi]);

    let stats = { toplam: 0, erkek: 0, kiz: 0 };
    if (stmt.step()) {
      stats = stmt.getAsObject();
    }
    stmt.free();

    return { success: true, data: stats };
  } catch (error) {
    console.error("❌ İstatistik hatası:", error);
    return { success: false, message: error.message };
  }
}
// ============================================
// DERS YÖNETİMİ FONKSİYONLARI
// ============================================

/**
 * Tüm dersleri getir
 */
function getAllDersler() {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📚 Dersler listesi istendi");

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM dersler
      WHERE durum = 1
      ORDER BY ders_adi ASC
    `);

    const dersler = [];
    while (stmt.step()) {
      dersler.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${dersler.length} ders bulundu`);
    return { success: true, data: dersler };
  } catch (error) {
    console.error("❌ Ders listesi hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Ders ekle
 */
function addDers(dersData) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📚 Yeni ders ekleniyor:", dersData.ders_adi);

    const stmt = activeSchoolDB.prepare(`
      INSERT INTO dersler (
        ders_adi, ders_kodu, sinif_seviyeleri, alan, brans,
        ders_turu, secmeli_grup, haftalik_saat, ders_blogu,
        ders_rengi, notlar, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run([
      dersData.ders_adi,
      dersData.ders_kodu,
      dersData.sinif_seviyeleri || null,
      dersData.alan || null,
      dersData.brans,
      dersData.ders_turu || "Ortak",
      dersData.secmeli_grup || null,
      dersData.haftalik_saat,
      dersData.ders_blogu || "YOK",
      dersData.ders_rengi || null,
      dersData.notlar || null,
    ]);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Ders eklendi");
    return { success: true, message: "Ders başarıyla eklendi!" };
  } catch (error) {
    console.error("❌ Ders ekleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Ders güncelle
 */
function updateDers(dersData) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("✏️ Ders güncelleniyor:", dersData.id);

    const stmt = activeSchoolDB.prepare(`
      UPDATE dersler SET
        ders_adi = ?,
        ders_kodu = ?,
        sinif_seviyeleri = ?,
        alan = ?,
        brans = ?,
        ders_turu = ?,
        secmeli_grup = ?,
        haftalik_saat = ?,
        ders_blogu = ?,
        ders_rengi = ?,
        notlar = ?,
        guncelleme_tarihi = ?
      WHERE id = ?
    `);

    stmt.run([
      dersData.ders_adi,
      dersData.ders_kodu,
      dersData.sinif_seviyeleri || null,
      dersData.alan || null,
      dersData.brans,
      dersData.ders_turu || "Ortak",
      dersData.secmeli_grup || null,
      dersData.haftalik_saat,
      dersData.ders_blogu || "YOK",
      dersData.ders_rengi || null,
      dersData.notlar || null,
      new Date().toISOString(),
      parseInt(dersData.id),
    ]);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Ders güncellendi");
    return { success: true, message: "Ders başarıyla güncellendi!" };
  } catch (error) {
    console.error("❌ Ders güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Ders sil
 */
function deleteDers(dersId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ Ders siliniyor:", dersId);

    activeSchoolDB.run(
      "UPDATE dersler SET durum = 0, guncelleme_tarihi = ? WHERE id = ?",
      [new Date().toISOString(), parseInt(dersId)]
    );

    saveActiveSchoolDB();

    console.log("✅ Ders silindi");
    return { success: true, message: "Ders başarıyla silindi!" };
  } catch (error) {
    console.error("❌ Ders silme hatası:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// DERS PROGRAMI YÖNETİMİ
// ============================================

/**
 * Yeni ders programı oluştur
 */
async function createDersProgram(programBilgileri, hucreVerileri = []) {
  try {
    console.log(
      "📅 Yeni ders programı oluşturuluyor:",
      programBilgileri.program_adi
    );

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    if (!programBilgileri.sinif_id || !programBilgileri.program_adi) {
      return {
        success: false,
        message: "Sınıf ve program adı zorunludur!",
      };
    }

    // Aynı sınıf için aktif program var mı kontrol et
    const checkStmt = activeSchoolDB.prepare(`
      SELECT id, program_adi FROM ders_programlari 
      WHERE sinif_id = ? AND durum = 1
    `);
    checkStmt.bind([programBilgileri.sinif_id]);

    if (checkStmt.step()) {
      const mevcut = checkStmt.getAsObject();
      checkStmt.free();
      return {
        success: false,
        message: `Bu sınıf için zaten aktif bir program var: ${mevcut.program_adi}`,
      };
    }
    checkStmt.free();

    // Ana program kaydını oluştur
    const insertStmt = activeSchoolDB.prepare(`
      INSERT INTO ders_programlari (
        sinif_id, program_adi, donem, akademik_yil,
        hafta_gunu, gunluk_ders_sayisi, ders_suresi, teneffus_suresi,
        baslangic_saati, ogle_arasi_var, ogle_arasi_ders_sonrasi,
        ogle_arasi_suresi, olusturan_kullanici_id, notlar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run([
      programBilgileri.sinif_id,
      programBilgileri.program_adi,
      programBilgileri.donem || "Güz",
      programBilgileri.akademik_yil ||
        new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      programBilgileri.hafta_gunu || 5,
      programBilgileri.gunluk_ders_sayisi || 8,
      programBilgileri.ders_suresi || 40,
      programBilgileri.teneffus_suresi || 10,
      programBilgileri.baslangic_saati || "08:00",
      programBilgileri.ogle_arasi_var || 0,
      programBilgileri.ogle_arasi_ders_sonrasi || 4,
      programBilgileri.ogle_arasi_suresi || 60,
      programBilgileri.olusturan_kullanici_id || null,
      programBilgileri.notlar || null,
    ]);
    insertStmt.free();

    // Oluşturulan program ID'sini al
    const getIdStmt = activeSchoolDB.prepare(
      "SELECT last_insert_rowid() as id"
    );
    getIdStmt.step();
    const programId = getIdStmt.getAsObject().id;
    getIdStmt.free();

    // Hücre verilerini kaydet (BLOK DESTEĞİYLE)
    if (hucreVerileri && hucreVerileri.length > 0) {
      const detayStmt = activeSchoolDB.prepare(`
        INSERT INTO program_detaylar (
          program_id, gun, saat, ders_id, ogretmen_id, 
          blok_id, blok_index, blok_buyukluk,
          renk, notlar
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const hucre of hucreVerileri) {
        if (hucre.gun && hucre.saat) {
          detayStmt.run([
            programId,
            hucre.gun,
            hucre.saat,
            hucre.ders_id || null,
            hucre.ogretmen_id || null,
            hucre.blok_id || null,
            hucre.blok_index || 0,
            hucre.blok_buyukluk || 1,
            hucre.renk || null,
            hucre.notlar || null,
          ]);
        }
      }
      detayStmt.free();
    }

    saveActiveSchoolDB();

    console.log("✅ Ders programı oluşturuldu, ID:", programId);

    return {
      success: true,
      message: "Ders programı başarıyla oluşturuldu!",
      data: {
        program_id: programId,
        program_adi: programBilgileri.program_adi,
      },
    };
  } catch (error) {
    console.error("❌ Ders programı oluşturma hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Ders programını getir (detaylarıyla birlikte)
 */
function getDersProgram(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Ders programı getiriliyor, ID:", programId);

    // Ana program bilgisi
    const programStmt = activeSchoolDB.prepare(`
      SELECT 
        dp.*,
        s.sinif_adi,
        k.ad_soyad as olusturan_ad
      FROM ders_programlari dp
      LEFT JOIN siniflar s ON dp.sinif_id = s.id
      LEFT JOIN kullanicilar k ON dp.olusturan_kullanici_id = k.id
      WHERE dp.id = ?
    `);
    programStmt.bind([parseInt(programId)]);

    if (!programStmt.step()) {
      programStmt.free();
      return { success: false, message: "Program bulunamadı!" };
    }

    const program = programStmt.getAsObject();
    programStmt.free();

    // Program detayları (hücreler - BLOK BİLGİLERİYLE)
    const detayStmt = activeSchoolDB.prepare(`
      SELECT 
        pd.*,
        d.ders_adi,
        d.ders_kodu,
        o.ad_soyad as ogretmen_adi,
        o.kisa_ad
      FROM program_detaylar pd
      LEFT JOIN dersler d ON pd.ders_id = d.id
      LEFT JOIN ogretmenler o ON pd.ogretmen_id = o.id
      WHERE pd.program_id = ?
      ORDER BY pd.gun, pd.saat
    `);
    detayStmt.bind([parseInt(programId)]);

    const detaylar = [];
    while (detayStmt.step()) {
      detaylar.push(detayStmt.getAsObject());
    }
    detayStmt.free();

    console.log(
      `✅ Program getirildi: ${program.program_adi}, ${detaylar.length} hücre`
    );

    return {
      success: true,
      data: {
        program,
        detaylar,
      },
    };
  } catch (error) {
    console.error("❌ Program getirme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Sınıfa göre ders programını getir
 */
function getDersProgramBySinif(sinifId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Sınıf programı getiriliyor, Sınıf ID:", sinifId);

    // Aktif programı bul
    const programStmt = activeSchoolDB.prepare(`
      SELECT 
        dp.*,
        s.sinif_adi
      FROM ders_programlari dp
      LEFT JOIN siniflar s ON dp.sinif_id = s.id
      WHERE dp.sinif_id = ? AND dp.durum = 1
      ORDER BY dp.olusturma_tarihi DESC
      LIMIT 1
    `);
    programStmt.bind([parseInt(sinifId)]);

    if (!programStmt.step()) {
      programStmt.free();
      return {
        success: false,
        message: "Bu sınıf için aktif program bulunamadı!",
      };
    }

    const program = programStmt.getAsObject();
    programStmt.free();

    // Program detaylarını getir
    return getDersProgram(program.id);
  } catch (error) {
    console.error("❌ Sınıf programı getirme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm ders programlarını listele
 */
function getAllDersProgramlari(sadeceDurumAktif = false) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Tüm ders programları listeleniyor...");

    const whereClause = sadeceDurumAktif ? "WHERE dp.durum = 1" : "";

    const stmt = activeSchoolDB.prepare(`
      SELECT 
        dp.*,
        s.sinif_adi,
        k.ad_soyad as olusturan_ad,
        COUNT(pd.id) as dolu_hucre_sayisi
      FROM ders_programlari dp
      LEFT JOIN siniflar s ON dp.sinif_id = s.id
      LEFT JOIN kullanicilar k ON dp.olusturan_kullanici_id = k.id
      LEFT JOIN program_detaylar pd ON dp.id = pd.program_id AND pd.ders_id IS NOT NULL
      ${whereClause}
      GROUP BY dp.id
      ORDER BY dp.olusturma_tarihi DESC
    `);

    const programlar = [];
    while (stmt.step()) {
      programlar.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`✅ ${programlar.length} program bulundu`);

    return { success: true, data: programlar };
  } catch (error) {
    console.error("❌ Program listeleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Ders programını güncelle (BLOK DESTEĞİYLE)
 */
async function updateDersProgram(
  programId,
  guncelBilgiler,
  yeniHucreler = null
) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("✏️ Ders programı güncelleniyor, ID:", programId);

    // Program var mı kontrol et
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ders_programlari WHERE id = ?"
    );
    checkStmt.bind([parseInt(programId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Program bulunamadı!" };
    }
    checkStmt.free();

    // Ana program bilgilerini güncelle
    if (guncelBilgiler && Object.keys(guncelBilgiler).length > 0) {
      const updateFields = [];
      const values = [];

      Object.keys(guncelBilgiler).forEach((key) => {
        if (guncelBilgiler[key] !== undefined && key !== "id") {
          updateFields.push(`${key} = ?`);
          values.push(guncelBilgiler[key]);
        }
      });

      updateFields.push("guncelleme_tarihi = ?");
      values.push(new Date().toISOString());
      values.push(parseInt(programId));

      const sql = `UPDATE ders_programlari SET ${updateFields.join(
        ", "
      )} WHERE id = ?`;

      const stmt = activeSchoolDB.prepare(sql);
      stmt.run(values);
      stmt.free();
    }

    // Hücre verilerini güncelle (BLOK DESTEĞİYLE)
    if (yeniHucreler && Array.isArray(yeniHucreler)) {
      // Önce mevcut detayları sil
      activeSchoolDB.run("DELETE FROM program_detaylar WHERE program_id = ?", [
        parseInt(programId),
      ]);

      // Yeni detayları ekle
      const detayStmt = activeSchoolDB.prepare(`
        INSERT INTO program_detaylar (
          program_id, gun, saat, ders_id, ogretmen_id, 
          blok_id, blok_index, blok_buyukluk,
          renk, notlar
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const hucre of yeniHucreler) {
        if (hucre.gun && hucre.saat) {
          detayStmt.run([
            parseInt(programId),
            hucre.gun,
            hucre.saat,
            hucre.ders_id || null,
            hucre.ogretmen_id || null,
            hucre.blok_id || null,
            hucre.blok_index || 0,
            hucre.blok_buyukluk || 1,
            hucre.renk || null,
            hucre.notlar || null,
          ]);
        }
      }
      detayStmt.free();
    }

    saveActiveSchoolDB();

    console.log("✅ Ders programı güncellendi");

    return {
      success: true,
      message: "Ders programı başarıyla güncellendi!",
    };
  } catch (error) {
    console.error("❌ Program güncelleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Ders programını sil (soft delete)
 */
function deleteDersProgram(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ Ders programı siliniyor, ID:", programId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT program_adi FROM ders_programlari WHERE id = ?"
    );
    checkStmt.bind([parseInt(programId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Program bulunamadı!" };
    }

    const programAdi = checkStmt.getAsObject().program_adi;
    checkStmt.free();

    // Soft delete
    const deleteStmt = activeSchoolDB.prepare(`
      UPDATE ders_programlari 
      SET durum = 0, silme_tarihi = ?, guncelleme_tarihi = ?
      WHERE id = ?
    `);
    deleteStmt.run([
      new Date().toISOString(),
      new Date().toISOString(),
      parseInt(programId),
    ]);
    deleteStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Ders programı silindi:", programAdi);

    return {
      success: true,
      message: "Ders programı başarıyla silindi!",
      data: { program_adi: programAdi },
    };
  } catch (error) {
    console.error("❌ Program silme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Silinen programı geri getir
 */
function restoreDersProgram(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("♻️ Ders programı geri getiriliyor, ID:", programId);

    const checkStmt = activeSchoolDB.prepare(
      "SELECT program_adi, durum FROM ders_programlari WHERE id = ?"
    );
    checkStmt.bind([parseInt(programId)]);

    if (!checkStmt.step()) {
      checkStmt.free();
      return { success: false, message: "Program bulunamadı!" };
    }

    const row = checkStmt.getAsObject();
    checkStmt.free();

    if (row.durum === 1) {
      return { success: false, message: "Program zaten aktif!" };
    }

    // Programı geri getir
    const restoreStmt = activeSchoolDB.prepare(`
      UPDATE ders_programlari 
      SET durum = 1, silme_tarihi = NULL, guncelleme_tarihi = ?
      WHERE id = ?
    `);
    restoreStmt.run([new Date().toISOString(), parseInt(programId)]);
    restoreStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Ders programı geri getirildi:", row.program_adi);

    return {
      success: true,
      message: "Ders programı başarıyla geri getirildi!",
      data: { program_adi: row.program_adi },
    };
  } catch (error) {
    console.error("❌ Program geri getirme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Programı tamamen sil (hard delete)
 */
function hardDeleteDersProgram(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("💥 KALICI SİLME: Program tamamen siliniyor, ID:", programId);

    // İlişkili kayıtları sil
    activeSchoolDB.run("DELETE FROM program_detaylar WHERE program_id = ?", [
      parseInt(programId),
    ]);
    activeSchoolDB.run("DELETE FROM algorithm_config WHERE program_id = ?", [
      parseInt(programId),
    ]);
    activeSchoolDB.run("DELETE FROM solution_variants WHERE program_id = ?", [
      parseInt(programId),
    ]);
    activeSchoolDB.run("DELETE FROM performance_metrics WHERE program_id = ?", [
      parseInt(programId),
    ]);

    // Ana kaydı sil
    activeSchoolDB.run("DELETE FROM ders_programlari WHERE id = ?", [
      parseInt(programId),
    ]);

    saveActiveSchoolDB();

    console.log("✅ Program kalıcı olarak silindi");

    return {
      success: true,
      message: "Program kalıcı olarak silindi!",
    };
  } catch (error) {
    console.error("❌ Kalıcı silme hatası:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// 📅 BASİT PROGRAM OLUŞTURMA (DÜZELTME)
// ============================================

/**
 * Basit program oluştur (sadece ayarlar, hücre yok)
 */
async function createDersProgramBasit(programBilgileri) {
  try {
    console.log("📅 createDersProgramBasit çağrıldı");
    console.log("📊 Program bilgileri:", programBilgileri);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    if (!programBilgileri.program_adi) {
      return {
        success: false,
        message: "Program adı zorunludur!",
      };
    }

    // Akademik yıl oluştur
    const simdi = new Date();
    const akademikYil = simdi.getFullYear() + "-" + (simdi.getFullYear() + 1);

    // ✅ TÜM DEĞERLERİ KONTROL ET VE VARSAYILAN VER
    const sinifId = programBilgileri.sinif_id || null;
    const programAdi =
      programBilgileri.program_adi ||
      `Program ${simdi.toLocaleDateString("tr-TR")}`;
    const donem = programBilgileri.donem || "Güz";
    const haftaGunu = parseInt(programBilgileri.hafta_gunu) || 5;
    const gunlukDersSayisi = parseInt(programBilgileri.gunluk_ders_sayisi) || 8;
    const dersSuresi = parseInt(programBilgileri.ders_suresi) || 40;
    const teneffusSuresi = parseInt(programBilgileri.teneffus_suresi) || 10;
    const baslangicSaati = programBilgileri.baslangic_saati || "08:00";
    const ogleArasiVar = programBilgileri.ogle_arasi_var ? 1 : 0;
    const ogleArasiDersSonrasi =
      parseInt(programBilgileri.ogle_arasi_ders_sonrasi) || 4;
    const ogleArasiSuresi = parseInt(programBilgileri.ogle_arasi_suresi) || 60;
    const notlar = programBilgileri.notlar || "Akıllı Asistan ile oluşturuldu";

    console.log("✅ Parametreler hazırlandı:", {
      sinifId,
      programAdi,
      donem,
      akademikYil,
      haftaGunu,
      gunlukDersSayisi,
      dersSuresi,
      teneffusSuresi,
      baslangicSaati,
      ogleArasiVar,
      ogleArasiDersSonrasi,
      ogleArasiSuresi,
      notlar,
    });

    // Program kaydını oluştur
    const insertStmt = activeSchoolDB.prepare(`
      INSERT INTO ders_programlari (
        sinif_id, program_adi, donem, akademik_yil,
        hafta_gunu, gunluk_ders_sayisi, ders_suresi, teneffus_suresi,
        baslangic_saati, ogle_arasi_var, ogle_arasi_ders_sonrasi,
        ogle_arasi_suresi, notlar, durum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertStmt.run([
      sinifId,
      programAdi,
      donem,
      akademikYil,
      haftaGunu,
      gunlukDersSayisi,
      dersSuresi,
      teneffusSuresi,
      baslangicSaati,
      ogleArasiVar,
      ogleArasiDersSonrasi,
      ogleArasiSuresi,
      notlar,
    ]);
    insertStmt.free();

    // Program ID'sini al
    const getIdStmt = activeSchoolDB.prepare(
      "SELECT last_insert_rowid() as id"
    );
    getIdStmt.step();
    const programId = getIdStmt.getAsObject().id;
    getIdStmt.free();

    saveActiveSchoolDB();

    console.log("✅ Basit program başarıyla oluşturuldu, ID:", programId);

    return {
      success: true,
      message: "Program başarıyla oluşturuldu!",
      data: {
        program_id: programId,
        program_adi: programAdi,
      },
    };
  } catch (error) {
    console.error("❌ createDersProgramBasit hatası:", error);
    console.error("❌ Hata detayı:", error.stack);
    return { success: false, message: error.message };
  }
}

/**
 * Öğretmen çakışma kontrolü
 */
function checkCakisma(ogretmenId, gun, saat, haricProgramId = null) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const whereClause = haricProgramId ? "AND dp.id != ?" : "";

    const stmt = activeSchoolDB.prepare(`
      SELECT 
        dp.id as program_id,
        dp.program_adi,
        s.sinif_adi,
        pd.gun,
        pd.saat,
        d.ders_adi
      FROM program_detaylar pd
      JOIN ders_programlari dp ON pd.program_id = dp.id
      JOIN siniflar s ON dp.sinif_id = s.id
      LEFT JOIN dersler d ON pd.ders_id = d.id
      WHERE pd.ogretmen_id = ? 
        AND pd.gun = ? 
        AND pd.saat = ?
        AND dp.durum = 1
        ${whereClause}
    `);

    const params = haricProgramId
      ? [
          parseInt(ogretmenId),
          parseInt(gun),
          parseInt(saat),
          parseInt(haricProgramId),
        ]
      : [parseInt(ogretmenId), parseInt(gun), parseInt(saat)];

    stmt.bind(params);

    const cakismalar = [];
    while (stmt.step()) {
      cakismalar.push(stmt.getAsObject());
    }
    stmt.free();

    if (cakismalar.length > 0) {
      console.log(
        `⚠️ Öğretmen çakışması tespit edildi: ${cakismalar.length} adet`
      );

      return {
        success: false,
        cakisma: true,
        message: "Öğretmen çakışması tespit edildi!",
        data: cakismalar,
      };
    }

    return {
      success: true,
      cakisma: false,
      message: "Çakışma yok",
    };
  } catch (error) {
    console.error("❌ Çakışma kontrolü hatası:", error);
    return { success: false, message: error.message };
  }
}
// ============================================
// 🎯 KISITLAR YÖNETİMİ
// ============================================

/**
 * Genel kısıtları kaydet
 */
async function saveGenelKisitlar(programId, kisitlar) {
  try {
    console.log("🎯 Genel kısıtlar kaydediliyor, Program ID:", programId);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    // Önce mevcut genel kısıtları sil
    activeSchoolDB.run(
      "DELETE FROM kisitlar WHERE program_id = ? AND kisit_turu = 'genel'",
      [parseInt(programId)]
    );

    // Yeni genel kısıt ekle
    const stmt = activeSchoolDB.prepare(`
      INSERT INTO kisitlar (
        program_id, kisit_turu, min_gunluk_ders, max_gunluk_ders,
        max_bos_pencere, ayni_gun_ayni_sinif, blok_farkli_gun,
        tek_saat_yasak, tum_ogretmenlere_uygula
      ) VALUES (?, 'genel', ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      parseInt(programId),
      kisitlar.min_gunluk_ders || 2,
      kisitlar.max_gunluk_ders || 8,
      kisitlar.max_bos_pencere || 2,
      kisitlar.ayni_gun_ayni_sinif || 0,
      kisitlar.blok_farkli_gun || 1,
      kisitlar.tek_saat_yasak || 1,
      kisitlar.tum_ogretmenlere_uygula ? 1 : 0,
    ]);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Genel kısıtlar kaydedildi");
    return { success: true, message: "Genel kısıtlar başarıyla kaydedildi!" };
  } catch (error) {
    console.error("❌ Genel kısıt kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Öğretmen bazlı kısıt kaydet
 */
async function saveOgretmenKisit(programId, ogretmenId, kisitlar) {
  try {
    console.log("👨‍🏫 Öğretmen kısıtı kaydediliyor:", ogretmenId);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    // Varsa güncelle, yoksa ekle
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM kisitlar WHERE program_id = ? AND ogretmen_id = ? AND kisit_turu = 'ogretmen'"
    );
    checkStmt.bind([parseInt(programId), parseInt(ogretmenId)]);

    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      // Güncelle
      const updateStmt = activeSchoolDB.prepare(`
        UPDATE kisitlar SET
          min_gunluk_ders = ?,
          max_gunluk_ders = ?,
          max_bos_pencere = ?,
          guncelleme_tarihi = ?
        WHERE program_id = ? AND ogretmen_id = ? AND kisit_turu = 'ogretmen'
      `);

      updateStmt.run([
        kisitlar.min_gunluk_ders || 2,
        kisitlar.max_gunluk_ders || 8,
        kisitlar.max_bos_pencere || 2,
        new Date().toISOString(),
        parseInt(programId),
        parseInt(ogretmenId),
      ]);
      updateStmt.free();
    } else {
      // Yeni ekle
      const insertStmt = activeSchoolDB.prepare(`
        INSERT INTO kisitlar (
          program_id, kisit_turu, ogretmen_id, min_gunluk_ders,
          max_gunluk_ders, max_bos_pencere
        ) VALUES (?, 'ogretmen', ?, ?, ?, ?)
      `);

      insertStmt.run([
        parseInt(programId),
        parseInt(ogretmenId),
        kisitlar.min_gunluk_ders || 2,
        kisitlar.max_gunluk_ders || 8,
        kisitlar.max_bos_pencere || 2,
      ]);
      insertStmt.free();
    }

    saveActiveSchoolDB();

    console.log("✅ Öğretmen kısıtı kaydedildi");
    return { success: true, message: "Öğretmen kısıtı kaydedildi!" };
  } catch (error) {
    console.error("❌ Öğretmen kısıt kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm kısıtları getir
 */
function getKisitlar(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("📋 Kısıtlar getiriliyor, Program ID:", programId);

    // Genel kısıtlar
    const genelStmt = activeSchoolDB.prepare(`
      SELECT * FROM kisitlar 
      WHERE program_id = ? AND kisit_turu = 'genel'
      ORDER BY id DESC LIMIT 1
    `);
    genelStmt.bind([parseInt(programId)]);

    let genel = null;
    if (genelStmt.step()) {
      genel = genelStmt.getAsObject();
    }
    genelStmt.free();

    // Öğretmen kısıtları
    const ogretmenStmt = activeSchoolDB.prepare(`
      SELECT 
        k.*,
        o.ad_soyad,
        o.brans
      FROM kisitlar k
      LEFT JOIN ogretmenler o ON k.ogretmen_id = o.id
      WHERE k.program_id = ? AND k.kisit_turu = 'ogretmen'
      ORDER BY o.ad_soyad
    `);
    ogretmenStmt.bind([parseInt(programId)]);

    const ogretmenler = [];
    while (ogretmenStmt.step()) {
      ogretmenler.push(ogretmenStmt.getAsObject());
    }
    ogretmenStmt.free();

    console.log(`✅ ${ogretmenler.length} öğretmen kısıtı bulundu`);

    return {
      success: true,
      data: {
        genel: genel || getDefaultKisitlar(),
        ogretmenler: ogretmenler,
      },
    };
  } catch (error) {
    console.error("❌ Kısıt getirme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Varsayılan kısıtlar
 */
function getDefaultKisitlar() {
  return {
    min_gunluk_ders: 2,
    max_gunluk_ders: 8,
    max_bos_pencere: 2,
    ayni_gun_ayni_sinif: 0,
    blok_farkli_gun: 1,
    tek_saat_yasak: 1,
    tum_ogretmenlere_uygula: 0,
  };
}

/**
 * Öğretmen kısıtını sil
 */
function deleteOgretmenKisit(programId, ogretmenId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    console.log("🗑️ Öğretmen kısıtı siliniyor:", ogretmenId);

    activeSchoolDB.run(
      "DELETE FROM kisitlar WHERE program_id = ? AND ogretmen_id = ? AND kisit_turu = 'ogretmen'",
      [parseInt(programId), parseInt(ogretmenId)]
    );

    saveActiveSchoolDB();

    console.log("✅ Öğretmen kısıtı silindi");
    return { success: true, message: "Kısıt silindi!" };
  } catch (error) {
    console.error("❌ Kısıt silme hatası:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// 👨‍🏫 ÖĞRETMEN TERCİHLERİ YÖNETİMİ
// ============================================

/**
 * Öğretmen tercihlerini kaydet
 */
async function saveOgretmenTercihi(programId, ogretmenId, tercihler) {
  try {
    console.log("💾 Öğretmen tercihi kaydediliyor:", ogretmenId);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const kapaliSaatlerJSON = JSON.stringify(tercihler.kapali_saatler || {});

    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM ogretmen_tercihleri WHERE ogretmen_id = ? AND program_id = ?"
    );
    checkStmt.bind([parseInt(ogretmenId), parseInt(programId)]);

    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      // Güncelle
      const updateStmt = activeSchoolDB.prepare(`
        UPDATE ogretmen_tercihleri SET
          bos_gun = ?,
          kapali_saatler = ?,
          tercih_notlari = ?,
          guncelleme_tarihi = ?
        WHERE ogretmen_id = ? AND program_id = ?
      `);

      updateStmt.run([
        tercihler.bos_gun || null,
        kapaliSaatlerJSON,
        tercihler.tercih_notlari || null,
        new Date().toISOString(),
        parseInt(ogretmenId),
        parseInt(programId),
      ]);
      updateStmt.free();
    } else {
      // Yeni ekle
      const insertStmt = activeSchoolDB.prepare(`
        INSERT INTO ogretmen_tercihleri (
          ogretmen_id, program_id, bos_gun, kapali_saatler, tercih_notlari
        ) VALUES (?, ?, ?, ?, ?)
      `);

      insertStmt.run([
        parseInt(ogretmenId),
        parseInt(programId),
        tercihler.bos_gun || null,
        kapaliSaatlerJSON,
        tercihler.tercih_notlari || null,
      ]);
      insertStmt.free();
    }

    saveActiveSchoolDB();

    console.log("✅ Öğretmen tercihi kaydedildi");
    return { success: true, message: "Tercih kaydedildi!" };
  } catch (error) {
    console.error("❌ Tercih kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Öğretmen tercihini getir
 */
function getOgretmenTercihi(programId, ogretmenId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const stmt = activeSchoolDB.prepare(`
      SELECT 
        ot.*,
        o.ad_soyad,
        o.brans
      FROM ogretmen_tercihleri ot
      LEFT JOIN ogretmenler o ON ot.ogretmen_id = o.id
      WHERE ot.ogretmen_id = ? AND ot.program_id = ?
    `);
    stmt.bind([parseInt(ogretmenId), parseInt(programId)]);

    let tercih = null;
    if (stmt.step()) {
      tercih = stmt.getAsObject();
      if (tercih.kapali_saatler) {
        tercih.kapali_saatler = JSON.parse(tercih.kapali_saatler);
      }
    }
    stmt.free();

    return { success: true, data: tercih };
  } catch (error) {
    console.error("❌ Tercih getirme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm öğretmen tercihlerini getir
 */
function getAllOgretmenTercihleri(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const stmt = activeSchoolDB.prepare(`
      SELECT 
        ot.*,
        o.ad_soyad,
        o.brans
      FROM ogretmen_tercihleri ot
      LEFT JOIN ogretmenler o ON ot.ogretmen_id = o.id
      WHERE ot.program_id = ?
      ORDER BY o.ad_soyad
    `);
    stmt.bind([parseInt(programId)]);

    const tercihler = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.kapali_saatler) {
        row.kapali_saatler = JSON.parse(row.kapali_saatler);
      }
      tercihler.push(row);
    }
    stmt.free();

    console.log(`✅ ${tercihler.length} tercih bulundu`);
    return { success: true, data: tercihler };
  } catch (error) {
    console.error("❌ Tercih listeleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Öğretmen tercihini sil
 */
function deleteOgretmenTercihi(programId, ogretmenId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    activeSchoolDB.run(
      "DELETE FROM ogretmen_tercihleri WHERE program_id = ? AND ogretmen_id = ?",
      [parseInt(programId), parseInt(ogretmenId)]
    );

    saveActiveSchoolDB();

    return { success: true, message: "Tercih silindi!" };
  } catch (error) {
    console.error("❌ Tercih silme hatası:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// 🚀 ALGORİTMA ENTEGRASYONU
// ============================================

/**
 * Algorithm config kaydet
 */
async function saveAlgorithmConfig(programId, config) {
  try {
    console.log("⚙️ Algorithm config kaydediliyor, Program ID:", programId);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const configJSON = JSON.stringify(config);

    // Varsa güncelle
    const checkStmt = activeSchoolDB.prepare(
      "SELECT id FROM algorithm_config WHERE program_id = ?"
    );
    checkStmt.bind([parseInt(programId)]);

    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      const updateStmt = activeSchoolDB.prepare(`
        UPDATE algorithm_config SET
          config_json = ?,
          updated_at = ?
        WHERE program_id = ?
      `);
      updateStmt.run([
        configJSON,
        new Date().toISOString(),
        parseInt(programId),
      ]);
      updateStmt.free();
    } else {
      const insertStmt = activeSchoolDB.prepare(`
        INSERT INTO algorithm_config (program_id, config_json)
        VALUES (?, ?)
      `);
      insertStmt.run([parseInt(programId), configJSON]);
      insertStmt.free();
    }

    saveActiveSchoolDB();

    console.log("✅ Algorithm config kaydedildi");
    return { success: true, message: "Config kaydedildi!" };
  } catch (error) {
    console.error("❌ Config kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Algorithm config getir
 */
function getAlgorithmConfig(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const stmt = activeSchoolDB.prepare(
      "SELECT * FROM algorithm_config WHERE program_id = ?"
    );
    stmt.bind([parseInt(programId)]);

    let config = null;
    if (stmt.step()) {
      config = stmt.getAsObject();
      if (config.config_json) {
        config.config = JSON.parse(config.config_json);
      }
    }
    stmt.free();

    return { success: true, data: config };
  } catch (error) {
    console.error("❌ Config getirme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Solution variant kaydet
 */
async function saveSolutionVariant(
  programId,
  variantName,
  solution,
  metadata = {}
) {
  try {
    console.log("💾 Solution variant kaydediliyor:", variantName);

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const solutionJSON = JSON.stringify(solution);
    const metadataJSON = JSON.stringify(metadata);

    const stmt = activeSchoolDB.prepare(`
      INSERT INTO solution_variants (
        program_id, variant_name, solution_json, score, metadata_json
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([
      parseInt(programId),
      variantName,
      solutionJSON,
      metadata.score || null,
      metadataJSON,
    ]);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Solution variant kaydedildi");
    return { success: true, message: "Variant kaydedildi!" };
  } catch (error) {
    console.error("❌ Variant kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm solution variant'ları getir
 */
function getAllSolutionVariants(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM solution_variants
      WHERE program_id = ?
      ORDER BY score DESC, created_at DESC
    `);
    stmt.bind([parseInt(programId)]);

    const variants = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.metadata_json) {
        row.metadata = JSON.parse(row.metadata_json);
      }
      variants.push(row);
    }
    stmt.free();

    return { success: true, data: variants };
  } catch (error) {
    console.error("❌ Variant listeleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Performance metrics kaydet
 */
async function savePerformanceMetrics(programId, sessionName, metrics) {
  try {
    console.log("📊 Performance metrics kaydediliyor");

    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const metricsJSON = JSON.stringify(metrics);

    const stmt = activeSchoolDB.prepare(`
      INSERT INTO performance_metrics (
        program_id, session_name, total_time, iterations, 
        score, success, metrics_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      parseInt(programId),
      sessionName,
      metrics.totalTime || null,
      metrics.iterations || null,
      metrics.score || null,
      metrics.success ? 1 : 0,
      metricsJSON,
    ]);
    stmt.free();

    saveActiveSchoolDB();

    console.log("✅ Performance metrics kaydedildi");
    return { success: true, message: "Metrics kaydedildi!" };
  } catch (error) {
    console.error("❌ Metrics kaydetme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Performance history getir
 */
function getPerformanceHistory(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const stmt = activeSchoolDB.prepare(`
      SELECT * FROM performance_metrics
      WHERE program_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `);
    stmt.bind([parseInt(programId)]);

    const history = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.metrics_json) {
        row.metrics = JSON.parse(row.metrics_json);
      }
      history.push(row);
    }
    stmt.free();

    return { success: true, data: history };
  } catch (error) {
    console.error("❌ History getirme hatası:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// 📊 GELİŞMİŞ VERİ GETIRME FONKSİYONLARI
// ============================================

/**
 * Dersleri blok bilgileriyle getir
 */
function getAllDerslerWithBlocks() {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const stmt = activeSchoolDB.prepare(`
      SELECT 
        d.*,
        GROUP_CONCAT(DISTINCT o.id) as ogretmen_ids,
        GROUP_CONCAT(DISTINCT o.ad_soyad) as ogretmen_adlari,
        GROUP_CONCAT(DISTINCT o.kisa_ad) as kisa_adlar
      FROM dersler d
      LEFT JOIN ders_ogretmen do ON d.id = do.ders_id
      LEFT JOIN ogretmenler o ON do.ogretmen_id = o.id
      WHERE d.durum = 1
      GROUP BY d.id
      ORDER BY d.ders_adi
    `);

    const dersler = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const blokBilgisi = parseBlokBilgisi(row.ders_blogu, row.haftalik_saat);

      const ogretmenIds = row.ogretmen_ids
        ? row.ogretmen_ids.split(",").map((id) => parseInt(id))
        : [];
      const ogretmenAdlari = row.ogretmen_adlari
        ? row.ogretmen_adlari.split(",")
        : [];
      const kisaAdlar = row.kisa_adlar ? row.kisa_adlar.split(",") : [];

      dersler.push({
        ...row,
        blok_bilgisi: blokBilgisi,
        ogretmenler: ogretmenIds.map((id, index) => ({
          id: id,
          ad_soyad: ogretmenAdlari[index],
          kisa_ad: kisaAdlar[index],
        })),
      });
    }
    stmt.free();

    return { success: true, data: dersler };
  } catch (error) {
    console.error("❌ Ders listeleme hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Blok bilgisini parse et
 */
function parseBlokBilgisi(blokString, haftalikSaat) {
  try {
    if (!blokString || blokString === "YOK") {
      return {
        tip: "tek",
        bloklar: [haftalikSaat || 1],
        toplam: haftalikSaat || 1,
        aciklama: "Blok yok",
      };
    }

    if (blokString.includes("-")) {
      const bloklar = blokString.split("-").map((b) => parseInt(b.trim()));
      const toplam = bloklar.reduce((sum, b) => sum + b, 0);

      let tip = "ozel";
      if (bloklar.every((b) => b === bloklar[0])) {
        tip = "esit_bol";
      } else if (
        bloklar.length === 2 &&
        Math.abs(bloklar[0] - bloklar[1]) === 1
      ) {
        tip = "dengeli";
      }

      return {
        tip: tip,
        bloklar: bloklar,
        toplam: toplam,
        aciklama: `${bloklar.join("+")} saat (${bloklar.length} gün)`,
      };
    }

    return {
      tip: "tek",
      bloklar: [parseInt(blokString) || haftalikSaat || 1],
      toplam: parseInt(blokString) || haftalikSaat || 1,
      aciklama: "Tek blok",
    };
  } catch (error) {
    return {
      tip: "hata",
      bloklar: [haftalikSaat || 1],
      toplam: haftalikSaat || 1,
      aciklama: "Parse hatası",
    };
  }
}

/**
 * Öğretmenleri yükleriyle getir
 */
function getAllTeachersWithLoad(programId) {
  try {
    if (!activeSchoolDB) {
      return { success: false, message: "Aktif okul veritabanı bulunamadı!" };
    }

    const stmt = activeSchoolDB.prepare(`
      SELECT 
        o.*,
        COUNT(DISTINCT do.ders_id) as ders_sayisi,
        GROUP_CONCAT(DISTINCT d.ders_adi) as dersler,
        GROUP_CONCAT(DISTINCT d.id) as ders_ids,
        GROUP_CONCAT(DISTINCT d.haftalik_saat) as haftalik_saatler,
        SUM(DISTINCT d.haftalik_saat) as toplam_haftalik_saat
      FROM ogretmenler o
      LEFT JOIN ders_ogretmen do ON o.id = do.ogretmen_id
      LEFT JOIN dersler d ON do.ders_id = d.id AND d.durum = 1
      WHERE o.durum = 1
      GROUP BY o.id
      ORDER BY o.ad_soyad
    `);

    const ogretmenler = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();

      // Kısıtlar
      let kisitlar = null;
      if (programId) {
        const kisitStmt = activeSchoolDB.prepare(
          "SELECT * FROM kisitlar WHERE program_id = ? AND ogretmen_id = ? AND kisit_turu = 'ogretmen'"
        );
        kisitStmt.bind([parseInt(programId), row.id]);
        if (kisitStmt.step()) {
          kisitlar = kisitStmt.getAsObject();
        }
        kisitStmt.free();
      }

      // Tercihler
      let tercihler = null;
      if (programId) {
        const tercihStmt = activeSchoolDB.prepare(
          "SELECT * FROM ogretmen_tercihleri WHERE program_id = ? AND ogretmen_id = ?"
        );
        tercihStmt.bind([parseInt(programId), row.id]);
        if (tercihStmt.step()) {
          tercihler = tercihStmt.getAsObject();
          if (tercihler.kapali_saatler) {
            tercihler.kapali_saatler = JSON.parse(tercihler.kapali_saatler);
          }
        }
        tercihStmt.free();
      }

      ogretmenler.push({
        ...row,
        toplam_haftalik_saat: row.toplam_haftalik_saat || 0,
        kisitlar: kisitlar,
        tercihler: tercihler,
      });
    }
    stmt.free();

    return { success: true, data: ogretmenler };
  } catch (error) {
    console.error("❌ Öğretmen listeleme hatası:", error);
    return { success: false, message: error.message };
  }
}

// ==========================================
// AKTİF OKUL VERİTABANI KAYDETME
// ==========================================

/**
 * Aktif okul veritabanını diske kaydeder
 */
function saveActiveSchoolDB() {
  if (!activeSchoolDB || !currentSchoolId) {
    console.warn("⚠️ Aktif okul veritabanı bulunamadı, kayıt atlanıyor.");
    return;
  }

  try {
    const stmt = masterDB.prepare(
      "SELECT veritabani_dosyasi FROM okullar WHERE id = ?"
    );
    stmt.bind([currentSchoolId]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      const dbPath = path.join(veritabaniKlasoru, row.veritabani_dosyasi);

      const data = activeSchoolDB.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);

      console.log("💾 Okul veritabanı başarıyla kaydedildi.");
    }
    stmt.free();
  } catch (error) {
    console.error("❌ Okul DB kaydetme hatası:", error);
  }
}

// ============================================
// 📤 MODULE EXPORTS
// ============================================

module.exports = {
  // Temel fonksiyonlar
  initDatabase,
  saveMasterDB,
  saveActiveSchoolDB,
  getMasterDB,
  getActiveSchoolDB,
  getCurrentSchoolId,
  veritabaniKlasoru,
  yedekKlasoru,

  // 🔐 ŞİFRE HASH FONKSİYONLARI (YENİ)
  hashUserPassword,
  verifyUserPassword,

  // Migration
  runMigrations,
  getDatabaseVersion,
  tableExists,
  columnExists,
  autoRunMigrations,
  backupDatabase,
  verifyDatabaseIntegrity,
  printDatabaseStats,

  // Okul yönetimi
  createSchool,
  getAllSchools,
  updateSchool,
  deleteSchool,
  loginSchool,
  repairSchoolRecord,

  // Öğretmen yönetimi
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,

  // Öğrenci yönetimi
  createStudent,
  getAllStudents,
  updateStudent,
  deleteStudent,
  importStudentsFromExcel,

  // Sınıf yönetimi
  createClass,
  getAllClasses,
  updateClass,
  deleteClass,
  getStatsForClass,

  // Ders yönetimi
  getAllDersler,
  addDers,
  updateDers,
  deleteDers,

  // Ders programı yönetimi
  createDersProgram,
  createDersProgramBasit,
  getDersProgram,
  getDersProgramBySinif,
  getAllDersProgramlari,
  updateDersProgram,
  deleteDersProgram,
  restoreDersProgram,
  hardDeleteDersProgram,
  checkCakisma,

  // Kısıtlar
  saveGenelKisitlar,
  saveOgretmenKisit,
  getKisitlar,
  getDefaultKisitlar,
  deleteOgretmenKisit,

  // Tercihler
  saveOgretmenTercihi,
  getOgretmenTercihi,
  getAllOgretmenTercihleri,
  deleteOgretmenTercihi,

  // 🚀 Algoritma entegrasyonu
  saveAlgorithmConfig,
  getAlgorithmConfig,
  saveSolutionVariant,
  getAllSolutionVariants,
  savePerformanceMetrics,
  getPerformanceHistory,

  // Gelişmiş veri getirme
  getAllDerslerWithBlocks,
  getAllTeachersWithLoad,
  parseBlokBilgisi,

  // Gezi yönetimi (YENİ - v10)
  // Not: Gezi fonksiyonları main.js'te IPC handler olarak implement edilecek
  // Veritabanı tabloları migration ile oluşturuldu
};

console.log("✅ Veritabanı modülü yüklendi - Ultra Enhanced Version");
console.log("👨‍💻 Geliştirici: SİMRE/MK");
console.log("📦 Version: 3.0.0");
console.log("🚀 Tüm fonksiyonlar export edildi");
console.log("🔐 Şifre hash sistemi aktif (PBKDF2)");
console.log("🎯 Algoritma entegrasyonu aktif");
console.log("📊 Migration sistemi v14 hazır");
