/**
 * ============================================
 * CONSTRAINT PREPROCESSOR V3 - Gelişmiş Veri Hazırlayıcı
 * ============================================
 * Çizelgeleme sürecinden önce girdi verilerini (dersler, öğretmenler, kısıtlar)
 * doğrular, temizler, standartlaştırır ve istatistiklerini çıkarır.
 */

class ConstraintPreprocessor {
  constructor(config = {}) {
    this.config = {
      enableValidation: true,
      enableConsistencyCheck: true, // Tutarlılık Kontrolü eklendi
      ...config,
    };

    this.preprocessedData = null;
    this.stats = this.resetStats();

    console.log("🔧 ConstraintPreprocessor V3 başlatıldı");
  }

  resetStats() {
    return {
      totalLessons: 0,
      totalTeachers: 0,
      totalClasses: 0,
      totalConstraints: 0,
      totalPreferences: 0,
      totalExpectedHours: 0,
      processingTime: 0,
      warnings: [],
      errors: [],
    };
  }

  // ============================================
  // ANA PREPROCESSING FONKSİYONU
  // ============================================
  /**
   * Girdi verilerini asenkron olarak işler ve doğrular.
   * @param {Object} data - Ham girdi verisi (lessons, teachers, classes, constraints, preferences).
   * @returns {Promise<Object>} İşlenmiş veri ve istatistikler.
   */
  async preprocess(data) {
    console.log("\n🔧 CONSTRAINT PREPROCESSING V3 BAŞLADI");
    console.log("=".repeat(50));

    this.stats = this.resetStats();
    const startTime = Date.now();

    try {
      if (this.config.enableValidation) {
        this.validateDataStructure(data); // 1. Yapısal Doğrulama
      }

      this.calculateStats(data); // 2. İstatistik Hesaplama

      if (this.config.enableConsistencyCheck) {
        await this.checkDataConsistency(data); // 3. Veri Tutarlılığı Kontrolü (Asenkron simülasyon)
      }

      // Sonuç objesi oluşturma
      const processingTime = Date.now() - startTime;
      this.stats.processingTime = processingTime;

      const result = {
        valid: this.stats.errors.length === 0,
        data: {
          lessons: data.lessons || [],
          teachers: data.teachers || [],
          classes: data.classes || [],
          constraints: data.constraints || {},
          preferences: data.preferences || {},
        },
        stats: this.stats,
        processingTime: processingTime,
      };

      this.preprocessedData = result;
      this.printReport();

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("❌ Preprocessing Kritik Hatası:", error.message);

      return {
        valid: false,
        error: error.message,
        data: data,
        stats: { ...this.stats, processingTime },
      };
    }
  }

  // ============================================
  // YAPISAL DOĞRULAMA (HARD VALIDATION)
  // ============================================
  validateDataStructure(data) {
    if (!data) throw new Error("Data objesi bulunamadı!");

    // Temel yapı kontrolü ve varsayılan değer atama
    ["lessons", "teachers", "classes"].forEach((key) => {
      if (!data[key]) {
        this.stats.warnings.push(
          `'${key}' verisi bulunamadı, boş array varsayılacak.`
        );
        data[key] = [];
      } else if (!Array.isArray(data[key])) {
        throw new Error(`data.${key} bir Array olmalı!`);
      }
    });

    ["constraints", "preferences"].forEach((key) => {
      if (!data[key]) {
        this.stats.warnings.push(
          `'${key}' verisi bulunamadı, boş obje varsayılacak.`
        );
        data[key] = {};
      } else if (typeof data[key] !== "object" || Array.isArray(data[key])) {
        throw new Error(`data.${key} bir Object olmalı!`);
      }
    });

    console.log("  ✅ Yapısal Doğrulama tamamlandı.");
  }

