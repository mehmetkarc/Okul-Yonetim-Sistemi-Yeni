/**
 * ============================================
 * VERİTABANI ŞEMA TANIMLARI
 * ============================================
 *
 * Bu dosya tüm tabloların beklenen yapısını tanımlar.
 * Migration ve schema kontrolü için merkezi kaynak.
 *
 * @author SİMRE/MK
 * @version 1.0.0
 * ============================================
 */

/**
 * Tablo şema tanımları
 * Her tablo için beklenen kolonlar ve tipleri
 */
const SCHEMA_DEFINITIONS = {
  // ==========================================
  // TEMEL TABLOLAR
  // ==========================================

  kullanicilar: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "kullanici_adi", type: "TEXT UNIQUE NOT NULL" },
    { name: "sifre", type: "TEXT NOT NULL" },
    { name: "ad_soyad", type: "TEXT NOT NULL" },
    { name: "tc_no", type: "TEXT UNIQUE" },
    { name: "email", type: "TEXT" },
    { name: "telefon", type: "TEXT" },
    { name: "rol", type: "TEXT NOT NULL" },
    { name: "durum", type: "INTEGER DEFAULT 1" },
    { name: "olusturma_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
    { name: "son_giris", type: "TEXT" },
  ],

  ogretmenler: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "kullanici_id", type: "INTEGER UNIQUE" },
    { name: "tc_no", type: "TEXT UNIQUE NOT NULL" },
    { name: "ad_soyad", type: "TEXT NOT NULL" },
    { name: "kisa_ad", type: "TEXT" },
    { name: "brans", type: "TEXT" },
    { name: "cinsiyet", type: "TEXT" },
    { name: "dogum_tarihi", type: "TEXT" },
    { name: "dogum_yeri", type: "TEXT" },
    { name: "baba_adi", type: "TEXT" },
    { name: "unvan", type: "TEXT" },
    { name: "kariyer", type: "TEXT" },
    { name: "gorev", type: "TEXT" },
    { name: "durum", type: "INTEGER DEFAULT 1" },
    { name: "gorev_yeri", type: "TEXT" },
    { name: "goreve_baslama", type: "TEXT" },
    { name: "kurumda_baslama", type: "TEXT" },
    { name: "ogrenim_durumu", type: "TEXT" },
    { name: "mezun_universite", type: "TEXT" },
    { name: "derece", type: "INTEGER" },
    { name: "kademe", type: "INTEGER" },
    { name: "emekli_sicil_no", type: "TEXT" },
    { name: "kbs_personel_no", type: "TEXT" },
    { name: "iban", type: "TEXT" },
    { name: "banka_subesi", type: "TEXT" },
    { name: "yabanci_dil_tazminati", type: "TEXT" },
    { name: "ek_gosterge", type: "TEXT" },
    { name: "aile_durumu", type: "TEXT" },
    { name: "cocuk_0_6", type: "INTEGER DEFAULT 0" },
    { name: "cocuk_6_ustu", type: "INTEGER DEFAULT 0" },
    { name: "bes", type: "TEXT" },
    { name: "telefon", type: "TEXT" },
    { name: "email", type: "TEXT" },
    { name: "adres", type: "TEXT" },
    { name: "ayrilma_tarihi", type: "TEXT" },
    { name: "ayrilis_nedeni", type: "TEXT" },
    { name: "olusturma_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
    { name: "guncelleme_tarihi", type: "TEXT" },
  ],

  ogrenciler: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "tc_no", type: "TEXT UNIQUE" },
    { name: "ad", type: "TEXT NOT NULL" },
    { name: "soyad", type: "TEXT NOT NULL" },
    { name: "okul_no", type: "TEXT UNIQUE NOT NULL" },
    { name: "ad_soyad", type: "TEXT NOT NULL" },
    { name: "sinif", type: "TEXT" },
    { name: "cinsiyet", type: "TEXT" },
    { name: "alan", type: "TEXT" },
    { name: "dal", type: "TEXT" },
    { name: "durum", type: "INTEGER DEFAULT 1" },
    { name: "dogum_yeri", type: "TEXT" },
    { name: "dogum_tarihi", type: "TEXT" },
    { name: "fotograf_path", type: "TEXT" },
    { name: "anne_ad_soyad", type: "TEXT" },
    { name: "anne_telefon", type: "TEXT" },
    { name: "baba_ad_soyad", type: "TEXT" },
    { name: "baba_telefon", type: "TEXT" },
    { name: "kayit_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
    { name: "olusturma_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
  ],

  // ==========================================
  // ORTAK SINAV SİSTEMİ TABLOLARI
  // ==========================================

  ortak_sinav_dagitim: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "sinav_id", type: "INTEGER NOT NULL" },
    { name: "ogrenci_id", type: "INTEGER NOT NULL" },
    { name: "salon_id", type: "INTEGER NOT NULL" },
    { name: "sira_no", type: "INTEGER NOT NULL" },
    { name: "satir_index", type: "INTEGER DEFAULT 0" }, // ✅ ÖNEMLİ
    { name: "sutun_index", type: "INTEGER DEFAULT 0" }, // ✅ ÖNEMLİ
    { name: "sabitle", type: "INTEGER DEFAULT 0" },
    { name: "olusturma_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
  ],

  sinav_qr_kodlar: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "sinav_id", type: "INTEGER NOT NULL" },
    { name: "qr_turu", type: "TEXT NOT NULL" },
    { name: "hedef_id", type: "INTEGER NOT NULL" },
    { name: "qr_hash", type: "TEXT NOT NULL UNIQUE" },
    { name: "olusturma_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
  ],

  sinav_yoklama_kayitlari: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "sinav_id", type: "INTEGER NOT NULL" },
    { name: "ogrenci_id", type: "INTEGER NOT NULL" },
    { name: "salon_id", type: "INTEGER" },
    { name: "yoklama_durumu", type: "TEXT" },
    { name: "disiplin_turu", type: "TEXT" },
    { name: "aciklama", type: "TEXT" },
    { name: "tarih", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
  ],

  ortak_sinav_salonlar: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "salon_adi", type: "TEXT NOT NULL" },
    { name: "plan_id", type: "INTEGER" },
    { name: "kapasite", type: "INTEGER NOT NULL" },
    { name: "satir_sayisi", type: "INTEGER DEFAULT 8" }, // ✅ YENİ
    { name: "sutun_sayisi", type: "INTEGER DEFAULT 5" }, // ✅ YENİ
    { name: "durum", type: "INTEGER DEFAULT 1" },
    { name: "olusturma_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
    { name: "guncelleme_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
  ],

  // ==========================================
  // GEZİ SİSTEMİ TABLOLARI
  // ==========================================

  gezi_araclar: [
    { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
    { name: "gezi_id", type: "INTEGER NOT NULL" },
    { name: "plaka", type: "TEXT" },
    { name: "sofor_adi", type: "TEXT" },
    { name: "sofor_telefon", type: "TEXT" },
    { name: "kapasite", type: "INTEGER" },
    { name: "ucret", type: "REAL" },
    { name: "arac_modeli", type: "TEXT" },
    { name: "trafige_cikis_tarihi", type: "TEXT" },
    { name: "son_muayene_tarihi", type: "TEXT" },
    { name: "mali_sorumluluk_police_no", type: "TEXT" },
    { name: "mali_sorumluluk_bitis_tarihi", type: "TEXT" },
    { name: "ferdi_kaza_police_no", type: "TEXT" },
    { name: "ferdi_kaza_bitis_tarihi", type: "TEXT" },
    { name: "arac_ozellikleri", type: "TEXT" },
    { name: "olusturma_tarihi", type: "TEXT DEFAULT CURRENT_TIMESTAMP" },
    // ❌ arac_tipi YOK (kaldırıldı)
  ],

  // ==========================================
  // DİĞER TABLOLAR (İHTİYAÇ DUYULDUKÇA EKLENEBİLİR)
  // ==========================================
};

/**
 * Tablo indeks tanımları
 */
const INDEX_DEFINITIONS = {
  ortak_sinav_dagitim: [
    { name: "idx_dagitim_sinav", columns: ["sinav_id"] },
    { name: "idx_dagitim_ogrenci", columns: ["ogrenci_id"] },
    { name: "idx_dagitim_salon", columns: ["salon_id"] },
  ],
  sinav_qr_kodlar: [
    { name: "idx_qr_sinav", columns: ["sinav_id"] },
    { name: "idx_qr_hash", columns: ["qr_hash"] },
  ],
  sinav_yoklama_kayitlari: [
    { name: "idx_yoklama_sinav", columns: ["sinav_id"] },
  ],
};

/**
 * Foreign key tanımları
 */
const FOREIGN_KEY_DEFINITIONS = {
  ortak_sinav_dagitim: [
    {
      column: "sinav_id",
      references: "ortak_sinavlar(id)",
      onDelete: "CASCADE",
    },
    { column: "ogrenci_id", references: "ogrenciler(id)", onDelete: "CASCADE" },
    {
      column: "salon_id",
      references: "ortak_sinav_salonlar(id)",
      onDelete: "CASCADE",
    },
  ],
  sinav_qr_kodlar: [
    {
      column: "sinav_id",
      references: "ortak_sinavlar(id)",
      onDelete: "CASCADE",
    },
  ],
  sinav_yoklama_kayitlari: [
    {
      column: "sinav_id",
      references: "ortak_sinavlar(id)",
      onDelete: "CASCADE",
    },
    { column: "ogrenci_id", references: "ogrenciler(id)", onDelete: "CASCADE" },
    {
      column: "salon_id",
      references: "ortak_sinav_salonlar(id)",
      onDelete: "SET NULL",
    },
  ],
};

module.exports = {
  SCHEMA_DEFINITIONS,
  INDEX_DEFINITIONS,
  FOREIGN_KEY_DEFINITIONS,
};

console.log("✅ Schema Definitions yüklendi");
console.log(`📊 ${Object.keys(SCHEMA_DEFINITIONS).length} tablo tanımlı`);
