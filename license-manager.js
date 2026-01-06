// ==========================================
// LİSANS YÖNETİM SİSTEMİ (NİHAİ SÜRÜM)
// AES-256 Şifreleme + Super Admin Desteği
// ==========================================

const crypto = require("crypto-js");
const fs = require("fs");
const path = require("path");

/**
 * MASTER KEY: Lisans oluşturma aracıyla BİREBİR aynı olmalıdır.
 */
const MASTER_KEY = "OYS-2025-SUPER-SECRET-KEY-XYZ123-MEHMET-KARC";

class LicenseManager {
  /**
   * 📥 FONKSİYON 1: Ham Metni (Content) Oku ve Doğrula
   */
  static readLicenseFromContent(content) {
    console.log("🔍 LicenseManager: İçerik doğrulama süreci başladı...");
    try {
      if (!content || content.length < 10) {
        console.error("❌ LicenseManager: Gelen içerik boş veya çok kısa!");
        return { success: false, error: "Lisans dosyası içeriği geçersiz!" };
      }

      // 1. AES Şifresini Çöz
      console.log("🔐 LicenseManager: AES şifresi çözülüyor...");
      const decrypted = crypto.AES.decrypt(content, MASTER_KEY);
      const jsonData = decrypted.toString(crypto.enc.Utf8);

      if (!jsonData) {
        console.error(
          "❌ LicenseManager: Şifre çözme başarısız! (MASTER_KEY uyuşmazlığı)"
        );
        return {
          success: false,
          error: "Lisans şifresi çözülemedi! Dosya bozuk veya anahtar yanlış.",
        };
      }

      // 2. JSON Parse
      const license = JSON.parse(jsonData);
      console.log(
        `📋 LicenseManager: [${license.okul_kodu}] için lisans verisi ayrıştırıldı.`
      );

      // 3. Dijital İmza Doğrulaması
      console.log("✍️ LicenseManager: Dijital imza kontrol ediliyor...");
      const calculatedSignature = this.createSignature(license);

      if (calculatedSignature !== license.imza) {
        console.error("❌ LicenseManager: İMZA UYUŞMAZLIĞI!");
        return {
          success: false,
          error: "Lisans imzası geçersiz! Dosya üzerinde oynanmış.",
        };
      }

      // 4. Tarih Kontrolü
      const now = new Date();
      const expiryDate = new Date(license.gecerlilik);
      if (now > expiryDate) {
        console.warn("⏰ LicenseManager: Lisans süresi dolmuş!");
        return {
          success: false,
          error: "Bu lisansın kullanım süresi dolmuştur!",
        };
      }

      console.log("✅ LicenseManager: Lisans başarıyla doğrulandı.");
      return { success: true, license: license };
    } catch (error) {
      console.error("💥 LicenseManager Kritik Hata:", error.message);
      return { success: false, error: "Sistem hatası: " + error.message };
    }
  }

  /**
   * 📂 FONKSİYON 2: Dosya Yolundan Oku
   */
  static readLicenseFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: "Belirtilen yolda lisans dosyası yok.",
        };
      }
      const content = fs.readFileSync(filePath, "utf8");
      return this.readLicenseFromContent(content);
    } catch (error) {
      return { success: false, error: "Dosya okuma hatası: " + error.message };
    }
  }

  /**
   * 🛠 YARDIMCI FONKSİYON: İmza Oluşturucu
   */
  static createSignature(license) {
    const rawData =
      String(license.okul_kodu) +
      String(license.okul_adi) +
      String(license.kullanici_adi) +
      String(license.sifre) +
      String(license.gecerlilik) +
      MASTER_KEY;

    return crypto.SHA256(rawData).toString();
  }
}

module.exports = LicenseManager;
