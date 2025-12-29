/**
 * ============================================
 * ADAPTIVE STRATEGY - Dinamik Algoritma Seçici
 * ============================================
 * Optimizasyonun mevcut durumuna, stabiliteye ve performansa göre
 * bir sonraki çalıştırılacak algoritmayı (Genetic, SA, Tabu vb.) seçer.
 *
 * Entegrasyon:
 * - SolutionStabilizer'dan gelen convergence ve oscillation durumları
 * - ScheduleScoring'den gelen hard/soft constraint ihlalleri
 */
class AdaptiveStrategy {
  /**
   * @param {Object} scheduler - Algoritmaları barındıran üst nesne (Genetik, SA, Tabu vb. erişimi için)
   * @param {Object} stabilizer - SolutionStabilizer nesnesi
   */
  constructor(scheduler, stabilizer) {
    this.scheduler = scheduler;
    this.stabilizer = stabilizer;
    this.algorithms = Object.keys(this.scheduler.algorithms);

    console.log("🧠 AdaptiveStrategy başlatıldı: Dinamik Strateji aktif.");
  }

  /**
   * Hangi algoritmanın mevcut durumda en iyi sonucu vereceğini belirler.
   * @param {Object} currentMetrics - Mevcut çözümün performans metrikleri (Scoring'den gelen detaylar).
   * @returns {string} Çalıştırılacak algoritmanın anahtarı ('genetic', 'sa', 'tabu', vb.).
   */
  selectNextAlgorithm(currentMetrics) {
    if (this.algorithms.length === 0) return null;

    const stabStats = this.stabilizer.getStats();

    // 1. Durum: Hard Constraint İhlali Var mı?
    // Bu, Scoring System tarafından dönen kritik ihlallere bakılarak anlaşılmalıdır.
    const hardViolations = currentMetrics.violations.filter(
      (v) => v.severity === "critical"
    ).length;

    if (hardViolations > 0) {
      // Hard Constraint ihlali varsa, ihlali hızla düzeltebilecek bir Local Search algoritmasına geç.
      // Genellikle Tabu Search veya Simulated Annealing, hızlı düzeltmelerde iyidir.
      if (this.algorithms.includes("tabu")) {
        console.log(
          "➡️ Adaptive: Yüksek Hard Violation. Tabu Search'e geçiliyor (Hızlı düzeltme)."
        );
        return "tabu";
      }
    }

    // 2. Durum: Convergence (Yakınsama) sağlandı mı?
    if (stabStats.converged) {
      // Yakınsama sağlandıysa, daha geniş bir uzayda arama yapması için Genetic Algorithm'a (Daha yüksek mutation rate ile) geri dön.
      // VEYA algoritmayı durdur.
      console.log(
        "➡️ Adaptive: Convergence sağlandı. Exploration (Genetic) artırılıyor."
      );
      return "genetic";
    }

    // 3. Durum: Oscillation (Salınım) tespit edildi mi?
    if (stabStats.oscillations > 0) {
      // Salınım varsa, komşu çözümleri daha katı inceleyen veya kabul eşiğini düşüren
      // Simulated Annealing veya Tabu Search'e geç.
      if (this.algorithms.includes("sa")) {
        console.log(
          "➡️ Adaptive: Oscillation tespit edildi. Simulated Annealing'e geçiliyor (Daha sıkı kabul)."
        );
        return "sa";
      }
    }

    // 4. Durum: Genel Durum (Varsayılan)
    // Stabilite düşükse (daha çok keşif), Stabilite yüksekse (daha çok yerel arama)
    if (stabStats.stability.score < 0.7) {
      // Keşfetmeye devam et (Genetik uygun)
      if (this.algorithms.includes("genetic")) {
        console.log(
          "➡️ Adaptive: Düşük stabilite. Genetic Algorithm ile keşfe devam."
        );
        return "genetic";
      }
    }

    // Varsayılan olarak rastgele veya ilk algoritmayı döndür
    const currentIndex = this.algorithms.indexOf(
      this.scheduler.currentAlgorithm
    );
    const nextIndex = (currentIndex + 1) % this.algorithms.length;

    return this.algorithms[nextIndex];
  }
}
// Global erişime açma
if (typeof window !== "undefined") window.AdaptiveStrategy = AdaptiveStrategy;
