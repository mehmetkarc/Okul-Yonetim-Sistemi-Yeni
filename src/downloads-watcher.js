// ==========================================
// DOWNLOADS KLASÖRÜ İZLEYİCİ
// ==========================================

const chokidar = require("chokidar");
const path = require("path");
const os = require("os");
const fs = require("fs");

let watcher = null;
let onExcelDetected = null;

// Downloads klasörünü bul
function getDownloadsFolder() {
  return path.join(os.homedir(), "Downloads");
}

// İzlemeyi başlat
function startWatching(callback) {
  const downloadsPath = getDownloadsFolder();
  console.log("📁 Downloads klasörü izleniyor:", downloadsPath);

  onExcelDetected = callback;

  // E-Okul Excel dosyalarını izle (OOG ile başlayan)
  watcher = chokidar.watch(downloadsPath, {
    ignored: /(^|[\/\\])\../, // Gizli dosyaları yoksay
    persistent: true,
    ignoreInitial: true, // Mevcut dosyaları yoksay, sadece yenileri izle
    awaitWriteFinish: {
      stabilityThreshold: 2000, // 2 saniye bekle (dosya tamamen insin)
      pollInterval: 100,
    },
  });

  watcher.on("add", (filePath) => {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    console.log("📥 Yeni dosya tespit edildi:", fileName);

    // E-Okul Excel dosyası mı kontrol et
    if ((ext === ".xls" || ext === ".xlsx") && fileName.includes("OOG")) {
      console.log("✅ E-Okul Excel dosyası bulundu!");

      // 1 saniye bekle (dosya tamamen kapansın)
      setTimeout(() => {
        if (onExcelDetected) {
          onExcelDetected(filePath);
        }
      }, 1000);
    }
  });

  watcher.on("error", (error) => {
    console.error("❌ Watcher hatası:", error);
  });
}

// İzlemeyi durdur
function stopWatching() {
  if (watcher) {
    watcher.close();
    console.log("🛑 Downloads izleme durduruldu");
  }
}

module.exports = {
  startWatching,
  stopWatching,
  getDownloadsFolder,
};
