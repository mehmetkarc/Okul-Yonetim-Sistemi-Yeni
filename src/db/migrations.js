/**
 * ============================================
 * VERİTABANI MİGRATİON SİSTEMİ - GÜÇLE VERSİYON
 * ============================================
 *
 * Schema-helpers ile entegre migration sistemi
 * Otomatik kolon ekleme ve tablo kontrolü
 *
 * @author SİMRE/MK
 * @version 2.0.0
 * ============================================
 */

const path = require("path");
const fs = require("fs");

// ✅ SCHEMA HELPERS İMPORT
const {
  tableExists,
  columnExists,
  ensureTableSchema,
  ensureAllTablesSchema,
  ensureCriticalTables,
  getTableColumns,
  checkDatabaseHealth,
} = require("./schema-helpers");

const { SCHEMA_DEFINITIONS } = require("./schema-definitions");

// ==========================================
// VERİTABANI VERSİYON BİLGİSİ
// ==========================================
const CURRENT_DB_VERSION = 14;

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
  14: "🚗 gezi_araclar tablosundan arac_tipi sütunu kaldırıldı (veri korundu)",
};

// Yedek klasörü (veritabani.js'den gelecek)
let yedekKlasoru = path.join(
  require("os").homedir(),
  "Documents",
  "OkulYonetimSistemi",
  "Yedekler"
);

// ============================================
// TEMEL FONKSİYONLAR
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
// MİGRATİON FONKSİYONLARI
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
   * Versiyon 12: 📝 ORTAK SINAV (KELEBEK) SİSTEMİ - GÜÇLE VERSİYON
   */
  12: (db) => {
    console.log(
      "📋 Migration v12: 📝 Ortak Sınav (Kelebek) Sistemi ekleniyor (GÜÇLE)..."
    );
    try {
      let tablesCreated = 0;

      // ============================================
      // ✅ 1. KRİTİK TABLOLARI SCHEMA İLE KONTROL ET
      // ============================================
      console.log("\n🔍 Kritik tabloların şeması kontrol ediliyor...");

      const criticalTables = [
        "ortak_sinav_dagitim",
        "sinav_qr_kodlar",
        "sinav_yoklama_kayitlari",
        "ortak_sinav_salonlar",
      ];

      for (const tableName of criticalTables) {
        if (SCHEMA_DEFINITIONS[tableName]) {
          const success = ensureTableSchema(
            db,
            tableName,
            SCHEMA_DEFINITIONS[tableName]
          );
          if (success) {
            console.log(`✅ ${tableName} şema kontrolü tamamlandı`);
          }
        }
      }

      // ============================================
      // 2. DİĞER ORTAK SINAV TABLOLARI
      // ============================================

      // Ortak Sınav Planları
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

      // Ortak Sınavlar
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

      // Ortak Sınav Açıklamaları
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

      // Ortak Sınav Gözetmenler
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

      // ============================================
      // 3. ÖZET
      // ============================================
      console.log("\n" + "=".repeat(60));
      console.log(`🎉 Migration v12 tamamlandı`);
      console.log(`📊 ${tablesCreated} yeni tablo oluşturuldu`);
      console.log(`🔧 Kritik tablolar schema ile kontrol edildi`);
      console.log("=".repeat(60));

      return true;
    } catch (error) {
      console.error("❌ Migration v12 hatası:", error);
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
// YARDIMCI FONKSİYONLAR
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

/**
 * Okul veritabanı yüklendiğinde otomatik migration çalıştır - GÜÇLE VERSİYON
 */
function autoRunMigrations(db, schoolCode) {
  console.log(`\n🔄 ${schoolCode} için otomatik migration kontrolü (GÜÇLE)...`);

  try {
    // ============================================
    // 1. YEDEK AL
    // ============================================
    const backup = backupDatabase(db, schoolCode);
    if (!backup.success) {
      console.warn("⚠️ Yedekleme başarısız, migration atlanıyor!");
      return false;
    }

    // ============================================
    // 2. KLASIK MIGRATION ÇALIŞTIR
    // ============================================
    const migrationSuccess = runMigrations(db);

    if (!migrationSuccess) {
      console.error("❌ Migration başarısız!");
      console.log("💡 Yedek dosyası: " + backup.path);
      return false;
    }

    // ============================================
    // 3. ✅ YENİ: KRİTİK TABLOLARIN ŞEMASINI ZORUNLU KONTROL ET
    // ============================================
    console.log("\n🔍 Kritik tabloların şema bütünlüğü kontrol ediliyor...");

    const schemaCheck = ensureCriticalTables(db);

    if (!schemaCheck.success) {
      console.warn("⚠️ Bazı şema kontrolleri başarısız!");
    }

    // ============================================
    // 4. BÜTÜNLÜK KONTROLÜ
    // ============================================
    verifyDatabaseIntegrity(db);

    // ============================================
    // 5. SAĞLIK KONTROLÜ
    // ============================================
    checkDatabaseHealth(db);

    // ============================================
    // 6. İSTATİSTİKLER
    // ============================================
    printDatabaseStats(db);

    console.log("\n✅ Otomatik migration tamamlandı!");
    return true;
  } catch (error) {
    console.error("❌ autoRunMigrations hatası:", error);
    return false;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  runMigrations,
  autoRunMigrations,
  getDatabaseVersion,
  setDatabaseVersion,
  backupDatabase,
  verifyDatabaseIntegrity,
  printDatabaseStats,
  CURRENT_DB_VERSION,
  DB_CHANGELOG,
};

console.log("✅ Migrations modülü yüklendi (GÜÇLE VERSİYON)");
console.log(`📊 DB Versiyon: ${CURRENT_DB_VERSION}`);
