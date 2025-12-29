// ==========================================
// 💾 CACHE MANAGER - GÜVENLİ VERSİYON
// ==========================================
// Modal ve statik dosyaların cache sorunlarını çözer
// Her güncelleme sonrası otomatik temizlik
//
// @author SİMRE/MK
// @version 2.0.0
// ==========================================

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class CacheManager {
  constructor() {
    this.cacheDir = app.getPath("userData");
    this.appVersion = app.getVersion();
    this.versionFile = path.join(this.cacheDir, ".app-version");

    console.log("🗂️ Cache Manager başlatıldı");
    console.log(`📁 Cache dizini: ${this.cacheDir}`);
    console.log(`📦 Mevcut versiyon: ${this.appVersion}`);
  }

  /**
   * Uygulama açılışında versiyon kontrolü yap
   * Yeni versiyon varsa cache'i temizle
   */
  async checkAndClearIfNeeded() {
    try {
      console.log("🔍 Versiyon kontrolü yapılıyor...");

      // Önceki versiyon dosyası var mı?
      if (!fs.existsSync(this.versionFile)) {
        console.log("📝 İlk kurulum tespit edildi");
        this.saveCurrentVersion();
        return { cleared: false, reason: "first_install" };
      }

      // Önceki versiyonu oku
      const previousVersion = fs.readFileSync(this.versionFile, "utf8").trim();
      console.log(`📜 Önceki versiyon: ${previousVersion}`);
      console.log(`📦 Mevcut versiyon: ${this.appVersion}`);

      // Versiyon değişti mi?
      if (previousVersion !== this.appVersion) {
        console.log("🔄 YENİ VERSİYON TESPİT EDİLDİ!");
        console.log("🧹 Cache temizleniyor...");

        await this.clearCache();
        this.saveCurrentVersion();

        return {
          cleared: true,
          reason: "version_update",
          oldVersion: previousVersion,
          newVersion: this.appVersion,
        };
      }

      console.log("✅ Versiyon değişmedi, cache temizliği atlandı");
      return { cleared: false, reason: "same_version" };
    } catch (error) {
      console.error("❌ Versiyon kontrolü hatası:", error);
      return { cleared: false, reason: "error", error: error.message };
    }
  }

  /**
   * Cache'i temizle (ULTRA GÜVENLİ - FİNAL VERSİYON)
   */
  async clearCache() {
    try {
      console.log("🧹 Cache temizleme işlemi yürütülüyor...");

      const { session } = require("electron");
      const mainSession = session.defaultSession;

      // 1. HTTP Cache Temizliği
      await mainSession.clearCache();
      console.log("✅ HTTP cache temizlendi");

      // 2. Storage Data Temizliği (Parametreleri açıkça veriyoruz)
      await mainSession.clearStorageData({
        origin: null,
        storages: [
          "appcache",
          "cookies",
          "filesystem",
          "indexdb",
          "localstorage",
          "shadercache",
          "websql",
          "serviceworkers",
          "cachestorage",
        ],
        quotas: ["temporary", "persistent", "syncable"],
      });
      console.log("✅ Storage data temizlendi");

      // 3. Auth Cache (Eksik argüman hatası genelde buradan çıkar)
      // Eğer bu fonksiyonu kullanıyorsan boş bırakma, kullanmıyorsan silebilirsin.
      await mainSession.clearAuthCache();

      // 4. Log Temizliği
      try {
        this.clearOldLogs();
      } catch (e) {
        console.log("Log temizleme atlandı.");
      }

      console.log("🎉 Tüm cache işlemleri başarıyla tamamlandı.");
      return true;
    } catch (error) {
      // Hatanın hangi fonksiyondan geldiğini görmek için:
      console.error("❌ 99. Satır Civarı Hata Detayı:", error);
      return false;
    }
  }

  /**
   * Manuel cache temizleme (kullanıcı isteğiyle)
   */
  async manualClearCache(mainWindow = null) {
    try {
      console.log("🧹 Manuel cache temizleme başlatıldı...");

      const result = await this.clearCache();

      // mainWindow varsa ve geçerliyse event gönder
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          mainWindow.webContents.send("cache-cleared", {
            success: result,
            message: result
              ? "Cache başarıyla temizlendi! Uygulama yeniden yüklenecek..."
              : "Cache kısmen temizlendi, bazı işlemler başarısız oldu.",
          });

          // 2 saniye sonra sayfayı yeniden yükle
          if (result) {
            setTimeout(() => {
              if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.reload();
              }
            }, 2000);
          }
        } catch (err) {
          console.log("⚠️ Event gönderilemedi (window kapalı olabilir)");
        }
      }

      return result;
    } catch (error) {
      console.error("❌ Manuel temizleme hatası:", error);
      return false;
    }
  }

  /**
   * Mevcut versiyonu kaydet
   */
  saveCurrentVersion() {
    try {
      fs.writeFileSync(this.versionFile, this.appVersion, "utf8");
      console.log(`✅ Versiyon kaydedildi: ${this.appVersion}`);
    } catch (error) {
      console.error("❌ Versiyon kaydetme hatası:", error);
    }
  }

  /**
   * Eski log dosyalarını temizle (30 günden eski)
   */
  clearOldLogs() {
    try {
      const logsDir = path.join(this.cacheDir, "logs");

      if (!fs.existsSync(logsDir)) {
        return;
      }

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const files = fs.readdirSync(logsDir);
      let deletedCount = 0;

      files.forEach((file) => {
        try {
          const filePath = path.join(logsDir, file);
          const stats = fs.statSync(filePath);

          if (stats.mtimeMs < thirtyDaysAgo) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (err) {
          // Tek dosya hatası tüm işlemi durdurmasın
          console.log(`⚠️ ${file} silinemedi`);
        }
      });

      if (deletedCount > 0) {
        console.log(`🗑️ ${deletedCount} eski log dosyası silindi`);
      }
    } catch (error) {
      console.error("❌ Log temizleme hatası:", error);
    }
  }

  /**
   * Cache boyutunu hesapla (MB)
   */
  async getCacheSize() {
    try {
      const { session } = require("electron");
      const mainSession = session.defaultSession;

      // getCacheSize fonksiyonu varsa kullan
      if (typeof mainSession.getCacheSize === "function") {
        const size = await mainSession.getCacheSize();
        const sizeMB = (size / 1024 / 1024).toFixed(2);
        console.log(`📊 Cache boyutu: ${sizeMB} MB`);
        return sizeMB;
      } else {
        console.log("ℹ️ getCacheSize fonksiyonu mevcut değil");
        return "N/A";
      }
    } catch (error) {
      console.error("❌ Cache boyutu hesaplama hatası:", error);
      return "0.00";
    }
  }
}

module.exports = new CacheManager();
