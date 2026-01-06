const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

/**
 * İlk kurulum - Boş okul veritabanı oluştur
 */
async function createInitialSchoolDB(okulKodu, veritabaniKlasoru) {
  try {
    console.log("🏗️ Yeni okul veritabanı oluşturuluyor:", okulKodu);

    const SQL = await initSqlJs();
    const schoolDB = new SQL.Database();

    // ✅ TÜM TABLOLARI OLUŞTUR (52 TABLO)
    createAllTables(schoolDB);

    // ✅ VERSİYON KAYDET
    schoolDB.run("INSERT INTO db_version (version) VALUES (?)", [12]);

    // DB'yi kaydet
    const dbPath = path.join(veritabaniKlasoru, `okul_${okulKodu}.db`);
    const binaryData = schoolDB.export();
    fs.writeFileSync(dbPath, Buffer.from(binaryData));

    console.log("✅ Okul veritabanı oluşturuldu:", dbPath);

    return { success: true, dbPath };
  } catch (error) {
    console.error("❌ DB oluşturma hatası:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Tüm tabloları oluştur
 */
function createAllTables(db) {
  // Kullanıcılar
  db.run(`CREATE TABLE kullanicilar (...)`);

  // Öğretmenler
  db.run(`CREATE TABLE ogretmenler (...)`);

  // Öğrenciler
  db.run(`CREATE TABLE ogrenciler (...)`);

  // ... (52 tablo)

  console.log("✅ 52 tablo oluşturuldu");
}

module.exports = { createInitialSchoolDB };
