// ==========================================
// SECURITY MANAGER - YÖNTEM C TAM GÜVENLİK
// ==========================================
// Türkiye'nin İlk Yapay Zeka Destekli Okul Yönetim Sistemi
// Güvenlik Yönetimi Modülü
//
// @author SİMRE/MK
// @version 3.0.0 SECURE
// @date 2025-01-02
//
// ÖZELLİKLER:
// - AES-256 Şifreleme
// - SHA-256 Hash
// - Makine ID Bazlı Anahtar
// - Çoklu Kullanıcı Desteği (5 kişi)
// - Yedekleme Altyapısı
// ==========================================

const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class SecurityManager {
  constructor() {
    // Güvenlik dosyaları klasörü
    this.securityDir = path.join(app.getPath("userData"), ".security");

    // Admin şifre dosyası (gizli)
    this.adminKeyFile = path.join(this.securityDir, ".admin.key");

    // Çoklu kullanıcı dosyası
    this.multiUserFile = path.join(this.securityDir, ".users.dat");

    // Makine ID dosyası
    this.machineIdFile = path.join(this.securityDir, ".machine.id");

    // Yedekleme anahtarı dosyası
    this.backupKeyFile = path.join(this.securityDir, ".backup.key");

    // Klasör yoksa oluştur
    if (!fs.existsSync(this.securityDir)) {
      fs.mkdirSync(this.securityDir, { recursive: true });

      // Klasörü gizle (Windows)
      if (process.platform === "win32") {
        try {
          const { execSync } = require("child_process");
          execSync(`attrib +h "${this.securityDir}"`);
        } catch (err) {
          console.warn("⚠️ Klasör gizlenemedi:", err.message);
        }
      }
    }

    console.log("🔐 Security Manager başlatıldı");
  }

  // ==========================================
  // 1. MAKİNE ID YÖNETİMİ
  // ==========================================

  /**
   * Benzersiz makine ID'si oluştur veya oku
   */
  getMachineId() {
    try {
      // Makine ID dosyası varsa oku
      if (fs.existsSync(this.machineIdFile)) {
        const machineId = fs.readFileSync(this.machineIdFile, "utf8").trim();
        console.log("📟 Mevcut Makine ID:", machineId.substring(0, 16) + "...");
        return machineId;
      }

      // Yoksa yeni oluştur
      const machineId = this.generateMachineId();
      fs.writeFileSync(this.machineIdFile, machineId, "utf8");

      console.log(
        "✅ Yeni Makine ID oluşturuldu:",
        machineId.substring(0, 16) + "..."
      );
      return machineId;
    } catch (error) {
      console.error("❌ Makine ID hatası:", error);
      // Fallback: Rastgele ID
      return crypto.randomBytes(32).toString("hex");
    }
  }

  /**
   * Makine ID oluştur (CPU + MAC + Hostname)
   */
  generateMachineId() {
    const cpuInfo = os.cpus()[0].model;
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();

    // MAC adresi al (ilk network interface)
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
    } catch (err) {
      console.warn("⚠️ MAC adresi alınamadı");
    }

    // Tüm bilgileri birleştir ve hash'le
    const machineString = `${cpuInfo}-${hostname}-${platform}-${arch}-${macAddress}`;
    const machineId = crypto
      .createHash("sha256")
      .update(machineString)
      .digest("hex");

    return machineId;
  }

  // ==========================================
  // 2. MASTER KEY YÖNETİMİ
  // ==========================================

  /**
   * Master DB için benzersiz şifreleme anahtarı oluştur
   * Anahtar = SHA-256(Admin Şifresi + Makine ID)
   */
  generateMasterKey(adminPassword) {
    try {
      const machineId = this.getMachineId();
      const combinedString = `${adminPassword}-${machineId}-MASTER-2025`;

      // SHA-256 Hash
      const masterKey = crypto
        .createHash("sha256")
        .update(combinedString)
        .digest("hex");

      console.log("🔑 Master Key oluşturuldu (Her bilgisayar için farklı)");
      return masterKey;
    } catch (error) {
      console.error("❌ Master Key oluşturma hatası:", error);
      throw new Error("Master Key oluşturulamadı!");
    }
  }

  // ==========================================
  // 3. ŞİFRELEME / ŞİFRE ÇÖZME
  // ==========================================

  /**
   * AES-256-CBC ile şifrele
   */
  encrypt(text, key) {
    try {
      // IV (Initialization Vector) oluştur
      const iv = crypto.randomBytes(16);

      // Key'i 32 byte'a sabitle (AES-256 için)
      const keyBuffer = Buffer.from(key.substring(0, 64), "hex");

      // Cipher oluştur
      const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);

      // Şifrele
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      // IV + Encrypted birleştir (IV'yi başa ekle, çözme için gerekli)
      const result = iv.toString("hex") + ":" + encrypted;

      return result;
    } catch (error) {
      console.error("❌ Şifreleme hatası:", error);
      throw new Error("Şifreleme başarısız!");
    }
  }

  /**
   * AES-256-CBC ile şifre çöz
   */
  decrypt(encryptedText, key) {
    try {
      // IV ve encrypted kısmı ayır
      const parts = encryptedText.split(":");
      if (parts.length !== 2) {
        throw new Error("Geçersiz şifreli veri formatı!");
      }

      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];

      // Key'i 32 byte'a sabitle
      const keyBuffer = Buffer.from(key.substring(0, 64), "hex");

      // Decipher oluştur
      const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);

      // Şifreyi çöz
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("❌ Şifre çözme hatası:", error);
      throw new Error("Şifre çözme başarısız! Anahtar yanlış olabilir.");
    }
  }

  // ==========================================
  // 4. HASH FONKSİYONLARI
  // ==========================================

  /**
   * SHA-256 Hash
   */
  hash(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  /**
   * Şifre hash'le (PBKDF2 - daha güvenli)
   */
  hashPassword(password, salt = null) {
    try {
      // Salt yoksa oluştur
      if (!salt) {
        salt = crypto.randomBytes(16).toString("hex");
      }

      // PBKDF2 ile hash (100000 iterasyon)
      const hash = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");

      // Salt ve hash'i birleştir
      return `${salt}:${hash}`;
    } catch (error) {
      console.error("❌ Şifre hash hatası:", error);
      throw new Error("Şifre hash'lenemedi!");
    }
  }

  /**
   * Hash'lenmiş şifreyi doğrula
   */
  verifyPassword(password, hashedPassword) {
    try {
      // Salt ve hash'i ayır
      const [salt, originalHash] = hashedPassword.split(":");

      // Girilen şifreyi aynı salt ile hash'le
      const newHash = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");

      // Karşılaştır
      return newHash === originalHash;
    } catch (error) {
      console.error("❌ Şifre doğrulama hatası:", error);
      return false;
    }
  }

  // ==========================================
  // 5. ADMIN ŞİFRE YÖNETİMİ
  // ==========================================

  /**
   * İlk kurulum yapıldı mı kontrol et
   */
  isFirstSetup() {
    return !fs.existsSync(this.adminKeyFile);
  }

  /**
   * Superadmin şifresini ayarla (İlk kurulum)
   */
  setupAdminPassword(password) {
    try {
      // Güçlü şifre kontrolü
      if (!this.isStrongPassword(password)) {
        return {
          success: false,
          message:
            "Şifre en az 12 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir!",
        };
      }

      // Şifreyi hash'le
      const hashedPassword = this.hashPassword(password);

      // Dosyaya kaydet (şifreli)
      const machineId = this.getMachineId();
      const encryptedHash = this.encrypt(hashedPassword, machineId);

      fs.writeFileSync(this.adminKeyFile, encryptedHash, "utf8");

      console.log("✅ Superadmin şifresi başarıyla ayarlandı");

      return {
        success: true,
        message: "Superadmin şifresi başarıyla oluşturuldu!",
      };
    } catch (error) {
      console.error("❌ Admin şifre ayarlama hatası:", error);
      return {
        success: false,
        message: "Şifre ayarlanamadı: " + error.message,
      };
    }
  }

  /**
   * Superadmin şifresini doğrula
   */
  verifyAdminPassword(password) {
    try {
      // Dosya yoksa (ilk kurulum)
      if (!fs.existsSync(this.adminKeyFile)) {
        console.warn("⚠️ Admin şifre dosyası yok (İlk kurulum gerekli)");
        return false;
      }

      // Dosyayı oku
      const encryptedHash = fs.readFileSync(this.adminKeyFile, "utf8");

      // Şifreyi çöz
      const machineId = this.getMachineId();
      const hashedPassword = this.decrypt(encryptedHash, machineId);

      // Doğrula
      return this.verifyPassword(password, hashedPassword);
    } catch (error) {
      console.error("❌ Admin şifre doğrulama hatası:", error);
      return false;
    }
  }

  /**
   * Güçlü şifre kontrolü
   */
  isStrongPassword(password) {
    // En az 12 karakter
    if (password.length < 12) return false;

    // En az 1 büyük harf
    if (!/[A-Z]/.test(password)) return false;

    // En az 1 küçük harf
    if (!/[a-z]/.test(password)) return false;

    // En az 1 rakam
    if (!/[0-9]/.test(password)) return false;

    // En az 1 özel karakter
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;

    return true;
  }

  // ==========================================
  // 6. ÇOKLU KULLANICI YÖNETİMİ (5 KİŞİ)
  // ==========================================

  /**
   * Yeni kullanıcı ekle (Max 5 kişi)
   */
  addUser(username, password, fullName, role = "user") {
    try {
      // Mevcut kullanıcıları oku
      const users = this.getAllUsers();

      // Max 5 kullanıcı kontrolü
      if (users.length >= 5) {
        return {
          success: false,
          message: "Maksimum 5 kullanıcı eklenebilir!",
        };
      }

      // Kullanıcı adı benzersiz mi?
      if (users.find((u) => u.username === username)) {
        return {
          success: false,
          message: "Bu kullanıcı adı zaten kullanılıyor!",
        };
      }

      // Yeni kullanıcı oluştur
      const user = {
        id: Date.now(),
        username: username,
        password: this.hashPassword(password),
        fullName: fullName,
        role: role,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };

      users.push(user);

      // Kaydet
      this.saveUsers(users);

      console.log(`✅ Yeni kullanıcı eklendi: ${username}`);

      return {
        success: true,
        message: "Kullanıcı başarıyla eklendi!",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("❌ Kullanıcı ekleme hatası:", error);
      return {
        success: false,
        message: "Kullanıcı eklenemedi: " + error.message,
      };
    }
  }

  /**
   * Kullanıcı doğrula
   */
  verifyUser(username, password) {
    try {
      const users = this.getAllUsers();
      const user = users.find((u) => u.username === username);

      if (!user) {
        return {
          success: false,
          message: "Kullanıcı bulunamadı!",
        };
      }

      // Şifre kontrolü
      if (!this.verifyPassword(password, user.password)) {
        return {
          success: false,
          message: "Şifre yanlış!",
        };
      }

      // Son giriş zamanını güncelle
      user.lastLogin = new Date().toISOString();
      this.saveUsers(users);

      console.log(`✅ Kullanıcı girişi: ${username}`);

      return {
        success: true,
        message: "Giriş başarılı!",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      };
    } catch (error) {
      console.error("❌ Kullanıcı doğrulama hatası:", error);
      return {
        success: false,
        message: "Doğrulama hatası: " + error.message,
      };
    }
  }

  /**
   * Tüm kullanıcıları getir
   */
  getAllUsers() {
    try {
      if (!fs.existsSync(this.multiUserFile)) {
        return [];
      }

      // Dosyayı oku ve şifresini çöz
      const encryptedData = fs.readFileSync(this.multiUserFile, "utf8");
      const machineId = this.getMachineId();
      const decryptedData = this.decrypt(encryptedData, machineId);

      return JSON.parse(decryptedData);
    } catch (error) {
      console.error("❌ Kullanıcılar getirme hatası:", error);
      return [];
    }
  }

  /**
   * Kullanıcıları kaydet
   */
  saveUsers(users) {
    try {
      // JSON'a çevir
      const jsonData = JSON.stringify(users, null, 2);

      // Şifrele
      const machineId = this.getMachineId();
      const encryptedData = this.encrypt(jsonData, machineId);

      // Kaydet
      fs.writeFileSync(this.multiUserFile, encryptedData, "utf8");

      console.log("💾 Kullanıcılar kaydedildi");
    } catch (error) {
      console.error("❌ Kullanıcı kaydetme hatası:", error);
      throw error;
    }
  }

  /**
   * Kullanıcı sil
   */
  deleteUser(userId) {
    try {
      const users = this.getAllUsers();
      const filteredUsers = users.filter((u) => u.id !== userId);

      if (users.length === filteredUsers.length) {
        return {
          success: false,
          message: "Kullanıcı bulunamadı!",
        };
      }

      this.saveUsers(filteredUsers);

      console.log(`✅ Kullanıcı silindi: ID ${userId}`);

      return {
        success: true,
        message: "Kullanıcı başarıyla silindi!",
      };
    } catch (error) {
      console.error("❌ Kullanıcı silme hatası:", error);
      return {
        success: false,
        message: "Kullanıcı silinemedi: " + error.message,
      };
    }
  }

  // ==========================================
  // 7. YEDEKLEME ALTYAPISI
  // ==========================================

  /**
   * Yedekleme anahtarı oluştur
   */
  generateBackupKey() {
    try {
      // Rastgele 32 byte anahtar
      const backupKey = crypto.randomBytes(32).toString("hex");

      // Makine ID ile şifrele
      const machineId = this.getMachineId();
      const encryptedKey = this.encrypt(backupKey, machineId);

      // Kaydet
      fs.writeFileSync(this.backupKeyFile, encryptedKey, "utf8");

      console.log("🔑 Yedekleme anahtarı oluşturuldu");
      return backupKey;
    } catch (error) {
      console.error("❌ Yedekleme anahtarı oluşturma hatası:", error);
      throw error;
    }
  }

  /**
   * Yedekleme anahtarını getir
   */
  getBackupKey() {
    try {
      if (!fs.existsSync(this.backupKeyFile)) {
        return this.generateBackupKey();
      }

      const encryptedKey = fs.readFileSync(this.backupKeyFile, "utf8");
      const machineId = this.getMachineId();
      const backupKey = this.decrypt(encryptedKey, machineId);

      return backupKey;
    } catch (error) {
      console.error("❌ Yedekleme anahtarı getirme hatası:", error);
      throw error;
    }
  }

  /**
   * Dosyayı yedeklemek için şifrele
   */
  encryptBackup(fileBuffer) {
    try {
      const backupKey = this.getBackupKey();

      // Buffer'ı base64'e çevir
      const base64Data = fileBuffer.toString("base64");

      // Şifrele
      const encrypted = this.encrypt(base64Data, backupKey);

      console.log("💾 Yedek şifrelendi");
      return encrypted;
    } catch (error) {
      console.error("❌ Yedek şifreleme hatası:", error);
      throw error;
    }
  }

  /**
   * Şifreli yedeği geri yükle
   */
  decryptBackup(encryptedData) {
    try {
      const backupKey = this.getBackupKey();

      // Şifreyi çöz
      const base64Data = this.decrypt(encryptedData, backupKey);

      // Base64'ten buffer'a çevir
      const buffer = Buffer.from(base64Data, "base64");

      console.log("♻️ Yedek geri yüklendi");
      return buffer;
    } catch (error) {
      console.error("❌ Yedek geri yükleme hatası:", error);
      throw error;
    }
  }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = new SecurityManager();
