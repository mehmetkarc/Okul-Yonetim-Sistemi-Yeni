/**
 * =====================================================================
 * GLOBAL FITNESS HESAPLAMA FONKSİYONU (SOFT CONSTRAINT API)
 * * Bu fonksiyon, programın kalitesini ölçen bir "Fitness Skoru" (Uygunluk Puanı) döndürür.
 * Skor ne kadar düşükse, program o kadar iyidir.
 * =====================================================================
 *
 * @param {Object} scheduleData Programın tüm verilerini içeren JavaScript objesi (schedule.data).
 * @returns {number} Hesaplanan Fitness Skoru.
 */
window.calculateFullFitness = function (scheduleData) {
  // Dersleri yerleştirilemeyen (unplaced) saatler için yüksek ceza
  const UNPLACED_LESSON_PENALTY = 10000;

  // Öğretmen programındaki aradaki BOŞLUKLAR (Gaps) için ceza
  // Sizin istediğiniz "daha düzenli" kuralını tetikleyen temel ceza budur.
  const TEACHER_GAP_PENALTY = 200;

  // Öğretmenin bir gün içinde istediği maksimum ders saatini aşma cezası (Örn: 7'den sonrası)
  const MAX_HOURS_VIOLATION_PENALTY = 500;

  let totalFitnessScore = 0;

  // ===================================
  // 1. Öğretmen Boşluklarını (Gaps) Hesapla
  // ===================================
  // tId: { day: [period1, period2, ...] }
  const teacherDays = {};

  // Tüm programı dolaşarak hangi öğretmenin hangi gün hangi saatte dolu olduğunu bul
  for (const classId in scheduleData) {
    // 5 iş günü varsayımı (0:Pazartesi - 4:Cuma)
    for (let day = 0; day < 5; day++) {
      const daySchedule = scheduleData[classId][day];
      if (!daySchedule) continue;

      // 8 ders saati varsayımı (0-7)
      for (let period = 0; period < 8; period++) {
        const lessonSlot = daySchedule[period];

        if (lessonSlot && lessonSlot.teacherId) {
          const tId = lessonSlot.teacherId;

          if (!teacherDays[tId]) teacherDays[tId] = {};
          if (!teacherDays[tId][day]) teacherDays[tId][day] = [];

          teacherDays[tId][day].push(period);
        }
      }
    }
  }

  let totalGaps = 0;
  let totalMaxHoursViolations = 0;

  // Boşlukları (Gaps) hesapla
  for (const tId in teacherDays) {
    for (const day in teacherDays[tId]) {
      const periods = teacherDays[tId][day].sort((a, b) => a - b);

      if (periods.length === 0) continue;

      const firstPeriod = periods[0];
      const lastPeriod = periods[periods.length - 1];

      let dailyHours = 0;

      for (let p = firstPeriod; p <= lastPeriod; p++) {
        // Eğer bu saatte ders yoksa, bu bir BOŞLUK'tur (GAP).
        if (!periods.includes(p)) {
          totalGaps++;
        } else {
          dailyHours++;
        }
      }

      // Günlük maksimum saat kısıtı kontrolü (Örn: 7 saat)
      if (dailyHours > 7) {
        totalMaxHoursViolations += dailyHours - 7;
      }
    }
  }

  // ===================================
  // 2. Final Skoru Hesapla
  // ===================================

  // Hibrit optimizasyon aşamasında, yerleştirilemeyen ders sayısının 0 olduğu varsayılır.
  let unplacedLessonsCount = 0;

  totalFitnessScore += unplacedLessonsCount * UNPLACED_LESSON_PENALTY;
  totalFitnessScore += totalGaps * TEACHER_GAP_PENALTY;
  totalFitnessScore += totalMaxHoursViolations * MAX_HOURS_VIOLATION_PENALTY;

  // 💡 NOT: Fitness skorunun 0 olmaması için minimum bir temel skor eklemek faydalı olabilir,
  // ancak şu anki kurguyla devam ediyoruz.

  return totalFitnessScore;
};

/**
 * =====================================================================
 * HYBRID OPTIMIZER WRAPPER V1.0 (GÜNCELLENMİŞ)
 * =====================================================================
 *
 * Amaç: SimpleBlockScheduler'dan gelen geçerli çözümü meta-heuristic algoritmalarla optimize eder.
 */

