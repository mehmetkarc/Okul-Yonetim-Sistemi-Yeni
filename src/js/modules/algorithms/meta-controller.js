/**
 * ============================================
 * META-CONTROLLER (AI Planlayıcı Katmanı)
 * ============================================
 * Hangi algoritmanın ne zaman çalıştırılacağını
 * dinamik olarak seçen üst seviye karar verici
 */

class MetaController {
  constructor(config) {
    this.config = config;
    this.history = []; // Geçmiş performans kayıtları
    this.strategyPerformance = {
      GA: { successRate: 0.8, avgFitness: 0, count: 0 },
      ACO: { successRate: 0.7, avgFitness: 0, count: 0 },
      SA: { successRate: 0.75, avgFitness: 0, count: 0 },
      Tabu: { successRate: 0.7, avgFitness: 0, count: 0 },
    };

    this.loadHistory();
  }

  /**
   * ScheduleAlgorithmV2 tarafından çağrılan ana metot.
   * Seçilen stratejiye göre algoritmaları orkestre eder.
   * @param {Object} data Program verisi.
   * @param {Object} initialSolution Başlangıç çözümü.
   * @param {Function} runAlgorithm Algoritmayı çalıştırmak için ScheduleAlgorithmV2'den gelen callback.
   * @returns {Object} En iyi çözümü ve istatistikleri içeren sonuç objesi.
   */
  async orchestrate(data, initialSolution, runAlgorithm) {
    console.log("🔥 Meta-Controller: Dinamik Orchestration başladı...");

    // KRİTİK DEBUG VE GÜVENLİK KONTROLÜ
    if (!data || !data.lessons || !data.teachers || !data.classes) {
      console.error(
        "❌ DEBUG: Orchestrate'e gelen 'data' objesi eksik veya undefined. Fallback stratejisi uygulanıyor."
      );
      return {
        schedule: initialSolution.schedule,
        fitness: initialSolution.fitness,
        strategy: "fallback",
        algorithmResults: [],
      };
    }

    const strategy = this.selectStrategy(data);

    let currentSolution = initialSolution;
    let bestFitness = initialSolution.fitness;
    let results = [];
    const algorithmsToRun = [];

    if (strategy.useGA)
      algorithmsToRun.push({
        name: "GeneticAlgorithm",
        iterations: strategy.gaGenerations,
      });
    if (strategy.useACO)
      algorithmsToRun.push({
        name: "AntColonyOptimization",
        iterations: strategy.acoIterations,
      });
    if (strategy.useSA)
      algorithmsToRun.push({ name: "SimulatedAnnealing", iterations: 100 });
    if (strategy.useTabu)
      algorithmsToRun.push({ name: "TabuSearch", iterations: 100 });

    // 🔥 DÜZELTME: runAlgorithm'ı arrow function ile sar (context kaybını önle)
    const safeRunAlgorithm = async (algoName, iterations, currentSchedule) => {
      try {
        if (typeof runAlgorithm !== "function") {
          console.error(
            `❌ runAlgorithm function değil: ${typeof runAlgorithm}`
          );
          return { schedule: currentSchedule, fitness: bestFitness }; // Fallback
        }
        return await runAlgorithm(algoName, iterations, currentSchedule);
      } catch (err) {
        console.error(`❌ Algo ${algoName} çalıştırma hatası:`, err);
        return { schedule: currentSchedule, fitness: bestFitness }; // Hata durumunda mevcut çözümü koru
      }
    };

    for (const algo of algorithmsToRun) {
      console.log(
        `➡️ Meta-Controller: ${algo.name} (${algo.iterations} iterasyon) çalıştırılıyor...`
      );
      const algoResult = await safeRunAlgorithm(
        algo.name,
        algo.iterations,
        currentSolution.schedule
      );

      // Null/Undefined kontrolü eklendi
      if (
        algoResult &&
        algoResult.schedule && // 🔥 DÜZELTME: schedule'ın varlığını da kontrol et
        algoResult.fitness !== undefined &&
        algoResult.fitness > bestFitness
      ) {
        currentSolution = algoResult;
        bestFitness = algoResult.fitness;
        console.log(
          `✨ YENİ EN İYİ ÇÖZÜM: ${bestFitness.toFixed(2)} (${algo.name})`
        );
      }
      results.push(algoResult);
    }

    console.log(
      `✅ Orchestration tamamlandı. En iyi Fitness: ${bestFitness.toFixed(2)}`
    );

    return {
      schedule: currentSolution.schedule || currentSolution, // 🔥 DÜZELTME: Eğer currentSolution direkt schedule ise
      fitness: bestFitness,
      strategy: strategy.name,
      algorithmResults: results, // Hata 3 (ga okunamadı) için bu sonuçlar gereklidir.
    };
  }

