/**
 * ============================================
 * VALIDATION ENGINE - Nihai Doğrulama Motoru
 * ============================================
 * Bir çizelge çözümünün tüm katı (hard) ve yumuşak (soft) kısıtlara
 * uygunluğunu kontrol eden, detaylı raporlama sağlayan modüldür.
 */
class ValidationEngine {
  /**
   * @param {Object} scheduler - Ana Çizelgeleme Motoru (Scoring fonksiyonuna erişim için).
   */
  constructor(scheduler) {
    this.scheduler = scheduler;
    console.log("📜 ValidationEngine başlatıldı: Nihai kural kontrolü aktif.");
  }

  /**
   * Bir çözümün tüm kurallara uygunluğunu kontrol eder ve detaylı bir rapor döndürür.
   * @param {Object} solution - Kontrol edilecek program çözümü.
   * @returns {Object} Hata ve uyarıların detaylı listesi.
   */
  validateFullSolution(solution) {
    console.log("\n📜 TAM ÇÖZÜM DOĞRULAMASI BAŞLADI");

    // Scoring Manager'dan detaylı skorları ve ihlalleri çek
    const detailedScore =
      this.scheduler.scoring.calculateDetailedScore(solution);

    const report = {
      isValid: detailedScore.hardViolations === 0,
      hardViolationsCount: detailedScore.hardViolations,
      softViolationsCount: detailedScore.softViolations,
      totalFitnessScore: detailedScore.totalFitness,
      hardErrors: detailedScore.hardErrors || [], // Hard kısıt ihlallerinin listesi
      softWarnings: detailedScore.softWarnings || [], // Soft kısıt/tercih ihlallerinin listesi
    };

    this.logValidationResults(report);

    return report;
  }

  /**
   * Doğrulama sonuçlarını konsola yazar.
   */
  logValidationResults(report) {
    if (report.isValid) {
      console.log(`[Validation] ✅ Çözüm Kritik Hatalardan Arındırıldı.`);
      console.log(
        `[Validation] 🟢 Yumuşak Uyarı Sayısı: ${report.softWarnings.length}`
      );
    } else {
      console.error(
        `[Validation] ❌ KRİTİK HATA BULUNDU! ${report.hardViolationsCount} Kritik İhlal mevcut.`
      );

      // İlk 5 kritik hatayı logla
      if (report.hardErrors.length > 0) {
        console.error("\n[Validation] 🚨 Kritik Hata Detayları (İlk 5):");
        report.hardErrors.slice(0, 5).forEach((error, index) => {
          console.error(
            `  ${index + 1}. [${error.rule}] - ${error.description}`
          );
        });
      }
    }
    console.log(
      `[Validation] 🎯 Nihai Fitness Skoru: ${report.totalFitnessScore}`
    );
    console.log("=".repeat(40));
  }
}

// Global erişime açma
if (typeof window !== "undefined") window.ValidationEngine = ValidationEngine;
