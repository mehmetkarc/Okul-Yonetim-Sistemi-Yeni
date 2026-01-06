// ==========================================
// LİSANS OLUŞTURMA ARACI V4.0 (HASH DESTEKLI!)
// Okul DB'den hash'i okur ve lisansa ekler
// ==========================================

const crypto = require("crypto-js");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");
const os = require("os");

// ==========================================
// MASTER KEY
// ==========================================

const MASTER_KEY = "OYS-2025-SUPER-SECRET-KEY-XYZ123-MEHMET-KARC";

// ==========================================
// LİSANS BİLGİLERİ - BURAYA YAZ
// ==========================================

const licenseData = {
  okul_kodu: "111111",
  okul_adi: "Test Hash Okulu",
  kullanici_adi: "admin",
  sifre_duz: "5mhvtkA3X%vL", // ← DÜZ ŞİFRE (REFERANS İÇİN)
  moduller: [
    "ogretmenler",
    "ogrenciler",
    "siniflar",
    "dersler",
    "ders-programi",
    // ... (tüm modüller)
  ],
  gecerlilik: "2026-12-30",
};

// ==========================================
// İMZA OLUŞTURMA
// ==========================================

function createSignature(license) {
  const rawData =
    String(license.okul_kodu) +
    String(license.okul_adi) +
    String(license.kullanici_adi) +
    String(license.sifre) +
    String(license.gecerlilik) +
    MASTER_KEY;

  return crypto.SHA256(rawData).toString();
}

// ==========================================
// OKUL DB'DEN HASH'İ AL
// ==========================================

async function getAdminHashFromDB(okulKodu) {
  try {
    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    const dbPath = path.join(veritabaniKlasoru, `okul_${okulKodu}.db`);

    if (!fs.existsSync(dbPath)) {
      console.warn("⚠️ Okul DB bulunamadı:", dbPath);
      console.warn("⚠️ DÜZ ŞİFRE KULLANILACAK!");
      return null;
    }

    console.log("📂 Okul DB okunuyor:", dbPath);

    const dbData = fs.readFileSync(dbPath);
    const schoolDB = new SQL.Database(dbData);

    const stmt = schoolDB.prepare(
      "SELECT sifre FROM kullanicilar WHERE kullanici_adi = 'admin'"
    );

    if (!stmt.step()) {
      console.warn("⚠️ Admin kullanıcısı bulunamadı!");
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject();
    stmt.free();
    schoolDB.close();

    console.log("✅ Admin hash'i alındı:", row.sifre.substring(0, 20) + "...");

    return row.sifre;
  } catch (error) {
    console.error("❌ Hash alma hatası:", error.message);
    return null;
  }
}

// ==========================================
// LİSANS OLUŞTUR
// ==========================================

async function createLicense() {
  console.log("=".repeat(60));
  console.log("🔐 LİSANS OLUŞTURMA ARACI V4.0 (HASH DESTEKLI)");
  console.log("=".repeat(60));

  try {
    // ✅ OKUL DB'DEN HASH AL
    const adminHash = await getAdminHashFromDB(licenseData.okul_kodu);

    // Lisans verisini hazırla
    const license = {
      okul_kodu: licenseData.okul_kodu,
      okul_adi: licenseData.okul_adi,
      kullanici_adi: licenseData.kullanici_adi,
      sifre: adminHash || licenseData.sifre_duz, // ✅ HASH veya DÜZ
      moduller: licenseData.moduller,
      aktif: true,
      gecerlilik: licenseData.gecerlilik,
      olusturma_tarihi: new Date().toISOString(),
    };

    console.log("\n📋 Lisans Bilgileri:");
    console.log("   • Okul Kodu:", license.okul_kodu);
    console.log("   • Okul Adı:", license.okul_adi);
    console.log("   • Kullanıcı Adı:", license.kullanici_adi);
    console.log("   • Şifre Tipi:", adminHash ? "HASH (Güvenli)" : "DÜZ");
    console.log("   • Modül Sayısı:", license.moduller.length);
    console.log("   • Geçerlilik:", license.gecerlilik);

    // İmza oluştur
    console.log("\n🔐 İmza oluşturuluyor...");
    license.imza = createSignature(license);
    console.log("✅ İmza oluşturuldu");

    // Şifrele
    console.log("\n🔒 Lisans şifreleniyor (AES-256)...");
    const encrypted = crypto.AES.encrypt(
      JSON.stringify(license),
      MASTER_KEY
    ).toString();
    console.log("✅ Lisans şifrelendi");

    // Kaydet
    const outputDir = path.join(__dirname, "licenses");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `lisans_${license.okul_kodu}.lic`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, encrypted, "utf8");

    console.log("\n=".repeat(60));
    console.log("✅ LİSANS BAŞARIYLA OLUŞTURULDU!");
    console.log("=".repeat(60));
    console.log("📁 Dosya:", filename);
    console.log("📂 Yol:", filepath);

    console.log("\n" + "━".repeat(60));
    console.log("📋 GİRİŞ BİLGİLERİ (OKULA VERİLECEK)");
    console.log("━".repeat(60));
    console.log("🏫 Okul Kodu:", license.okul_kodu);
    console.log("👤 Kullanıcı Adı:", license.kullanici_adi);
    console.log("🔒 Şifre:", licenseData.sifre_duz); // ← DÜZ ŞİFREYİ GÖSTER
    console.log("📅 Geçerlilik:", license.gecerlilik);
    console.log("━".repeat(60));

    console.log("\n⚠️ ÖNEMLİ:");
    console.log("• Lisans dosyasında HASH var (güvenli)");
    console.log("• Okula DÜZ ŞİFREYİ verin:", licenseData.sifre_duz);
    console.log("• Giriş sırasında otomatik karşılaştırılacak");
  } catch (error) {
    console.error("\n❌ HATA:", error.message);
  }
}

createLicense();
