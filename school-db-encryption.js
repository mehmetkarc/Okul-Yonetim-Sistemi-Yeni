const crypto = require("crypto");

/**
 * Okul Veritabanı Şifreleme Modülü
 * AES-256-GCM ile şifreleme
 */

class SchoolDBEncryption {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.keyLength = 32; // 256 bit
    this.ivLength = 16; // 128 bit
    this.saltLength = 64;
    this.tagLength = 16;
  }

  /**
   * Okul kodu + makine ID'den anahtar türet
   */
  deriveKey(okulKodu, machineId) {
    const salt = crypto
      .createHash("sha256")
      .update(`${okulKodu}-${machineId}-SALT`)
      .digest();

    const key = crypto.pbkdf2Sync(
      `${okulKodu}-${machineId}`,
      salt,
      100000,
      this.keyLength,
      "sha512"
    );

    return key;
  }

  /**
   * Veritabanı dosyasını şifrele
   */
  encryptDB(dbBuffer, okulKodu, machineId) {
    try {
      const key = this.deriveKey(okulKodu, machineId);
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(dbBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const tag = cipher.getAuthTag();

      // IV + Tag + Encrypted Data
      const result = Buffer.concat([iv, tag, encrypted]);

      return result;
    } catch (error) {
      throw new Error(`Şifreleme hatası: ${error.message}`);
    }
  }

  /**
   * Veritabanı dosyasının şifresini çöz
   */
  decryptDB(encryptedBuffer, okulKodu, machineId) {
    try {
      const key = this.deriveKey(okulKodu, machineId);

      // IV + Tag + Encrypted ayır
      const iv = encryptedBuffer.slice(0, this.ivLength);
      const tag = encryptedBuffer.slice(
        this.ivLength,
        this.ivLength + this.tagLength
      );
      const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error) {
      throw new Error(`Şifre çözme hatası: ${error.message}`);
    }
  }
}

module.exports = new SchoolDBEncryption();
