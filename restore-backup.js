const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function restoreBackup() {
  try {
    console.log("🔄 === VERİ GERİ YÜKLEME ===");

    const SQL = await initSqlJs();

    const yedekKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Yedekler"
    );

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    // Yedek dosyalarını listele
    console.log("\n📋 Mevcut Yedekler:\n");

    const yedekDosyalari = fs
      .readdirSync(yedekKlasoru)
      .filter((f) => f.startsWith("backup_974871_") && f.endsWith(".db"))
      .sort()
      .reverse();

    if (yedekDosyalari.length === 0) {
      console.log("❌ Yedek dosyası bulunamadı!");
      rl.close();
      return;
    }

    yedekDosyalari.forEach((dosya, index) => {
      const yol = path.join(yedekKlasoru, dosya);
      const stats = fs.statSync(yol);
      const tarih = new Date(stats.mtime);

      console.log(`${index + 1}. ${dosya}`);
      console.log(`   Tarih: ${tarih.toLocaleString("tr-TR")}`);
      console.log(`   Boyut: ${Math.round(stats.size / 1024)} KB\n`);
    });

    rl.question(
      "Hangi yedeği geri yüklemek istiyorsunuz? (1-" +
        yedekDosyalari.length +
        "): ",
      async (cevap) => {
        const secim = parseInt(cevap) - 1;

        if (secim < 0 || secim >= yedekDosyalari.length) {
          console.log("❌ Geçersiz seçim!");
          rl.close();
          return;
        }

        const secilenYedek = yedekDosyalari[secim];
        const yedekYolu = path.join(yedekKlasoru, secilenYedek);
        const hedefYol = path.join(veritabaniKlasoru, "okul_974871.db");

        console.log("\n🔄 Geri yükleniyor:", secilenYedek);

        // Mevcut DB'yi yedekle
        if (fs.existsSync(hedefYol)) {
          const suankiYedek = path.join(
            yedekKlasoru,
            `before_restore_${Date.now()}.db`
          );
          fs.copyFileSync(hedefYol, suankiYedek);
          console.log("✅ Mevcut DB yedeklendi:", path.basename(suankiYedek));
        }

        // Yedekten geri yükle
        fs.copyFileSync(yedekYolu, hedefYol);

        console.log("✅ Veritabanı geri yüklendi!");

        // İçeriği kontrol et
        const binaryData = fs.readFileSync(hedefYol);
        const db = new SQL.Database(binaryData);

        console.log("\n📊 Geri Yüklenen Veriler:");

        // Öğretmen sayısı
        const ogretmenStmt = db.prepare(
          "SELECT COUNT(*) as count FROM ogretmenler"
        );
        ogretmenStmt.step();
        const ogretmenCount = ogretmenStmt.getAsObject().count;
        ogretmenStmt.free();

        console.log(`   • Öğretmen: ${ogretmenCount}`);

        // Öğrenci sayısı
        const ogrenciStmt = db.prepare(
          "SELECT COUNT(*) as count FROM ogrenciler"
        );
        ogrenciStmt.step();
        const ogrenciCount = ogrenciStmt.getAsObject().count;
        ogrenciStmt.free();

        console.log(`   • Öğrenci: ${ogrenciCount}`);

        // Sınıf sayısı
        const sinifStmt = db.prepare("SELECT COUNT(*) as count FROM siniflar");
        sinifStmt.step();
        const sinifCount = sinifStmt.getAsObject().count;
        sinifStmt.free();

        console.log(`   • Sınıf: ${sinifCount}`);

        console.log("\n" + "=".repeat(60));
        console.log("🎉 VERİ GERİ YÜKLEME TAMAMLANDI!");
        console.log("=".repeat(60));
        console.log("\n📋 Sonraki Adım:");
        console.log("   npm start");
        console.log("=".repeat(60));

        rl.close();
      }
    );
  } catch (error) {
    console.error("❌ HATA:", error);
    rl.close();
  }
}

restoreBackup();
