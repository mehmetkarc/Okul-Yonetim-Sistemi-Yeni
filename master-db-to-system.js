const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// Security functions (önceki script'teki gibi)
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

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(key.substring(0, 64), "hex");

  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

async function convertMasterDB() {
  try {
    console.log("🔄 === MASTER.DB → .SYSTEM.DAT.SYS DÖNÜŞÜMÜ ===");

    const SQL = await initSqlJs();

    const veritabaniKlasoru = path.join(
      os.homedir(),
      "Documents",
      "OkulYonetimSistemi",
      "Veritabani"
    );

    const oldPath = path.join(veritabaniKlasoru, "master.db");
    const newPath = path.join(veritabaniKlasoru, ".system.dat.sys");

    console.log("📂 Kaynak:", oldPath);
    console.log("📂 Hedef:", newPath);

    if (!fs.existsSync(oldPath)) {
      console.error("❌ master.db bulunamadı!");
      return;
    }

    if (fs.existsSync(newPath)) {
      console.warn("⚠️ .system.dat.sys zaten var, yedekleniyor...");
      fs.copyFileSync(newPath, newPath + ".backup");
    }

    // Eski DB'yi oku
    console.log("📖 master.db okunuyor...");
    const binaryData = fs.readFileSync(oldPath);
    const masterDB = new SQL.Database(binaryData);

    console.log("✅ Master DB yüklendi");

    // Şifrele ve kaydet
    console.log("🔐 Şifreleniyor...");

    const newBinaryData = masterDB.export();
    const base64Data = Buffer.from(newBinaryData).toString("base64");
    const masterKey = generateMasterKey("Superadmin123!");
    const encryptedData = encrypt(base64Data, masterKey);

    fs.writeFileSync(newPath, encryptedData, "utf8");

    // Gizle (Windows)
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        execSync(`attrib +h +s "${newPath}"`, { stdio: "ignore" });
        console.log("🔒 Dosya gizlendi");
      } catch (err) {}
    }

    console.log("✅ .system.dat.sys oluşturuldu");

    // Eski dosyayı sil
    console.log("🗑️ Eski master.db siliniyor...");
    fs.unlinkSync(oldPath);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 DÖNÜŞÜM TAMAMLANDI!");
    console.log("=".repeat(60));
    console.log("\n📋 SONRAKİ ADIM:");
    console.log("   node clean-deleted-schools-standalone.js");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ HATA:", error.message);
  }
}

convertMasterDB();
