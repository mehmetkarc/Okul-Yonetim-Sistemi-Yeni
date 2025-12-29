/**
 * ============================================
 * QUALITY ASSURANCE - Nihai Kalite Güvencesi
 * ============================================
 * Bir çözümün sadece teknik doğruluğunu değil, aynı zamanda
 * estetik, denge ve insan faktörlerine uyum gibi "kalite" faktörlerini de ölçer.
 */
class QualityAssurance {
  /**
   * @param {object} scheduler - Scheduler objesi (metotları kullanmak için)
   */
  constructor(scheduler) {
    this.scheduler = scheduler; // İhtiyaç duyulursa dış metotlara erişim sağlar
    this.analysisResults = {}; // Son analiz sonuçlarını tutar

    console.log("✨ QualityAssurance başlatıldı: Nihai kalite analizi aktif.");
  }

  /**
   * Çözümün skordan bağımsız olarak estetik ve denge kalitesini ölçer.
   * @param {Object} solution - Program çözümü.
   * @returns {Object} Detaylı kalite metrikleri ve ihlal listesi.
   */
  check(solution) {
    console.log(
      "[QualityAssurance] DEBUG: Genel denge ve adalet kontrolü yapılıyor."
    );

    // --- 1. Temel Metriklerin Hesaplaması ---
    // Gerçek bir sistemde bu veriler DistributionAnalyzer, StatisticsManager'dan gelmelidir.
    const calculatedMetrics = this.calculateCoreMetrics(solution);

    // --- 2. Kalite Metrikleri Tanımı ---
    const metrics = {
      ...calculatedMetrics,
      // Bu değerler QA motoru tarafından verilen ideal değerlerdir.
      dailyLoadVariance: calculatedMetrics.dailyLoadVariance || 0.1, // Günlük ders yükü sapması (Düşük iyidir)
      teacherGapHours: calculatedMetrics.teacherGapHours || 0, // Öğretmen boşluk saatleri (Sıfır iyidir)
      preferenceHitRate: calculatedMetrics.preferenceHitRate || 0.95, // Tercih uyum oranı (Yüksek iyidir)
      hardConflicts: calculatedMetrics.hardConflicts || 0, // Sert çakışmalar (Sıfır olmalı)
      consecutiveLessons: calculatedMetrics.consecutiveLessons || 0, // Arka arkaya ders sayısı dengesi
    };

    // --- 3. İhlal (Issue) Tespiti ---
    const issuesList = this.detectIssues(metrics);

    // --- 4. Kalite Skoru Hesaplama (0-100) ---
    // (Tercih Oranı * 70) + (1 - Yük Sapması) * 20 - (Boşluk Cezası) * 10
    let qualityScore =
      metrics.preferenceHitRate * 70 +
      (1 - metrics.dailyLoadVariance) * 20 -
      metrics.teacherGapHours * 5; // Basitçe 5 puan ceza

    // Sert ihlaller varsa puanı düşür
    if (metrics.hardConflicts > 0) {
      qualityScore = 0; // Sert ihlal varsa kalite skoru 0 olmalı
    }

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    this.analysisResults = {
      score: qualityScore,
      metrics: metrics,
      conflicts: metrics.hardConflicts,
      violations: issuesList.filter((i) => i.type !== "SOFT").length,
      issues: issuesList, // İhlal listesi
    };

    console.log(
      `[QualityAssurance] ✅ Analiz tamamlandı. Kalite Skoru: ${qualityScore.toFixed(
        2
      )}`
    );

    // ScheduleAlgorithmV2'nin beklediği çıktı formatı
    return this.analysisResults;
  }

  /**
   * Placeholder metrik hesaplama mantığı (Gerçek verilerle doldurulmalı).
   * @param {object} solution - Program çözümü
   * @returns {object} - Hesaplanmış metrikler
   */
  calculateCoreMetrics(solution) {
    // Bu kısım, gerçek verilerle doldurulmalıdır.
    let totalGaps = 0;
    let totalLessons = 0;

    for (const classId in solution) {
      for (const day in solution[classId]) {
        const times = Object.keys(solution[classId][day])
          .map(Number)
          .sort((a, b) => a - b);
        totalLessons += times.length;
        for (let i = 0; i < times.length - 1; i++) {
          totalGaps += times[i + 1] - times[i] - 1;
        }
      }
    }

    return {
      // Varsayım
      teacherGapHours: totalGaps / (Object.keys(solution).length * 5), // Ortalama boşluk
      dailyLoadVariance: 0.1, // Varsayılan düşük sapma
      preferenceHitRate: 0.95, // Varsayılan yüksek uyum
      hardConflicts: 0, // Sıfır varsayımı
    };
  }

  /**
   * Hesaplanan metrikleri değerlendirerek ihlalleri listeler.
   * @param {object} metrics - Hesaplanan metrikler
   * @returns {Array<object>} - Tespit edilen sorunların listesi
   */
  detectIssues(metrics) {
    const issues = [];

    if (metrics.hardConflicts > 0) {
      issues.push({
        type: "HARD",
        description: `${metrics.hardConflicts} *Sert* çakışma (Örn: Aynı öğretmen aynı anda iki yerde) tespit edildi. Çözüm kullanılamaz.`,
        metric: "hardConflicts",
      });
    }

    if (metrics.teacherGapHours > 0.5) {
      issues.push({
        type: "WARNING",
        description: `Ortalama öğretmen boşluk süresi yüksek: ${metrics.teacherGapHours.toFixed(
          2
        )} saat. Çalışma günü dengesiz.`,
        metric: "teacherGapHours",
      });
    }

    if (metrics.preferenceHitRate < 0.8) {
      issues.push({
        type: "SOFT",
        description: `Öğretmen tercihlerine uyum oranı düşük: ${Math.round(
          metrics.preferenceHitRate * 100
        )}%. Kullanıcı memnuniyeti düşük olabilir.`,
        metric: "preferenceHitRate",
      });
    }

    // Diğer kalite kontrolleri buraya eklenebilir.

    return issues;
  }
}
// Global erişime açma
if (typeof window !== "undefined") window.QualityAssurance = QualityAssurance;