  // ============================================
  // VERİ TUTARLILIĞI KONTROLÜ (SOFT VALIDATION)
  // ============================================
  async checkDataConsistency(data) {
    // Asenkron bir I/O veya uzun süren bir kontrol simülasyonu
    await new Promise((resolve) => setTimeout(resolve, 50));

    const teacherIds = new Set(data.teachers.map((t) => t.id));
    const classIds = new Set(data.classes.map((c) => c.id));

    data.lessons.forEach((lesson, index) => {
      // Öğretmen ID'si var mı?
      if (lesson.teacherId && !teacherIds.has(lesson.teacherId)) {
        this.stats.errors.push(
          `Ders ID ${lesson.id}: Öğretmen ID '${lesson.teacherId}' öğretmenler listesinde yok (Kritik).`
        );
      }

      // Sınıf ID'si var mı?
      if (lesson.classId && !classIds.has(lesson.classId)) {
        this.stats.errors.push(
          `Ders ID ${lesson.id}: Sınıf ID '${lesson.classId}' sınıflar listesinde yok (Kritik).`
        );
      }

      // Haftalık saat kontrolü
      if (typeof lesson.weeklyHours !== "number" || lesson.weeklyHours <= 0) {
        this.stats.warnings.push(
          `Ders ID ${lesson.id}: weeklyHours geçersiz, varsayılan 2 kullanılacak.`
        );
        lesson.weeklyHours = 2; // Veriyi temizle
      }
    });

    console.log("  ✅ Veri Tutarlılığı Kontrolü tamamlandı.");
  }

  // ============================================
  // İSTATİSTİKLER
  // ============================================
  calculateStats(data) {
    this.stats.totalLessons = data.lessons?.length || 0;
    this.stats.totalTeachers = data.teachers?.length || 0;
    this.stats.totalClasses = data.classes?.length || 0;

    this.stats.totalConstraints = data.constraints
      ? Object.keys(data.constraints).length
      : 0;

    this.stats.totalPreferences = data.preferences
      ? Object.keys(data.preferences).length
      : 0;

    // Toplam beklenen saat
    this.stats.totalExpectedHours = data.lessons
      ? data.lessons.reduce(
          (total, lesson) => total + (lesson.weeklyHours || 0),
          0
        )
      : 0;

    console.log("  ✅ İstatistikler hesaplandı.");
  }

  // ============================================
  // RAPOR
  // ============================================
  printReport() {
    if (!this.preprocessedData) {
      console.log("⚠️ Henüz preprocessing yapılmadı.");
      return;
    }

    const report = this.preprocessedData;

    console.log("\n📊 CONSTRAINT PREPROCESSING RAPORU V3");
    console.log("=".repeat(50));
    console.log(
      `  ✅ DURUM: ${report.valid ? "GEÇERLİ" : "GEÇERSİZ (Hata Var)"}`
    );
    console.log("\n📈 Özet:");
    console.log(`  • Dersler: ${this.stats.totalLessons}`);
    console.log(`  • Öğretmenler: ${this.stats.totalTeachers}`);
    console.log(`  • Sınıflar: ${this.stats.totalClasses}`);
    console.log(`  • Kısıtlar: ${this.stats.totalConstraints}`);
    console.log(`  • Tercihler: ${this.stats.totalPreferences}`);
    console.log(`  • Beklenen Toplam Saat: ${this.stats.totalExpectedHours}`);
    console.log(`  ⏱️ İşlem Süresi: ${this.stats.processingTime}ms`);

    if (this.stats.warnings.length > 0) {
      console.log(`\n⚠️ Uyarılar (${this.stats.warnings.length}):`);
      this.stats.warnings
        .slice(0, 5)
        .forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
    }

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Kritik Hatalar (${this.stats.errors.length}):`);
      this.stats.errors
        .slice(0, 5)
        .forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }

    console.log("=".repeat(50) + "\n");
  }
}

// ============================================
// GLOBAL EXPORT
// ============================================
if (typeof window !== "undefined") {
  window.ConstraintPreprocessor = ConstraintPreprocessor;
  console.log("✅ ConstraintPreprocessor V3 yüklendi");
}