class HybridOptimizerWrapper {
  constructor(config = {}) {
    this.config = {
      maxIterations: 1000,
      populationSize: 50,
      timeLimit: 60000, // 60 saniye
      algorithms: {
        genetic: true,
        sa: true,
        aco: false, // Yavaş olduğu için varsayılan kapalı
        tabu: false,
      },
      ...config,
    };

    this.stats = {
      startTime: null,
      endTime: null,
      totalIterations: 0,
      improvements: 0,
      initialFitness: 0,
      finalFitness: 0,
      algorithmResults: [],
    };

    console.log("🔥 HybridOptimizerWrapper V1.0 başlatıldı");
    console.log(
      "   ⚙️ Aktif algoritmalar:",
      Object.entries(this.config.algorithms)
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name.toUpperCase())
        .join(", ")
    );
  }
  /**
   * Ana optimizasyon fonksiyonu
   */

  async optimize(simpleBlockSchedule, programData, callbacks = {}) {
    console.log("\n" + "=".repeat(80));
    console.log("🔥 HYBRİT OPTİMİZASYON BAŞLIYOR");
    console.log("=".repeat(80));

    this.stats.startTime = Date.now();

    try {
      // 1. Format dönüşümü: SimpleBlock → Algorithm
      console.log("\n📦 1. FORMAT DÖNÜŞÜMÜ");
      const algoSchedule = ScheduleFormatConverter.simpleBlockToAlgo(
        simpleBlockSchedule,
        programData.lessons
      ); // 2. İlk fitness hesapla

      console.log("\n📊 2. İLK FİTNESS HESAPLAMA");
      const initialFitness = this.calculateInitialFitness(
        algoSchedule,
        programData
      );
      this.stats.initialFitness = initialFitness;
      console.log(`   📈 İlk fitness: ${initialFitness.toFixed(2)}`); // 3. Meta-heuristic optimizasyon

      console.log("\n🤖 3. META-HEURISTIC OPTİMİZASYON");
      const optimizedSchedule = await this.runMetaHeuristics(
        algoSchedule,
        programData,
        callbacks
      ); // 4. Final fitness hesapla

      console.log("\n📊 4. FINAL FİTNESS HESAPLAMA");
      const finalFitness = this.calculateFinalFitness(
        optimizedSchedule,
        programData
      );
      this.stats.finalFitness = finalFitness;
      console.log(`   📈 Final fitness: ${finalFitness.toFixed(2)}`);
      console.log(
        `   📈 İyileşme: ${(this.stats.initialFitness - finalFitness).toFixed(
          2
        )}` // Skor ne kadar düşükse o kadar iyi olduğu için farkı ters çevirdim.
      ); // 5. Format dönüşümü: Algorithm → SimpleBlock

      console.log("\n📦 5. GERİ DÖNÜŞÜM");
      const finalSchedule = ScheduleFormatConverter.algoToSimpleBlock(
        optimizedSchedule,
        programData.classes
      );

      this.stats.endTime = Date.now();
      const duration = (this.stats.endTime - this.stats.startTime) / 1000;

      console.log("\n" + "=".repeat(80));
      console.log("✅ HYBRİT OPTİMİZASYON TAMAMLANDI");
      console.log("=".repeat(80));
      console.log(`   ⏱️ Süre: ${duration.toFixed(2)} saniye`);
      console.log(`   📊 Toplam iterasyon: ${this.stats.totalIterations}`);
      console.log(`   📈 İyileşme sayısı: ${this.stats.improvements}`);
      console.log(
        `   🎯 Başlangıç fitness: ${this.stats.initialFitness.toFixed(2)}`
      );
      console.log(`   🏆 Final fitness: ${this.stats.finalFitness.toFixed(2)}`);
      console.log("=".repeat(80) + "\n");

      return {
        success: true,
        schedule: finalSchedule,
        fitness: finalFitness,
        stats: this.stats,
      };
    } catch (error) {
      console.error("❌ Hibrit optimizasyon hatası:", error);
      return {
        success: false,
        error: error.message,
        schedule: simpleBlockSchedule, // Orijinal çözümü geri döndür
        fitness: this.stats.initialFitness,
      };
    }
  }
  /**
   * Meta-heuristic algoritmaları çalıştır
   */

  async runMetaHeuristics(schedule, programData, callbacks) {
    let bestSchedule = schedule;
    let bestFitness = this.calculateInitialFitness(schedule, programData);

    const algorithms = []; // Aktif algoritmaları belirle

    if (this.config.algorithms.genetic) {
      algorithms.push({
        name: "GA",
        weight: 0.4,
        runner: () =>
          this.runGeneticAlgorithm(schedule, programData, callbacks),
      });
    }

    if (this.config.algorithms.sa) {
      algorithms.push({
        name: "SA",
        weight: 0.3,
        runner: () =>
          this.runSimulatedAnnealing(schedule, programData, callbacks),
      });
    }

    if (this.config.algorithms.aco) {
      algorithms.push({
        name: "ACO",
        weight: 0.2,
        runner: () => this.runAntColony(schedule, programData, callbacks),
      });
    }

    if (this.config.algorithms.tabu) {
      algorithms.push({
        name: "Tabu",
        weight: 0.1,
        runner: () => this.runTabuSearch(schedule, programData, callbacks),
      });
    } // Her algoritma sırayla çalıştır

    for (const algo of algorithms) {
      console.log(`\n   🤖 ${algo.name} çalıştırılıyor...`);

      try {
        const result = await algo.runner();

        if (result && result.schedule) {
          const fitness = this.calculateFinalFitness(
            result.schedule,
            programData
          );

          this.stats.algorithmResults.push({
            name: algo.name,
            fitness: fitness,
            iterations: result.iterations || 0,
          }); // Fitness skoru ne kadar KÜÇÜKSE, program o kadar İYİDİR.

          if (fitness < bestFitness) {
            bestSchedule = result.schedule;
            bestFitness = fitness;
            this.stats.improvements++;
            console.log(
              `      ✅ İyileşme! Yeni fitness: ${fitness.toFixed(2)}`
            );
          } else {
            console.log(
              `      ℹ️ İyileşme yok. Fitness: ${fitness.toFixed(2)}`
            );
          }

          this.stats.totalIterations += result.iterations || 0;
        }
      } catch (error) {
        console.error(`      ❌ ${algo.name} hatası:`, error.message);
      }
    }

    return bestSchedule;
  }
  /**
   * Genetic Algorithm çalıştır
   */

  async runGeneticAlgorithm(schedule, programData, callbacks) {
    if (typeof GeneticAlgorithm === "undefined") {
      console.warn("      ⚠️ GeneticAlgorithm yüklü değil!");
      return { schedule, iterations: 0 };
    }

    const ga = new GeneticAlgorithm({
      populationSize: this.config.populationSize,
      maxGenerations: Math.floor(this.config.maxIterations / 2),
      mutationRate: 0.1,
      crossoverRate: 0.8,
    });

    try {
      const result = await ga.evolve({
        initialSolution: schedule,
        data: programData,
        onProgress: callbacks.onProgress,
      });

      return {
        schedule: result.solution || schedule,
        iterations: result.iterations || 0,
        fitness: result.fitness || 0,
      };
    } catch (error) {
      console.error("      ❌ GA hatası:", error);
      return { schedule, iterations: 0 };
    }
  }
  /**
   * Simulated Annealing çalıştır
   */

  async runSimulatedAnnealing(schedule, programData, callbacks) {
    if (typeof SimulatedAnnealing === "undefined") {
      console.warn("      ⚠️ SimulatedAnnealing yüklü değil!");
      return { schedule, iterations: 0 };
    }

    const sa = new SimulatedAnnealing({
      initialTemp: 1000,
      coolingRate: 0.95,
      minTemp: 0.1,
      iterationsPerTemp: 50,
      maxTotalIterations: this.config.maxIterations,
    });

    try {
      const result = await sa.anneal({
        solution: schedule,
        data: programData,
        onProgress: callbacks.onProgress,
      });

      return {
        schedule: result.solution || schedule,
        iterations: result.iterations || 0,
        fitness: result.fitness || 0,
      };
    } catch (error) {
      console.error("      ❌ SA hatası:", error);
      return { schedule, iterations: 0 };
    }
  }
  /**
   * Ant Colony Optimization çalıştır
   */

  async runAntColony(schedule, programData, callbacks) {
    if (typeof AntColonyOptimization === "undefined") {
      console.warn("      ⚠️ AntColonyOptimization yüklü değil!");
      return { schedule, iterations: 0 };
    } // ACO implementasyonu...

    return { schedule, iterations: 0 };
  }
  /**
   * Tabu Search çalıştır
   */

  async runTabuSearch(schedule, programData, callbacks) {
    if (typeof TabuSearch === "undefined") {
      console.warn("      ⚠️ TabuSearch yüklü değil!");
      return { schedule, iterations: 0 };
    } // Tabu implementasyonu...

    return { schedule, iterations: 0 };
  }
  /**
   * İlk fitness hesapla (GÜNCEL FİTNESS API KULLANILDI)
   * @param {Object} schedule - Algoritma formatındaki program verisi
   */

  calculateInitialFitness(schedule, programData) {
    if (typeof window.calculateFullFitness !== "function") {
      console.warn(
        "⚠️ calculateFullFitness API eksik. Basit fitness metriğine dönülüyor."
      );
      let totalSlots = 0;
      for (const classId in schedule) {
        for (const day in schedule[classId]) {
          for (const hour in schedule[classId][day]) {
            if (schedule[classId][day][hour]) {
              totalSlots++;
            }
          }
        }
      }
      return totalSlots * 100;
    }

    // 🔥 Yeni: Global fitness fonksiyonunu kullan
    return window.calculateFullFitness(schedule);
  }
  /**
   * Final fitness hesapla (GÜNCEL FİTNESS API KULLANILDI)
   * @param {Object} schedule - Algoritma formatındaki program verisi
   */

  calculateFinalFitness(schedule, programData) {
    // 🔥 Yeni: calculateInitialFitness fonksiyonunu çağırarak global fitness'ı kullan
    return this.calculateInitialFitness(schedule, programData);
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.HybridOptimizerWrapper = HybridOptimizerWrapper;
  console.log("✅ HybridOptimizerWrapper V1.0 (Fitness API Entegre) yüklendi");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = HybridOptimizerWrapper;
}
