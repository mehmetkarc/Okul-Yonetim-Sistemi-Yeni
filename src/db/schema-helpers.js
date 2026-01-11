/**
 * ============================================
 * VERİTABANI ŞEMA HELPER FONKSİYONLARI
 * ============================================
 *
 * Schema kontrolü ve otomatik düzeltme fonksiyonları
 *
 * @author SİMRE/MK
 * @version 1.0.0
 * ============================================
 */

const {
  SCHEMA_DEFINITIONS,
  INDEX_DEFINITIONS,
} = require("./schema-definitions");

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
    console.error(`❌ Tablo kontrol hatası (${tableName}):`, error);
    return false;
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
    console.error(
      `❌ Sütun kontrol hatası (${tableName}.${columnName}):`,
      error
    );
    return false;
  }
}

/**
 * Tablonun mevcut sütunlarını getir
 */
function getTableColumns(db, tableName) {
  try {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
    const columns = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      columns.push({
        name: row.name,
        type: row.type,
        notnull: row.notnull,
        dflt_value: row.dflt_value,
        pk: row.pk,
      });
    }
    stmt.free();

    return columns;
  } catch (error) {
    console.error(`❌ Sütun listesi hatası (${tableName}):`, error);
    return [];
  }
}

/**
 * Schema'dan tablo oluştur
 */
function createTableFromSchema(db, tableName, schemaColumns) {
  try {
    console.log(`🔨 ${tableName} tablosu oluşturuluyor...`);

    const columnDefs = schemaColumns
      .map((col) => `${col.name} ${col.type}`)
      .join(", ");
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;

    db.run(sql);

    console.log(`✅ ${tableName} tablosu oluşturuldu`);
    return true;
  } catch (error) {
    console.error(`❌ Tablo oluşturma hatası (${tableName}):`, error);
    return false;
  }
}

/**
 * Tablonun şemasını kontrol et ve eksik kolonları ekle
 */
