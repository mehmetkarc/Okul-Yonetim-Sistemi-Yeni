const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// ============================================
// STANDALONE SECURITY FONKSİYONLARI
// (Electron olmadan çalışır)
// ============================================

function getMachineId() {
  const cpuInfo = os.cpus()[0].model;
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();

  let macAddress = "unknown";
  try {
    const networkInterfaces = os.networkInterfaces();
    for (const name in networkInterfaces) {
      const iface = networkInterfaces[name];
      for (const net of iface) {
        if (net.mac && net.mac !== "00:00:00:00:00:00") {
          macAddress = net.mac;
          break;
        }
      }
      if (macAddress !== "unknown") break;
    }
  } catch (err) {}

  const machineString = `${cpuInfo}-${hostname}-${platform}-${arch}-${macAddress}`;
  return crypto.createHash("sha256").update(machineString).digest("hex");
}

function generateMasterKey(adminPassword) {
  const machineId = getMachineId();
  const combinedString = `${adminPassword}-${machineId}-MASTER-2025`;
  return crypto.createHash("sha256").update(combinedString).digest("hex");
}

function decrypt(encryptedText, key) {
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Geçersiz şifreli veri formatı!");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const keyBuffer = Buffer.from(key.substring(0, 64), "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(key.substring(0, 64), "hex");

  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

// ============================================
// SİLİNMİŞ OKULLARI TEMİZLE
// ============================================

async function cleanDeletedSchools() {
  try {
    console.log("🧹 === SİLİNMİŞ OKULLARI TEMİZLE (STANDALONE) ===");

    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    const masterDbPath = path.join(veritabaniKlasoru, ".system.dat.sys");

    console.log("📂 Master DB yolu:", masterDbPath);

    if (!fs.existsSync(masterDbPath)) {
      console.error("❌ Master DB bulunamadı!");
      return;
    }

    // Master DB'yi oku ve şifresini çöz
    console.log("🔓 Master DB şifresi çözülüyor...");

    const encryptedData = fs.readFileSync(masterDbPath, "utf8");
    const masterKey = generateMasterKey("Superadmin123!");
    const base64Data = decrypt(encryptedData, masterKey);
    const binaryData = Buffer.from(base64Data, "base64");

    const masterDB = new SQL.Database(binaryData);

    console.log("✅ Master DB yüklendi");

    // Silinmiş okulları listele
    console.log("\n📋 Silinmiş okullar:");

    const listStmt = masterDB.prepare(
      "SELECT id, okul_kodu, okul_adi FROM okullar WHERE durum = 0"
    );

    let silinecekSayisi = 0;
    const silinecekler = [];

    while (listStmt.step()) {
      const row = listStmt.getAsObject();
      console.log(`   • ${row.okul_kodu} - ${row.okul_adi} (ID: ${row.id})`);
      silinecekler.push(row);
      silinecekSayisi++;
    }
    listStmt.free();

    if (silinecekSayisi === 0) {
      console.log("✅ Silinmiş okul yok! Temiz.");
      return;
    }

    // Kalıcı olarak sil
    console.log(`\n🗑️ ${silinecekSayisi} okul kalıcı olarak siliniyor...`);

    const deleteStmt = masterDB.prepare("DELETE FROM okullar WHERE durum = 0");
    deleteStmt.run();
    deleteStmt.free();

    console.log("✅ Silinmiş okullar Master DB'den temizlendi");

    // Kaydet
    console.log("\n💾 Master DB kaydediliyor...");

    const newBinaryData = masterDB.export();
    const newBase64Data = Buffer.from(newBinaryData).toString("base64");
    const newEncryptedData = encrypt(newBase64Data, masterKey);

    // Dosya izinlerini kaldır (Windows)
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        execSync(`attrib -h -s "${masterDbPath}"`, { stdio: "ignore" });
        console.log("🔓 Dosya izinleri kaldırıldı");
      } catch (err) {
        console.warn("⚠️ İzin kaldırma hatası");
      }
    }

    fs.writeFileSync(masterDbPath, newEncryptedData, "utf8");

    // Tekrar gizle (Windows)
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        execSync(`attrib +h +s "${masterDbPath}"`, { stdio: "ignore" });
        console.log("🔒 Dosya tekrar gizlendi");
      } catch (err) {
        console.warn("⚠️ Gizleme hatası");
      }
    }

    console.log("✅ Master DB kaydedildi");

    // Okul DB dosyalarını da sil (opsiyonel)
    console.log("\n🗑️ Okul DB dosyaları siliniyor...");

    silinecekler.forEach((okul) => {
      const dbFileName = `okul_${okul.okul_kodu}.db`;
      const dbPath = path.join(veritabaniKlasoru, dbFileName);

      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
          console.log(`   ✅ Silindi: ${dbFileName}`);
        } catch (err) {
          console.warn(`   ⚠️ Silinemedi: ${dbFileName}`);
        }
      } else {
        console.log(`   ℹ️ Zaten yok: ${dbFileName}`);
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log("🎉 TEMİZLİK TAMAMLANDI!");
    console.log("=".repeat(60));
    console.log(`✅ ${silinecekSayisi} okul kalıcı olarak silindi`);
    console.log("\n📋 SONRAKİ ADIM:");
    console.log("   npm start");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ HATA:", error.message);
    console.error("Stack:", error.stack);
  }
}

cleanDeletedSchools();
