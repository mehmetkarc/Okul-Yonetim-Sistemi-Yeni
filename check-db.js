const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const securityManager = require("./src/utils/security-manager");

async function checkDatabase() {
  try {
    console.log("🔍 === VERİTABANI KONTROLÜ ===");

    // SQL.js başlat
    const SQL = await initSqlJs();

    // Master DB yolu
    const masterDbPath = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani",
      ".system.dat.sys"
    );

    console.log("📂 Master DB yolu:", masterDbPath);

    // Şifreli dosyayı oku
    const encryptedData = fs.readFileSync(masterDbPath, "utf8");

    // Şifreyi çöz
    const masterKey = securityManager.generateMasterKey("Superadmin123!");
    const base64Data = securityManager.decrypt(encryptedData, masterKey);
    const binaryData = Buffer.from(base64Data, "base64");

    // DB'yi yükle
    const db = new SQL.Database(binaryData);

    console.log("✅ Master DB yüklendi\n");

    // Okulları listele
    console.log("📋 === OKUL LİSTESİ ===");

    const stmt = db.prepare(`
      SELECT id, okul_kodu, okul_adi, sifre, 
             lisans_baslangic, lisans_bitis, durum
      FROM okullar
    `);

    let count = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      count++;

      console.log(`\n🏫 Okul #${count}:`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Okul Kodu: ${row.okul_kodu}`);
      console.log(`   Okul Adı: ${row.okul_adi}`);
      console.log(`   Şifre: ${row.sifre || "❌ BOŞ!"}`);
      console.log(`   Lisans: ${row.lisans_baslangic} → ${row.lisans_bitis}`);
      console.log(`   Durum: ${row.durum === 1 ? "Aktif" : "Pasif"}`);
    }
    stmt.free();

    console.log(`\n📊 Toplam: ${count} okul bulundu`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error);
  }
}

checkDatabase();