  /**
   * Veri setine göre en uygun stratejiyi seç
   */
  selectStrategy(data) {
    console.log("🎯 Meta-Controller: Strateji belirleniyor...");

    const analysis = this.analyzeDataset(data);
    console.log("📊 Veri seti analizi:", analysis);

    let strategy = {
      name: "balanced",
      useGA: true,
      useACO: false,
      useSA: true,
      useTabu: true,
      gaGenerations: 100,
      acoIterations: 100,
      reason: "",
    };

    // Küçük veri seti (< 50 ders)
    if (analysis.lessonCount < 50) {
      strategy = {
        name: "quick",
        useGA: true,
        useACO: false,
        useSA: true,
        useTabu: false,
        gaGenerations: 50,
        acoIterations: 50,
        reason: "Küçük veri seti - Hızlı çözüm (GA + SA)",
      };
    }
    // Orta veri seti (50-150 ders)
    else if (analysis.lessonCount >= 50 && analysis.lessonCount < 150) {
      strategy = {
        name: "balanced",
        useGA: true,
        useACO: true,
        useSA: true,
        useTabu: true,
        gaGenerations: 100,
        acoIterations: 100,
        reason: "Orta veri seti - Dengeli yaklaşım (Tüm algoritmalar)",
      };
    }
    // Büyük veri seti (150+ ders)
    else {
      strategy = {
        name: "intensive",
        useGA: true,
        useACO: true,
        useSA: true,
        useTabu: true,
        gaGenerations: 150,
        acoIterations: 150,
        reason:
          "Büyük veri seti - Yoğun optimizasyon (Tüm algoritmalar + artırılmış iterasyon)",
      };
    }

    // Öğretmen tercihi yoğunluğu yüksekse ACO'ya öncelik ver
    if (analysis.preferenceComplexity > 0.5) {
      strategy.useACO = true;
      strategy.acoIterations = Math.max(strategy.acoIterations, 150);
      strategy.reason += " | Yüksek tercih karmaşıklığı - ACO aktif";
    }

    // Blok ders oranı yüksekse SA'ya öncelik ver
    if (analysis.blockRatio > 0.3) {
      strategy.useSA = true;
      strategy.reason += " | Çok blok ders - SA aktif";
    }

    // Çakışma potansiyeli yüksekse Tabu Search ekle
    if (analysis.conflictPotential > 0.6) {
      strategy.useTabu = true;
      strategy.reason += " | Yüksek çakışma potansiyeli - Tabu aktif";
    }

    // Adaptif strateji: Geçmiş performansa göre ayarla
    // Düzeltme: config objesinin var olup olmadığını kontrol et
    if (
      this.config &&
      this.config.adaptiveStrategy &&
      this.history.length > 5
    ) {
      strategy = this.adaptStrategy(strategy, analysis);
    }

    console.log("✅ Seçilen strateji:", strategy.name);
    console.log("📝 Sebep:", strategy.reason);

    return strategy;
  }