function ensureTableSchema(db, tableName, expectedColumns) {
  try {
    console.log(`\n🔍 ${tableName} tablosu kontrol ediliyor...`);

    // ============================================
    // 1. TABLO VAR MI?
    // ============================================
    if (!tableExists(db, tableName)) {
      console.log(`❌ ${tableName} tablosu bulunamadı, oluşturuluyor...`);
      return createTableFromSchema(db, tableName, expectedColumns);
    }

    // ============================================
    // 2. KOLONLARI KONTROL ET
    // ============================================
    const existingColumns = getTableColumns(db, tableName);
    const existingColumnNames = existingColumns.map((col) => col.name);

    console.log(`📊 Mevcut kolonlar: ${existingColumnNames.join(", ")}`);

    // Eksik kolonları bul
    const missingColumns = expectedColumns.filter(
      (col) => !existingColumnNames.includes(col.name)
    );

    if (missingColumns.length === 0) {
      console.log(
        `✅ ${tableName} tablosu güncel (${existingColumnNames.length} kolon)`
      );
      return true;
    }

    // ============================================
    // 3. EKSİK KOLONLARI EKLE
    // ============================================
    console.log(
      `⚠️ ${tableName} tablosunda ${missingColumns.length} eksik kolon bulundu`
    );

    let addedCount = 0;
    let failedCount = 0;

    for (const col of missingColumns) {
      try {
        console.log(`  ➕ ${col.name} kolonu ekleniyor...`);

        // ALTER TABLE ile kolon ekle
        const sql = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`;
        db.run(sql);

        console.log(`  ✅ ${col.name} eklendi`);
        addedCount++;
      } catch (error) {
        console.error(`  ❌ ${col.name} eklenemedi:`, error.message);
        failedCount++;
      }
    }

    // ============================================
    // 4. SONUÇ
    // ============================================
    if (failedCount === 0) {
      console.log(
        `✅ ${tableName} tablosu güncellendi (${addedCount} kolon eklendi)`
      );
      return true;
    } else {
      console.warn(
        `⚠️ ${tableName} kısmen güncellendi (${addedCount} başarılı, ${failedCount} hatalı)`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ ${tableName} şema kontrolü hatası:`, error);
    return false;
  }
}

/**
 * Tüm tabloların şemasını kontrol et
 */
function ensureAllTablesSchema(db, tableNames = null) {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 VERİTABANI ŞEMA BÜTÜNLÜK KONTROLÜ");
    console.log("=".repeat(60));

    const startTime = Date.now();

    // Kontrol edilecek tabloları belirle
    const tablesToCheck = tableNames || Object.keys(SCHEMA_DEFINITIONS);

    console.log(`📋 ${tablesToCheck.length} tablo kontrol edilecek`);

    let successCount = 0;
    let failCount = 0;

    // Her tabloyu kontrol et
    for (const tableName of tablesToCheck) {
      const schema = SCHEMA_DEFINITIONS[tableName];

      if (!schema) {
        console.warn(
          `⚠️ ${tableName} için şema tanımı bulunamadı, atlanıyor...`
        );
        continue;
      }

      const success = ensureTableSchema(db, tableName, schema);

      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // ============================================
    // ÖZET RAPOR
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 ŞEMA KONTROL SONUCU");
    console.log("=".repeat(60));
    console.log(`✅ Başarılı: ${successCount} tablo`);
    console.log(`❌ Hatalı: ${failCount} tablo`);
    console.log(`⏱️ Süre: ${duration} saniye`);
    console.log("=".repeat(60) + "\n");

    return {
      success: failCount === 0,
      successCount,
      failCount,
      duration,
    };
  } catch (error) {
    console.error("❌ Toplu şema kontrolü hatası:", error);
    return {
      success: false,
      error: error.message,
    };
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

/**
 * Eksik indeksleri oluştur
 */
function ensureIndexes(db, tableName) {
  try {
    if (!INDEX_DEFINITIONS[tableName]) {
      return true;
    }

    console.log(`🔍 ${tableName} indeksleri kontrol ediliyor...`);

    const indexes = INDEX_DEFINITIONS[tableName];
    let createdCount = 0;

    for (const index of indexes) {
      if (!indexExists(db, index.name)) {
        console.log(`  ➕ ${index.name} indeksi oluşturuluyor...`);

        const columns = index.columns.join(", ");
        const sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${tableName}(${columns})`;

        db.run(sql);
        console.log(`  ✅ ${index.name} oluşturuldu`);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`✅ ${tableName} için ${createdCount} indeks oluşturuldu`);
    }

    return true;
  } catch (error) {
    console.error(`❌ İndeks kontrolü hatası (${tableName}):`, error);
    return false;
  }
}

/**
 * Kritik tabloları zorla kontrol et
 */
function ensureCriticalTables(db) {
  console.log("\n🚨 KRİTİK TABLO KONTROLÜ");
  console.log("=".repeat(60));

  const criticalTables = [
    "ortak_sinav_dagitim",
    "sinav_qr_kodlar",
    "sinav_yoklama_kayitlari",
    "ortak_sinav_salonlar",
    "gezi_araclar",
  ];

  return ensureAllTablesSchema(db, criticalTables);
}

/**
 * Veritabanı sağlık kontrolü
 */
function checkDatabaseHealth(db) {
  try {
    console.log("\n🏥 VERİTABANI SAĞLIK KONTROLÜ");
    console.log("=".repeat(60));

    const checks = {
      integrity: false,
      foreignKeys: 0,
      tableCount: 0,
      indexCount: 0,
    };

    // 1. Integrity Check
    console.log("🔍 Bütünlük kontrolü...");
    const integrityStmt = db.prepare("PRAGMA integrity_check");
    if (integrityStmt.step()) {
      const result = integrityStmt.getAsObject();
      checks.integrity = result.integrity_check === "ok";
    }
    integrityStmt.free();

    if (checks.integrity) {
      console.log("✅ Bütünlük kontrolü: BAŞARILI");
    } else {
      console.error("❌ Bütünlük kontrolü: BAŞARISIZ!");
    }

    // 2. Foreign Key Check
    console.log("🔍 Foreign key kontrolü...");
    const fkStmt = db.prepare("PRAGMA foreign_key_check");
    while (fkStmt.step()) {
      checks.foreignKeys++;
    }
    fkStmt.free();

    if (checks.foreignKeys === 0) {
      console.log("✅ Foreign key kontrolü: SORUN YOK");
    } else {
      console.warn(`⚠️ ${checks.foreignKeys} foreign key hatası bulundu`);
    }

    // 3. Tablo sayısı
    const tableStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    if (tableStmt.step()) {
      checks.tableCount = tableStmt.getAsObject().count;
    }
    tableStmt.free();
    console.log(`📊 Toplam tablo sayısı: ${checks.tableCount}`);

    // 4. İndeks sayısı
    const indexStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `);
    if (indexStmt.step()) {
      checks.indexCount = indexStmt.getAsObject().count;
    }
    indexStmt.free();
    console.log(`📊 Toplam indeks sayısı: ${checks.indexCount}`);

    console.log("=".repeat(60));

    return checks;
  } catch (error) {
    console.error("❌ Sağlık kontrolü hatası:", error);
    return null;
  }
}

module.exports = {
  // Temel kontroller
  tableExists,
  columnExists,
  getTableColumns,
  indexExists,

  // Şema yönetimi
  createTableFromSchema,
  ensureTableSchema,
  ensureAllTablesSchema,
  ensureCriticalTables,
  ensureIndexes,

  // Sağlık kontrolü
  checkDatabaseHealth,
};

console.log("✅ Schema Helpers yüklendi");
