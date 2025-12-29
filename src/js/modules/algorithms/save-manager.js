/**
 * ============================================
 * SAVE MANAGER - Kayıt Yöneticisi
 * ============================================
 * Ders programı çözümlerini (solution) farklı varyantlar halinde yönetir ve kaydeder.
 * Çözümlerin performans skoruna (calculateScore) göre en iyisini takip eder.
 *
 * Özellikler:
 * - Multi-variant storage (Çoklu varyant depolama)
 * - Auto-save on improvement (İyileşme eşiğinde otomatik kaydetme)
 * - Version comparison (Varyant karşılaştırma)
 * - Quick restore (Hızlı geri yükleme)
 * - Export/Import (Dışa/içe aktarma)
 * - LocalStorage persistence (Kalıcı yerel depolama)
 */

class SaveManager {
  /**
   * Yapılandırıcı (Constructor)
   * @param {object} config - Yapılandırma ayarları
   */
  constructor(config = {}) {
    this.config = {
      maxVariants: 5, // Maksimum tutulacak varyant sayısı
      autoSave: true,
      saveThreshold: 10, // Otomatik kaydetme için minimum score artışı
      storageKey: "schedule_variants",
      compressionEnabled: false, // Sıkıştırma etkinleştirildi mi? (Gerçek kütüphane entegrasyonu gerekir)
      ...config,
    };

    this.variants = new Map(); // variantId -> variant data
    this.currentVariantId = null; // Şu anda aktif olan varyantın ID'si
    this.bestVariant = null; // En iyi score'a sahip varyant objesi

    this.stats = {
      totalSaves: 0,
      autoSaves: 0,
      manualSaves: 0,
      restores: 0,
      deletions: 0,
      // Yeni: Hata takibi
      storageErrors: 0,
    };

    // localStorage'dan yükle
    this.loadFromStorage();

    console.log("💾 SaveManager başlatıldı");
  }

  // ============================================
  // KAYDETME FONKSİYONLARI
  // ============================================

  /**
   * Yeni bir çözüm varyantını kaydeder.
   * @param {object} solution - Kaydedilecek ders programı çözümü
   * @param {object} metadata - Ek meta veriler (örneğin, Optimizer'dan gelenler)
   * @param {object} options - Kayıt seçenekleri
   * @returns {object} - Sonuç objesi
   */
  save(solution, metadata = {}, options = {}) {
    // ID oluşturma veya mevcut ID'yi kullanma
    const variantId = options.variantId || this.generateVariantId();
    const isAuto = options.auto || false;

    console.log(`💾 Kayıt: ${variantId} ${isAuto ? "(auto)" : "(manual)"}`);

    // Yeni varyant için score hesaplama
    const newScore = this.calculateScore(solution);

    // Variant oluşturma
    const variant = {
      id: variantId,
      // Çözümü derin kopyala (Solution'ın dışarıdan değişmesini engeller)
      solution: this.deepCopy(solution),
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        version: this.getNextVersion(),
        isAuto,
      },
      score: newScore,
      stats: this.extractStats(solution), // Çözümden çıkarılan hızlı istatistikler
    };

    // Ekle / Güncelle
    this.variants.set(variantId, variant);
    this.currentVariantId = variantId; // Kaydedilen varyantı aktif olarak ayarla

    // Max varyant kontrolü ve en eskisini silme
    if (this.variants.size > this.config.maxVariants) {
      this.removeOldestVariant();
    }

    // En iyi varyantı güncelle
    this.updateBestVariant(variant);

    // localStorage'a kaydet
    this.saveToStorage();

    // İstatistikleri güncelle
    this.stats.totalSaves++;
    isAuto ? this.stats.autoSaves++ : this.stats.manualSaves++;

    console.log(
      `  ✅ Kaydedildi: ${variantId} (score: ${variant.score.toFixed(2)})`
    );

