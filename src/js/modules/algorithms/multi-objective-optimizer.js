/**
 * ============================================
 * MULTI-OBJECTIVE OPTIMIZER (MOO) - Çok Amaçlı İyileştirici
 * ============================================
 * Birden fazla amaç fonksiyonunu (Kısıt İhlali, Tercih Skoru, Denge, vb.)
 * aynı anda optimize ederek en iyi uzlaşık çözümleri (Pareto Front) bulur.
 */
class MultiObjectiveOptimizer {
  /**
   * @param {Object} scheduler - Ana Çizelgeleme Motoru (Scoring fonksiyonuna erişim için).
   */
  constructor(scheduler) {
    this.scheduler = scheduler;
    console.log(
      "⚖️ MultiObjectiveOptimizer başlatıldı: Çok Kriterli İyileştirme aktif."
    );
  }

  /**
   * Bir çözümün birden fazla kritere göre skorlarını hesaplar.
   * Burası gerçek bir MOO algoritmasının skor/amaç vektörünü oluşturduğu yerdir.
   * @param {Object} solution - Değerlendirilecek çözüm.
   * @returns {Object} Amaç skorları (minimize/maximize edilmek üzere).
   */
  calculateObjectiveVector(solution) {
    // Scoring Manager'dan detaylı skorları al
    const detailedScore =
      this.scheduler.scoring.calculateDetailedScore(solution);

    // Gerçek MOO amaçları:
    return {
      // 1. Amaç: Hard Constraint İhlallerini MİNİMİZE et
      hardViolation: detailedScore.hardViolations, // Minimize et (negatif bir değer olmalı)

      // 2. Amaç: Soft Constraint/Preference Skorunu MAKSİMİZE et
      preferenceScore: detailedScore.preferenceScore, // Maximize et

      // 3. Amaç: Öğretmen Yük Dengesizliğini MİNİMİZE et (Örn: standart sapma)
      loadImbalance: detailedScore.loadImbalance || 0, // Minimize et
    };
  }

  /**
   * Popülasyon içerisinden Domine Edilmeyen çözümleri (Pareto Cephesi) bulur.
   * (Basitleştirilmiş Domination Kontrolü)
   * @param {Object[]} population - Çözüm popülasyonu.
   * @returns {Object[]} Pareto optimal çözümler.
   */
  findParetoFront(population) {
    if (population.length === 0) return [];

    console.log(`[MOO] ${population.length} çözümden Pareto cephesi aranıyor.`);

    // Her çözüme amaç vektörünü ve fitness skorunu ekle
    const evaluatedPopulation = population.map((sol) => ({
      solution: sol,
      objectives: this.calculateObjectiveVector(sol),
    }));

    const paretoFront = [];

    for (let i = 0; i < evaluatedPopulation.length; i++) {
      let isDominated = false;

      for (let j = 0; j < evaluatedPopulation.length; j++) {
        if (i === j) continue;

        // Eğer j çözümü, i çözümünü domine ediyorsa
        if (this.dominates(evaluatedPopulation[j], evaluatedPopulation[i])) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        paretoFront.push(evaluatedPopulation[i].solution);
      }
    }

    console.log(`[MOO] Pareto Cephesi bulundu: ${paretoFront.length} çözüm.`);
    return paretoFront;
  }

  /**
   * A çözümünün B çözümünü domine edip etmediğini kontrol eder.
   * (hardViolation minimize edilir, preferenceScore maximize edilir, loadImbalance minimize edilir)
   */
  dominates(solutionA, solutionB) {
    const objA = solutionA.objectives;
    const objB = solutionB.objectives;

    // Tüm amaçlarda A, B'den daha iyi VEYA eşit olmalı
    const isBetterOrEqual =
      objA.hardViolation <= objB.hardViolation && // Minimize
      objA.preferenceScore >= objB.preferenceScore && // Maximize
      objA.loadImbalance <= objB.loadImbalance; // Minimize

    // En az bir amaçta A, B'den kesinlikle daha iyi olmalı
    const isStrictlyBetter =
      objA.hardViolation < objB.hardViolation ||
      objA.preferenceScore > objB.preferenceScore ||
      objA.loadImbalance < objB.loadImbalance;

    return isBetterOrEqual && isStrictlyBetter;
  }
}

// Global erişime açma
if (typeof window !== "undefined")
  window.MultiObjectiveOptimizer = MultiObjectiveOptimizer;