  /**
   * Veri setini analiz et
   */
  analyzeDataset(data) {
    // KRİTİK GÜVENLİK KONTROLÜ
    if (!data || !data.lessons || !data.teachers || !data.classes) {
      console.error(
        "❌ analyzeDataset HATA: data, data.lessons, data.teachers veya data.classes undefined/null!"
      );
      return {
        lessonCount: 0,
        teacherCount: 0,
        classCount: 0,
        avgLessonsPerClass: 0,
        avgLessonsPerTeacher: 0,
        blockRatio: 0,
        preferenceComplexity: 0,
        conflictPotential: 0,
      };
    }

    const analysis = {
      lessonCount: data.lessons.length,
      teacherCount: data.teachers.length,
      classCount: data.classes.length,
      avgLessonsPerClass: 0,
      avgLessonsPerTeacher: 0,
      blockRatio: 0,
      preferenceComplexity: 0,
      conflictPotential: 0,
    };

    // Ortalama ders sayıları (Sıfıra bölme kontrolü)
    analysis.avgLessonsPerClass =
      analysis.classCount > 0 ? data.lessons.length / analysis.classCount : 0;
    analysis.avgLessonsPerTeacher =
      analysis.teacherCount > 0
        ? data.lessons.length / analysis.teacherCount
        : 0;

    // Blok ders oranı
    const blockLessons = data.lessons.filter((l) => l.blockSize > 1).length;
    analysis.blockRatio =
      data.lessons.length > 0 ? blockLessons / data.lessons.length : 0;

    // Öğretmen tercihi karmaşıklığı
    if (window.PreferenceManager && analysis.teacherCount > 0) {
      const allPrefs = window.PreferenceManager.tumTercihleriGetir();
      let totalBlocked = 0;
      // Güvenli hesaplama: 5 gün * 8 saat
      const totalPossibleSlots = analysis.teacherCount * 5 * 8;

      Object.values(allPrefs).forEach((pref) => {
        if (pref.bosGun) totalBlocked += 8; // Boş gün = 8 slot

        if (pref.kapaliSaatler) {
          Object.values(pref.kapaliSaatler).forEach((slots) => {
            totalBlocked += slots.length;
          });
        }
      });

      // totalPossibleSlots'un sıfır olmaması için kontrol
      analysis.preferenceComplexity =
        totalPossibleSlots > 0 ? totalBlocked / totalPossibleSlots : 0;
    }

    // Çakışma potansiyeli (ders sayısı / olası slot sayısı)
    const totalSlots = analysis.classCount * 5 * 8;
    analysis.conflictPotential =
      totalSlots > 0 ? data.lessons.length / totalSlots : 0;

    return analysis;
  }

  /**
   * Geçmiş performansa göre stratejiyi uyarla
   */
  adaptStrategy(baseStrategy, analysis) {
    const strategy = { ...baseStrategy };

    // Son 5 dağıtımın performansını analiz et
    const recentHistory = this.history.slice(-5);

    // Her algoritmanın ortalama performansını hesapla
    const performance = {
      GA: this.getAlgorithmPerformance(recentHistory, "GA"),
      ACO: this.getAlgorithmPerformance(recentHistory, "ACO"),
      SA: this.getAlgorithmPerformance(recentHistory, "SA"),
      Tabu: this.getAlgorithmPerformance(recentHistory, "Tabu"),
    };

    console.log("📈 Geçmiş performans:", performance);

    // Düşük performanslı algoritmaları devre dışı bırak
    if (performance.GA < 0.5 && analysis.lessonCount < 100) {
      strategy.useGA = false;
      strategy.reason += " | GA düşük performans - devre dışı";
    }

    if (performance.ACO < 0.4) {
      strategy.useACO = false;
      strategy.reason += " | ACO düşük performans - devre dışı";
    }

    if (performance.SA < 0.5) {
      strategy.useSA = false;
      strategy.reason += " | SA düşük performans - devre dışı";
    }

    if (performance.Tabu < 0.5) {
      strategy.useTabu = false;
      strategy.reason += " | Tabu düşük performans - devre dışı";
    }

    // Yüksek performanslı algoritmalara öncelik ver
    const bestAlgorithm = Object.entries(performance).reduce(
      (best, [name, perf]) => {
        return perf > best.perf ? { name, perf } : best;
      },
      { name: null, perf: 0 }
    );

    if (bestAlgorithm.perf > 0.8) {
      strategy.reason += ` | ${bestAlgorithm.name} en iyi performans - öncelik verildi`;

      if (bestAlgorithm.name === "GA") {
        strategy.gaGenerations = Math.floor(strategy.gaGenerations * 1.5);
      } else if (bestAlgorithm.name === "ACO") {
        strategy.acoIterations = Math.floor(strategy.acoIterations * 1.5);
      }
    }

    return strategy;
  }

