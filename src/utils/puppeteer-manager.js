// ==========================================
// 🎨 PUPPETEER MANAGER
// ==========================================
// Chrome otomatik bulma/indirme sistemi
// Her bilgisayarda PDF çalışır
//
// @author SİMRE/MK
// @version 1.0.0
// ==========================================

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class PuppeteerManager {
  constructor() {
    this.userDataPath = app.getPath("userData");
    this.puppeteerCachePath = path.join(
      this.userDataPath,
      ".cache",
      "puppeteer"
    );
    this.chromeStatusFile = path.join(this.userDataPath, ".chrome-status");

    // Cache path'i environment variable olarak set et
    process.env.PUPPETEER_CACHE_DIR = this.puppeteerCachePath;

    console.log("🎨 Puppeteer Manager başlatıldı");
    console.log(`📁 Cache Path: ${this.puppeteerCachePath}`);
  }

  /**
   * Chrome'u başlat (otomatik indirme ile)
   */
  async launchBrowser(options = {}) {
    try {
      console.log("🚀 Chrome başlatılıyor...");

      // Önce yerel Chrome'u dene
      const localChrome = this.findLocalChrome();

      if (localChrome) {
        console.log("✅ Sistem Chrome bulundu:", localChrome);
        return await this.launchWithPath(localChrome, options);
      }

      // Sistem Chrome yoksa Puppeteer Chrome'u dene
      console.log("🔍 Puppeteer Chrome aranıyor...");
      const puppeteerChrome = await this.findPuppeteerChrome();

      if (puppeteerChrome) {
        console.log("✅ Puppeteer Chrome bulundu:", puppeteerChrome);
        return await this.launchWithPath(puppeteerChrome, options);
      }

      // Hiçbiri yoksa indir
      console.log("📥 Chrome bulunamadı, indiriliyor...");
      await this.downloadChrome();

      const newChrome = await this.findPuppeteerChrome();
      if (newChrome) {
        console.log("✅ Chrome başarıyla indirildi ve başlatıldı");
        return await this.launchWithPath(newChrome, options);
      }

      throw new Error("Chrome indirilemedi veya bulunamadı!");
    } catch (error) {
      console.error("❌ Chrome başlatma hatası:", error);
      throw error;
    }
  }

  /**
   * Belirli bir path ile Chrome başlat
   */
  async launchWithPath(executablePath, options = {}) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
        ...options,
      });

      console.log("✅ Chrome başarıyla başlatıldı");
      return browser;
    } catch (error) {
      console.error("❌ Chrome başlatma hatası:", error);
      throw error;
    }
  }

  /**
   * Sistem Chrome'unu bul (Windows)
   */
  findLocalChrome() {
    const possiblePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(
        process.env.LOCALAPPDATA,
        "Google\\Chrome\\Application\\chrome.exe"
      ),
      path.join(
        process.env.PROGRAMFILES,
        "Google\\Chrome\\Application\\chrome.exe"
      ),
      path.join(
        process.env["PROGRAMFILES(X86)"],
        "Google\\Chrome\\Application\\chrome.exe"
      ),
    ];

    for (const chromePath of possiblePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        console.log("✅ Sistem Chrome bulundu:", chromePath);
        return chromePath;
      }
    }

    console.log("⚠️ Sistem Chrome bulunamadı");
    return null;
  }

  /**
   * Puppeteer'in indirdiği Chrome'u bul
   */
  async findPuppeteerChrome() {
    try {
      // Puppeteer cache dizinini kontrol et
      if (!fs.existsSync(this.puppeteerCachePath)) {
        console.log("📁 Puppeteer cache dizini yok, oluşturuluyor...");
        fs.mkdirSync(this.puppeteerCachePath, { recursive: true });
        return null;
      }

      // chrome klasörünü ara
      const chromeDir = path.join(this.puppeteerCachePath, "chrome");

      if (!fs.existsSync(chromeDir)) {
        console.log("⚠️ Puppeteer Chrome klasörü yok");
        return null;
      }

      // Chrome executable'ı bul (win64-* klasörlerinde)
      const versions = fs.readdirSync(chromeDir);

      for (const version of versions) {
        const versionPath = path.join(chromeDir, version);
        const chromePath = path.join(versionPath, "chrome-win", "chrome.exe");

        if (fs.existsSync(chromePath)) {
          console.log("✅ Puppeteer Chrome bulundu:", chromePath);
          return chromePath;
        }
      }

      console.log("⚠️ Puppeteer Chrome executable bulunamadı");
      return null;
    } catch (error) {
      console.error("❌ Puppeteer Chrome arama hatası:", error);
      return null;
    }
  }

  /**
   * Chrome'u indir (Puppeteer ile)
   */
  async downloadChrome() {
    try {
      console.log("📥 Chrome indiriliyor...");
      console.log("⏳ Bu işlem birkaç dakika sürebilir...");

      const browserFetcher = puppeteer.createBrowserFetcher({
        path: this.puppeteerCachePath,
      });

      const revisionInfo = await browserFetcher.download(
        "latest",
        (downloadedBytes, totalBytes) => {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(2);
          console.log(
            `📥 İndiriliyor: %${percent} (${downloadedBytes}/${totalBytes} bytes)`
          );
        }
      );

      console.log("✅ Chrome başarıyla indirildi!");
      console.log("📁 İndirme yolu:", revisionInfo.executablePath);

      // Durum dosyasını güncelle
      this.saveChromeStatus({
        downloaded: true,
        path: revisionInfo.executablePath,
        revision: revisionInfo.revision,
        date: new Date().toISOString(),
      });

      return revisionInfo.executablePath;
    } catch (error) {
      console.error("❌ Chrome indirme hatası:", error);
      throw error;
    }
  }

  /**
   * Chrome durumunu kaydet
   */
  saveChromeStatus(status) {
    try {
      fs.writeFileSync(
        this.chromeStatusFile,
        JSON.stringify(status, null, 2),
        "utf8"
      );
      console.log("✅ Chrome durumu kaydedildi");
    } catch (error) {
      console.error("❌ Chrome durumu kaydetme hatası:", error);
    }
  }

  /**
   * Chrome durumunu oku
   */
  getChromeStatus() {
    try {
      if (!fs.existsSync(this.chromeStatusFile)) {
        return { downloaded: false };
      }

      const status = JSON.parse(fs.readFileSync(this.chromeStatusFile, "utf8"));
      return status;
    } catch (error) {
      console.error("❌ Chrome durumu okuma hatası:", error);
      return { downloaded: false };
    }
  }

  /**
   * PDF oluştur (yardımcı fonksiyon)
   */
  async createPDF(html, outputPath, options = {}) {
    let browser = null;
    try {
      console.log("📄 PDF oluşturuluyor...");

      browser = await this.launchBrowser();
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: "networkidle0",
      });

      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "15mm",
          right: "15mm",
        },
        ...options,
      });

      console.log("✅ PDF başarıyla oluşturuldu:", outputPath);
      return { success: true, path: outputPath };
    } catch (error) {
      console.error("❌ PDF oluşturma hatası:", error);
      return { success: false, error: error.message };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new PuppeteerManager();
