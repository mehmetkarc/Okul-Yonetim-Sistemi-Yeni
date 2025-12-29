/**
 * ============================================
 * CACHE MANAGER - Hızlı Önbellek Yönetimi
 * ============================================
 * Çizelgeleme motorunun performansını artırmak için
 * sıkça kullanılan veya pahalıya mal olan sonuçları
 * geçici olarak hafızada tutar (Memorization).
 */
class CacheManager {
  /**
   * @param {Object} scheduler - Ana Çizelgeleme Motoru (Opsiyonel, sadece referans için).
   */
  constructor(scheduler = null) {
    this.scheduler = scheduler;
    this.cache = new Map();
    // Varsayılan TTL (Time-To-Live): 60 saniye (60000ms)
    this.DEFAULT_EXPIRY = 60000;
    console.log("💾 CacheManager başlatıldı: Performans önbelleği aktif.");
  }

  /**
   * Bir anahtara göre değeri önbelleğe alır.
   * @param {string} key - Önbellek anahtarı.
   * @param {*} value - Önbelleğe alınacak değer.
   * @param {number} [expiry=60000] - Geçerlilik süresi (ms).
   */
  set(key, value, expiry = this.DEFAULT_EXPIRY) {
    if (typeof key !== "string" || !key) {
      console.error("[CacheManager] Geçersiz anahtar türü veya boş anahtar!");
      return;
    }
    this.cache.set(key, { value, timestamp: Date.now(), expiry });
    // console.log(`[Cache] Set: ${key}`);
  }

  /**
   * Bir anahtara göre önbellekten değeri çeker.
   * @param {string} key - Önbellek anahtarı.
   * @returns {*} Önbelleğe alınmış değer veya null.
   */
  get(key) {
    if (typeof key !== "string") return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Süresi dolmuşsa (TTL) kontrolü
    if (Date.now() - entry.timestamp > entry.expiry) {
      this.cache.delete(key);
      // console.log(`[Cache] Expired and Deleted: ${key}`);
      return null;
    }

    // console.log(`[Cache] Hit: ${key}`);
    return entry.value;
  }

  /**
   * Belirli bir anahtarı önbellekten siler.
   * @param {string} key - Silinecek anahtar.
   */
  delete(key) {
    if (typeof key === "string" && this.cache.delete(key)) {
      // console.log(`[Cache] Deleted: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Önbelleği tamamen temizler.
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[CacheManager] ✅ Önbellek temizlendi (${size} öğe silindi).`);
  }

  /**
   * Önbelleğin mevcut boyutunu döndürür.
   */
  size() {
    return this.cache.size;
  }
}

// Global erişime açma
if (typeof window !== "undefined") window.CacheManager = CacheManager;