    return {
      success: true,
      variantId,
      score: variant.score,
    };
  }

  /**
   * Belirli bir iyileşme eşiği aşıldığında otomatik kaydetme yapar.
   * @param {object} solution - Mevcut çözüm
   * @param {object} metadata - Ek meta veriler
   * @returns {object} - Sonuç objesi
   */
  autoSave(solution, metadata = {}) {
    if (!this.config.autoSave) {
      return { success: false, reason: "Auto-save disabled" };
    }

    const currentScore = this.calculateScore(solution);

    // En iyi varyant yoksa veya score yeterince iyileşmişse kaydet
    if (!this.bestVariant) {
      // İlk kaydı yap
      return this.save(solution, metadata, { auto: true });
    }

    const improvement = currentScore - this.bestVariant.score;

    if (improvement < this.config.saveThreshold) {
      console.log(
        `  ⏭️ Auto-save atlandı: yetersiz iyileşme (${improvement.toFixed(
          2
        )} / Eşik: ${this.config.saveThreshold})`
      );
      return { success: false, reason: "Insufficient improvement" };
    }

    return this.save(solution, metadata, { auto: true });
  }

  // ============================================
  // YÜKLEME FONKSİYONLARI
  // ============================================

  /**
   * Belirtilen varyantı geri yükler ve çözümünü döndürür.
   * @param {string} variantId - Geri yüklenecek varyantın ID'si
   * @returns {object} - Çözüm ve metadata içeren sonuç objesi
   */
  restore(variantId) {
    const variant = this.variants.get(variantId);

    if (!variant) {
      console.log(`❌ Variant bulunamadı: ${variantId}`);
      return { success: false, error: "Variant not found" };
    }

    console.log(`📥 Restore: ${variantId}`);

    this.currentVariantId = variantId;
    this.stats.restores++;

    console.log(`  ✅ Restore başarılı (score: ${variant.score.toFixed(2)})`);

    return {
      success: true,
      // Orijinal objenin korunması için derin kopya ile döndür
      solution: this.deepCopy(variant.solution),
      metadata: variant.metadata,
      score: variant.score,
    };
  }

  /**
   * En iyi score'a sahip varyantı geri yükler.
   * @returns {object} - Sonuç objesi
   */
  restoreBest() {
    if (!this.bestVariant) {
      console.log(`❌ En iyi variant yok`);
      return { success: false, error: "No best variant" };
    }

    console.log(`🏆 En iyi variant restore ediliyor: ${this.bestVariant.id}`);

    return this.restore(this.bestVariant.id);
  }

  // ============================================
  // VARIANT YÖNETİMİ
  // ============================================

  /**
   * Tüm varyantların özet listesini, score'a göre sıralanmış olarak döndürür.
   * @returns {Array<object>} - Varyant listesi
   */
  listVariants() {
    const list = [];

    for (const [id, variant] of this.variants.entries()) {
      list.push({
        id,
        score: variant.score,
        totalLessons: variant.stats.totalLessons, // Hızlı erişim için
        timestamp: variant.metadata.timestamp,
        version: variant.metadata.version,
        isAuto: variant.metadata.isAuto,
        isCurrent: id === this.currentVariantId,
        isBest: this.bestVariant && id === this.bestVariant.id,
      });
    }

    // Score'a göre azalan sırada sırala (En iyi en başta)
    list.sort((a, b) => b.score - a.score);

    return list;
  }

  /**
   * Belirtilen varyantı siler.
   * @param {string} variantId - Silinecek varyantın ID'si
   * @returns {object} - Sonuç objesi
   */
  deleteVariant(variantId) {
    if (!this.variants.has(variantId)) {
      return { success: false, error: "Variant not found" };
    }

    // Best variant veya Current variant siliniyorsa referansları güncelle
    if (this.bestVariant && this.bestVariant.id === variantId) {
      console.log(`⚠️ Best variant silindiği için yeniden hesaplanacak.`);
      this.bestVariant = null;
    }

    if (this.currentVariantId === variantId) {
      this.currentVariantId = null;
    }

    this.variants.delete(variantId);
    this.stats.deletions++;

    // Best variant'ı yeniden hesapla
    this.recalculateBestVariant();

    // localStorage'a kaydet
    this.saveToStorage();

    console.log(`🗑️ Variant silindi: ${variantId}`);

    return { success: true };
  }

  /**
   * Tüm varyantları siler ve depolamayı temizler.
   * @returns {object} - Sonuç objesi
   */
  clearAll() {
    const count = this.variants.size;

    this.variants.clear();
    this.currentVariantId = null;
    this.bestVariant = null;

    this.saveToStorage();

    console.log(`🗑️ Tüm ${count} variant silindi ve depolama güncellendi.`);

    return { success: true, count };
  }

  // ============================================
  // KARŞILAŞTIRMA
  // ============================================

  /**
   * İki varyant arasındaki score ve istatistik farklarını hesaplar.
   * @param {string} variantId1 - Birinci varyant ID
   * @param {string} variantId2 - İkinci varyant ID
   * @returns {object} - Karşılaştırma sonuçları
   */
  compare(variantId1, variantId2) {
    const v1 = this.variants.get(variantId1);
    const v2 = this.variants.get(variantId2);

    if (!v1 || !v2) {
      return { success: false, error: "Variant not found" };
    }

    const scoreDiff = v1.score - v2.score;
    const comparison = {
      variant1: { id: variantId1, score: v1.score, stats: v1.stats },
      variant2: { id: variantId2, score: v2.score, stats: v2.stats },
      scoreDiff: parseFloat(scoreDiff.toFixed(2)), // Score farkı
      better: scoreDiff > 0 ? variantId1 : scoreDiff < 0 ? variantId2 : "equal",
      statDiffs: {}, // İstatistik farkları
    };

    // Stat farklarını hesapla (v1 - v2)
    for (const key in v1.stats) {
      if (v2.stats[key] !== undefined) {
        comparison.statDiffs[key] = v1.stats[key] - v2.stats[key];
      }
    }

    return comparison;
  }

  // ============================================
  // EXPORT/IMPORT
  // ============================================

  /**
   * Belirtilen varyantı JSON dosyası olarak dışa aktarır (Tarayıcı ortamı gereklidir).
   * @param {string} variantId - Dışa aktarılacak varyant ID
   * @param {string} format - Dosya formatı (şimdilik sadece 'json')
   * @returns {object} - Sonuç objesi
   */
  exportVariant(variantId, format = "json") {
    const variant = this.variants.get(variantId);

    if (!variant) {
      return { success: false, error: "Variant not found" };
    }

    if (typeof window === "undefined" || !window.document) {
      console.warn("⚠️ Export işlemi tarayıcı ortamında çalıştırılmalıdır.");
      return {
        success: false,
        error: "Browser environment required for file export.",
      };
    }

    // Export yapısını oluştur
    const exportData = {
      _meta: {
        // İçe aktarma sırasında kontrol için
        exportedAt: new Date().toISOString(),
        version: "SaveManager v1.1.0",
      },
      variant: {
        id: variant.id,
        solution: variant.solution,
        metadata: variant.metadata,
        score: variant.score,
        stats: variant.stats,
      },
    };

    if (format === "json") {
      try {
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // İndirme işlemini tetikle
        const a = window.document.createElement("a");
        a.href = url;
        a.download = `variant_${variantId}_${new Date(
          variant.metadata.timestamp
        ).toLocaleDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url); // Bellek sızıntısını önle

        console.log(`💾 Variant export edildi: ${variantId}`);
        return { success: true, format: "json" };
      } catch (error) {
        console.error("Export hatası:", error);
        return { success: false, error: "Failed to create or download file." };
      }
    }

    return { success: false, error: "Unsupported format" };
  }

  /**
   * Harici bir veriyi (JSON string/objesi) varyant olarak içe aktarır.
   * @param {string|object} data - İçe aktarılacak varyant verisi
   * @returns {object} - Sonuç objesi
   */
  importVariant(data) {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      if (!parsed.variant || !parsed.variant.solution) {
        throw new Error("Geçersiz varyant verisi veya çözüm eksik.");
      }

      const newId = this.generateVariantId();

      // İçe aktarılan veriden yeni varyant objesini oluştur
      const variant = {
        id: newId,
        solution: parsed.variant.solution,
        metadata: {
          ...parsed.variant.metadata,
          importedAt: Date.now(),
          originalId: parsed.variant.id, // Orijinal ID'yi koru
          version: this.getNextVersion(),
          isAuto: false, // İçe aktarılan manuel kabul edilir
        },
        // Score ve stats yoksa yeniden hesapla
        score:
          parsed.variant.score || this.calculateScore(parsed.variant.solution),
        stats:
          parsed.variant.stats || this.extractStats(parsed.variant.solution),
      };

      this.variants.set(newId, variant);

      // Max varyant kontrolü
      if (this.variants.size > this.config.maxVariants) {
        this.removeOldestVariant();
      }

      this.updateBestVariant(variant);
      this.saveToStorage();

      console.log(
        `📥 Variant import edildi: ${newId} (Score: ${variant.score.toFixed(
          2
        )})`
      );

      return {
        success: true,
        variantId: newId,
        score: variant.score,
      };
    } catch (error) {
      console.error("Import hatası:", error.message);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // STORAGE İŞLEMLERİ
  // ============================================

  /**
   * Mevcut varyantları ve durumu tarayıcının LocalStorage'ına kaydeder.
   * @returns {boolean} - Başarılı/Başarısız
   */
  saveToStorage() {
    try {
      // Map'i kaydetmek için array'e dönüştür
      const data = {
        variants: Array.from(this.variants.entries()),
        currentVariantId: this.currentVariantId,
        bestVariant: this.bestVariant,
        stats: this.stats,
        timestamp: Date.now(),
      };

      let json = JSON.stringify(data);

      if (this.config.compressionEnabled) {
        // TODO: Buraya LZ-string gibi bir sıkıştırma mekanizması eklenebilir.
        console.warn("⚠️ Sıkıştırma etkin ancak implemente edilmedi.");
      }

      localStorage.setItem(this.config.storageKey, json);
      return true;
    } catch (error) {
      this.stats.storageErrors++;
      console.error("Storage save hatası (Boyut aşımı olabilir):", error);
      return false;
    }
  }

  /**
   * Verileri LocalStorage'dan yükler ve yöneticinin durumunu ayarlar.
   * @returns {boolean} - Başarılı/Başarısız
   */
  loadFromStorage() {
    try {
      let json = localStorage.getItem(this.config.storageKey);

      if (!json) {
        console.log("  ℹ️ Storage'da kayıt yok");
        return false;
      }

      if (this.config.compressionEnabled) {
        // TODO: Buraya sıkıştırma çözme mekanizması eklenebilir.
      }

      const data = JSON.parse(json);

      // Array'den Map'e geri dönüştür
      this.variants = new Map(data.variants);
      this.currentVariantId = data.currentVariantId;
      this.bestVariant = data.bestVariant;
      this.stats = { ...this.stats, ...data.stats }; // İstatistikleri birleştir

      console.log(`  ✅ Storage'dan yüklendi: ${this.variants.size} variant`);
      this.recalculateBestVariant(); // Best variant referansını kontrol et
      return true;
    } catch (error) {
      this.stats.storageErrors++;
      console.error("Storage load hatası (Veri bozuk olabilir):", error);
      this.clearStorage(); // Bozuk veriyi temizle
      return false;
    }
  }

  /**
   * LocalStorage'daki kaydı tamamen temizler.
   */
  clearStorage() {
    localStorage.removeItem(this.config.storageKey);
    console.log("🗑️ LocalStorage kaydı temizlendi");
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  /**
   * Benzersiz bir varyant ID'si oluşturur.
   * @returns {string} - Yeni ID
   */
  generateVariantId() {
    // Daha kısa ve öz ID
    return `V-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
  }

  /**
   * Geçerli varyant sayısına göre tahmini bir versiyon numarası döndürür.
   * @returns {number} - Versiyon numarası
   */
  getNextVersion() {
    // Versiyonu sadece kayıt sayısına göre değil, toplam kayıt sayısına göre ver
    return this.stats.totalSaves + 1;
  }

  /**
   * Bir çözümün kalitesini puanlayan basit bir fonksiyon.
   * Not: Gerçek bir uygulamada bu, `FairnessEngine` gibi bir yerden alınmalıdır.
   * @param {object} solution - Ders programı çözümü
   * @returns {number} - Score
   */
  calculateScore(solution) {
    // Basit örnek: Toplam ders sayısını puanla
    let score = 0;
    let totalLessons = 0;

    for (const classId in solution) {
      for (const day in solution[classId]) {
        totalLessons += Object.keys(solution[classId][day]).length;
      }
    }

    // Geçici bir score formülü: Her ders 10 puan, boşluklar -20 puan
    const stats = this.extractStats(solution);
    score = totalLessons * 10 - stats.gaps * 20;

    return Math.max(0, score); // Score 0'dan küçük olmasın
  }

  /**
   * Bir çözümden hızlı istatistikler çıkarır (Ders sayısı, boşluk vb.).
   * @param {object} solution - Ders programı çözümü
   * @returns {object} - İstatistikler
   */
  extractStats(solution) {
    let totalLessons = 0;
    let gaps = 0;
    let classes = Object.keys(solution).length;
    let teachers = new Set();

    for (const classId in solution) {
      for (const day in solution[classId]) {
        const slots = solution[classId][day];
        const times = Object.keys(slots)
          .map(Number)
          .sort((a, b) => a - b);
        totalLessons += times.length;

        for (const time in slots) {
          if (slots[time].teacherId) {
            teachers.add(slots[time].teacherId);
          }
        }

        // Boşlukları hesapla
        for (let i = 0; i < times.length - 1; i++) {
          gaps += times[i + 1] - times[i] - 1;
        }
      }
    }

    return {
      totalLessons,
      gaps,
      classes,
      teachers: teachers.size,
    };
  }

  /**
   * Yeni varyantı en iyi varyant ile karşılaştırır ve gerekiyorsa günceller.
   * @param {object} variant - Kontrol edilecek varyant
   */
  updateBestVariant(variant) {
    if (!this.bestVariant || variant.score > this.bestVariant.score) {
      this.bestVariant = variant;
      console.log(
        `  🏆 Yeni en iyi: ${variant.id} (score: ${variant.score.toFixed(2)})`
      );
    }
  }

  /**
   * Best variant referansı kaybolursa, Map'teki en iyiyi yeniden bulur.
   */
  recalculateBestVariant() {
    this.bestVariant = null; // Sıfırla

    for (const variant of this.variants.values()) {
      // updateBestVariant, mevcut bestVariant'ı kontrol ederek güncelleyecektir
      this.updateBestVariant(variant);
    }
  }

  /**
   * Maksimum varyant sayısını aşınca en eski ve en kötü varyantlardan birini siler.
   * Best veya Current varyant korunur.
   */
  removeOldestVariant() {
    let removable = null;
    let oldestTime = Infinity;

    // Önce en eski (ve Best/Current olmayan) varyantı bul
    for (const [id, variant] of this.variants.entries()) {
      const isProtected =
        (this.bestVariant && id === this.bestVariant.id) ||
        id === this.currentVariantId;

      if (!isProtected) {
        if (variant.metadata.timestamp < oldestTime) {
          oldestTime = variant.metadata.timestamp;
          removable = id;
        }
      }
    }

    if (removable) {
      console.log(`  🗑️ Max limit aşıldı. En eski silindi: ${removable}`);
      this.variants.delete(removable);
    }
  }

  /**
   * Verilen objenin derin kopyasını oluşturur.
   * @param {object} obj - Kopyalanacak nesne
   * @returns {object} - Yeni nesne
   */
  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ============================================
  // İSTATİSTİKLER VE RAPORLAMA
  // ============================================

  /**
   * Yöneticinin genel istatistiklerini ve durumunu döndürür.
   * @returns {object} - Detaylı istatistikler
   */
  getStats() {
    return {
      ...this.stats,
      totalVariants: this.variants.size,
      currentVariantId: this.currentVariantId,
      bestVariantId: this.bestVariant?.id,
      bestScore: this.bestVariant?.score,
      maxVariants: this.config.maxVariants,
      storageUsed: this.calculateStorageSize(),
    };
  }

  /**
   * LocalStorage'da kullanılan tahmini boyutu hesaplar.
   * @returns {string} - Boyut (KB)
   */
  calculateStorageSize() {
    if (
      typeof localStorage === "undefined" ||
      !localStorage.getItem(this.config.storageKey)
    ) {
      return "0 KB";
    }
    const json = localStorage.getItem(this.config.storageKey);
    // Her karakter 2 byte varsayılarak (UTF-16)
    return ((json.length * 2) / 1024).toFixed(2) + " KB";
  }

  /**
   * Detaylı bir raporu konsola yazdırır.
   */
  printReport() {
    const stats = this.getStats();
    const list = this.listVariants();

    console.log("\n💾 SAVE MANAGER RAPORU");
    console.log("=".repeat(50));

    // Genel İstatistikler Tablosu (Görsel Yardımcı)
    console.log("\n📊 İstatistikler:");
    console.table([
      {
        Metric: "Total Variants",
        Value: `${stats.totalVariants}/${stats.maxVariants}`,
      },
      { Metric: "Total Saves", Value: stats.totalSaves },
      { Metric: "Auto Saves", Value: stats.autoSaves },
      { Metric: "Manual Saves", Value: stats.manualSaves },
      { Metric: "Restores", Value: stats.restores },
      { Metric: "Deletions", Value: stats.deletions },
      { Metric: "Storage Used", Value: stats.storageUsed },
      { Metric: "Storage Errors", Value: stats.storageErrors },
    ]);

    //

    if (this.bestVariant) {
      console.log("\n🏆 En İyi Varyant:");
      console.log(`  • ID: ${this.bestVariant.id}`);
      console.log(`  • Score: ${this.bestVariant.score.toFixed(2)}`);
      console.log(
        `  • Version: ${this.bestVariant.metadata.version} (${new Date(
          this.bestVariant.metadata.timestamp
        ).toLocaleString()})`
      );
      console.log(
        `  • Ders/Boşluk: ${this.bestVariant.stats.totalLessons} ders, ${this.bestVariant.stats.gaps} boşluk`
      );
    }

    if (list.length > 0) {
      console.log("\n📋 Varyantlar Listesi (Score'a Göre Sıralı):");

      const variantTable = list.map((v) => {
        const badges = [];
        if (v.isCurrent) badges.push("AKTİF");
        if (v.isBest) badges.push("EN İYİ");
        if (v.isAuto) badges.push("OTO");

        return {
          ID: v.id,
          Score: v.score.toFixed(2),
          Ders: v.totalLessons,
          Durum: badges.join(", "),
          Versiyon: v.version,
        };
      });

      console.table(variantTable);
    }

    console.log("=".repeat(50) + "\n");
  }
}

// Global export
if (typeof window !== "undefined") {
  window.SaveManager = SaveManager;
  console.log("✅ SaveManager yüklendi");
}

// 🌍 Global erişim
window.SaveManager = SaveManager;
console.log("📦 SaveManager global erişim aktif!");