  /**
   * Belirli bir algoritmanın performansını hesapla
   */
  getAlgorithmPerformance(history, algorithmName) {
    const relevant = history.filter((h) =>
      h.algorithms.includes(algorithmName)
    );

    if (relevant.length === 0) return 0.5; // Nötr

    const avgFitness =
      relevant.reduce((sum, h) => sum + h.fitness, 0) / relevant.length;
    const avgSuccess =
      relevant.reduce((sum, h) => sum + (h.success ? 1 : 0), 0) /
      relevant.length;

    // 🔥 DÜZELTME: Normalizasyon için maxFitness'i güvenli hale getir (varsayılan 2000, ama sıfıra bölme önle)
    const maxFitness = 2000;
    return (avgFitness / maxFitness + avgSuccess) / 2; // 0-1 arası normalize
  }

  /**
   * Dağıtım sonucunu kaydet
   */
  recordResult(strategy, fitness, success, duration) {
    const record = {
      timestamp: Date.now(),
      strategy: strategy.name,
      algorithms: [],
      fitness,
      success,
      duration,
    };

    if (strategy.useGA) record.algorithms.push("GA");
    if (strategy.useACO) record.algorithms.push("ACO");
    if (strategy.useSA) record.algorithms.push("SA");
    if (strategy.useTabu) record.algorithms.push("Tabu");

    this.history.push(record);

    // Algoritma performans istatistiklerini güncelle
    record.algorithms.forEach((algo) => {
      if (this.strategyPerformance[algo]) {
        this.strategyPerformance[algo].count++;
        this.strategyPerformance[algo].avgFitness =
          (this.strategyPerformance[algo].avgFitness *
            (this.strategyPerformance[algo].count - 1) +
            fitness) /
          this.strategyPerformance[algo].count;
        this.strategyPerformance[algo].successRate =
          (this.strategyPerformance[algo].successRate *
            (this.strategyPerformance[algo].count - 1) +
            (success ? 1 : 0)) /
          this.strategyPerformance[algo].count;
      }
    });

    // Son 50 kaydı tut
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }

    this.saveHistory();

    console.log("💾 Meta-Controller: Sonuç kaydedildi");
  }

  /**
   * Geçmişi yükle
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem("meta_controller_history");
      if (saved) {
        const data = JSON.parse(saved);
        this.history = data.history || [];
        this.strategyPerformance = data.performance || this.strategyPerformance;
        console.log(
          "📚 Meta-Controller: Geçmiş yüklendi (",
          this.history.length,
          "kayıt)"
        );
      }
    } catch (error) {
      console.error("❌ Meta-Controller geçmiş yükleme hatası:", error);
    }
  }

  /**
   * Geçmişi kaydet
   */
  saveHistory() {
    try {
      const data = {
        history: this.history,
        performance: this.strategyPerformance,
        timestamp: Date.now(),
      };
      localStorage.setItem("meta_controller_history", JSON.stringify(data));
    } catch (error) {
      console.error("❌ Meta-Controller geçmiş kaydetme hatası:", error);
    }
  }

  /**
   * İstatistikleri göster
   */
  getStatistics() {
    return {
      totalRuns: this.history.length,
      strategyPerformance: this.strategyPerformance,
      recentSuccess:
        this.history.slice(-10).filter((h) => h.success).length /
        Math.min(10, this.history.length),
      avgFitness:
        this.history.length > 0
          ? this.history.reduce((sum, h) => sum + h.fitness, 0) /
            this.history.length
          : 0,
    };
  }

  /**
   * Geçmişi temizle
   */
  clearHistory() {
    this.history = [];
    this.strategyPerformance = {
      GA: { successRate: 0.8, avgFitness: 0, count: 0 },
      ACO: { successRate: 0.7, avgFitness: 0, count: 0 },
      SA: { successRate: 0.75, avgFitness: 0, count: 0 },
      Tabu: { successRate: 0.7, avgFitness: 0, count: 0 },
    };
    localStorage.removeItem("meta_controller_history");
    console.log("🗑️ Meta-Controller geçmişi temizlendi");
  }
}

// Export
if (typeof window !== "undefined") {
  window.MetaController = MetaController;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = MetaController;
}

console.log("✅ MetaController yüklendi");

// 🌍 Global erişim
window.MetaController = MetaController;
console.log("📦 MetaController global erişim aktif!");
