/**
 * ============================================
 * HYBRID SOLVER - Karma Algoritma Çözücü
 * ============================================
 * Birden fazla optimizasyon algoritmasını (Örn: Yerleştirme, Tamamlama, Lokal Arama)
 * belirli bir stratejiye göre ardışık olarak çalıştırır.
 */
class HybridSolver {
  /**
   * @param {object} scheduler - Ana Scheduler objesine erişim (algoritmaları içerir).
   */
  constructor(scheduler) {
    this.scheduler = scheduler;
    window.logger?.info(
      "HybridSolver başlatıldı: Algoritma Zincirleme aktif.",
      null,
      "HybridSolver"
    );
  }

  /**
   * Birden fazla algoritmayı belirli bir sırayla zincirleme olarak çalıştırır.
   * Her algoritmanın çıktısı, bir sonraki algoritmanın girdisi olur.
   *
   * @param {Object} solution Başlangıç çözümü.
   * @param {string[]} chain Çalıştırılacak algoritma anahtarlarının sırası (Örn: ["Greedy", "HillClimbing", "RepairEngine"]).
   * @returns {Promise<Object>} Optimize edilmiş çözüm.
   */
  async runHybridChain(solution, chain) {
    let currentSolution = solution;
    const chainName = chain.join(" -> ");

    window.logger?.info(
      `Zincirleme çözüm başladı: ${chainName}`,
      { chain },
      "HybridSolver"
    );
    window.logger?.time("HybridSolver_Total");

    for (const algoKey of chain) {
      const algorithm = this.scheduler.algorithms[algoKey];

      if (!algorithm || typeof algorithm.solve !== "function") {
        window.logger?.error(
          `Tanımsız veya geçersiz algoritma anahtarı atlandı: ${algoKey}`,
          null,
          "HybridSolver"
        );
        continue;
      }

      window.logger?.group(`Çalışıyor: ${algoKey}`);
      window.logger?.time(`Algo_${algoKey}`);

      try {
        // Her algoritmayı mevcut çözüm (currentSolution) üzerinde çalıştır
        currentSolution = await algorithm.solve(currentSolution);

        const currentScore = currentSolution.metrics?.fitnessScore || "N/A";
        window.logger?.info(
          `Algoritma ${algoKey} tamamlandı. Skor: ${currentScore}`,
          currentSolution.metrics,
          "HybridSolver"
        );
      } catch (error) {
        window.logger?.error(
          `Algoritma ${algoKey} çalışırken hata oluştu. Zincir durduruldu.`,
          error,
          "HybridSolver"
        );
        // Hata durumunda, mevcut en iyi çözümü döndürerek devam edebiliriz
        break;
      } finally {
        window.logger?.timeEnd(`Algo_${algoKey}`);
        window.logger?.groupEnd();
      }
    }

    window.logger?.timeEnd("HybridSolver_Total");
    window.logger?.info(
      "Zincirleme çözüm tamamlandı.",
      currentSolution.metrics,
      "HybridSolver"
    );

    return currentSolution;
  }
}
// Global erişime açma
if (typeof window !== "undefined") window.HybridSolver = HybridSolver;
