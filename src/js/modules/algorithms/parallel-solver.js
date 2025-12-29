/**
 * ============================================
 * PARALLEL SOLVER V2 - Gelişmiş Paralel Çözücü
 * ============================================
 * Web Workers API'sini kullanarak çizelgeleme algoritmalarını
 * paralel olarak çalıştırır, çözüm kalitesini ve hızını artırır.
 *
 * Özellikler:
 * - Multi-threaded solving mimarisi (Simüle Edilmiş)
 * - Worker havuzu yönetimi (Worker Pool Management)
 * - Promise tabanlı görev dağıtımı
 * - Gelişmiş sonuç toplama stratejileri ('best', 'median', 'voting')
 * - Performans ve hızlanma (Speedup) hesaplaması
 */

class ParallelSolver {
  /**
   * @param {object} [config] - Yapılandırma ayarları.
   */
  constructor(config = {}) {
    this.config = {
      // Worker sayısını, donanım çekirdeği sayısının yarısı veya 4 ile sınırla
      workerCount: Math.min(navigator.hardwareConcurrency || 4, 8),
      timeout: 90000, // 90 saniye (Daha uzun çalışma süreleri için)
      aggregationStrategy: "median", // 'best', 'median' (yeni), 'voting'
      enableProgress: true,
      workerScriptPath: "path/to/solver.worker.js", // Gerçek Worker dosya yolu (placeholder)
      ...config,
    };

    // Workers: Gerçek WebWorker nesneleri (simülasyonda sadece metadata)
    this.workers = [];
    this.results = [];
    this.progressCallback = null;

    this.stats = this.resetStats();

    console.log(
      `⚡ ParallelSolver V2 başlatıldı (${this.config.workerCount} worker)`
    );
  }

  /**
   * İstatistikleri sıfırlar.
   */
  resetStats() {
    return {
      totalWorkers: 0,
      completedWorkers: 0,
      failedWorkers: 0,
      totalDuration: 0,
      avgWorkerTime: 0,
      bestScore: -Infinity,
      totalTime: 0,
    };
  }

  // ============================================
  // ANA PARALEL ÇÖZÜM FONKSİYONU
  // ============================================

  /**
   * Çözümleme görevini worker'lar arasında paralel dağıtır.
   * @param {Object} data - Çözümlenecek girdi verisi.
   * @param {string} algorithm - Kullanılacak algoritmanın adı.
   * @param {Object} options - Algoritma seçenekleri.
   * @returns {Promise<Object>} En iyi çözüm ve istatistikler.
   */
  async solve(data, algorithm, options = {}) {
    console.log("\n⚡ PARALLEL SOLVING BAŞLADI");
    console.log("=".repeat(50));
    console.log(`  • Worker Count: ${this.config.workerCount}`);
    console.log(`  • Aggregation: ${this.config.aggregationStrategy}`);

    const startTime = Date.now();
    this.stats = this.resetStats();
    this.results = [];

    // 1. Worker havuzunu simüle et/oluştur
    this.initializeWorkers();

    // 2. Worker görevlerini oluştur (farklı rastgele başlangıç noktaları için)
    const tasks = [];
    for (let i = 0; i < this.config.workerCount; i++) {
      tasks.push({
        id: i,
        data,
        algorithm,
        seed: Date.now() + i + Math.random(), // Her görev için farklı seed
        options: {
          ...options,
          workerId: i,
        },
      });
    }

    // 3. Paralel çalıştır ve tüm sonuçları bekle
    const results = await this.runParallel(tasks);
    this.results = results;

    // 4. İstatistikleri güncelle
    this.updateStats(startTime);

    // 5. En iyi çözümü seç
    const bestResult = this.selectBestSolution(results);

    // 6. Raporu yazdır ve workers'ı temizle
    this.printReport();
    this.terminateWorkers(); // Workers'ı temizlemek iyidir

    return {
      success: bestResult?.success || false,
      solution: bestResult?.solution || null,
      score: bestResult?.score || -Infinity,
      allResults: results,
      stats: this.getStats(),
      duration: this.stats.totalTime,
    };
  }

  // ============================================
  // WORKER YÖNETİMİ & YAŞAM DÖNGÜSÜ (Simülasyon)
  // ============================================

  /**
   * Worker havuzunu başlatır/simüle eder.
   */
  initializeWorkers() {
    // Gerçek implementasyonda burada new Worker(this.config.workerScriptPath) kullanılır
    this.workers = Array.from({ length: this.config.workerCount }, (_, i) => ({
      id: i,
      // Gerçek Worker nesnesini tutar:
      // instance: new Worker(this.config.workerScriptPath),
      isBusy: false,
    }));
    this.stats.totalWorkers = this.workers.length;
    console.log(`🔧 ${this.workers.length} worker hazır (Simülasyon)`);
  }

  /**
   * Worker'ları sonlandırır.
   */
  terminateWorkers() {
    // Gerçek implementasyonda: this.workers.forEach(w => w.instance.terminate());
    this.workers = [];
    console.log("🛑 Workers sonlandırıldı.");
  }

  // ============================================
  // PARALEL ÇALIŞTIRMA MİMARİSİ
  // ============================================

  /**
   * Tüm görevleri Promise olarak paralel çalıştırır ve sonuçları bekler.
   */
  async runParallel(tasks) {
    const promises = tasks.map((task) => this.runWorkerTask(task));

    // Tüm worker'ları bekle (Promise.all ile)
    return Promise.all(promises);
  }

  /**
   * Tek bir worker görevinin Promise'ını döndürür (Worker iletişimini simüle eder).
   */
  async runWorkerTask(task) {
    const { id: workerId } = task;
    const startTime = Date.now();
    let timeoutTimer;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(
          new Error(
            `Worker ${workerId} zaman aşımına uğradı (${this.config.timeout}ms)`
          )
        );
      }, this.config.timeout);
    });

    try {
      // Simülasyon: Worker'ın hesaplama süreci
      const result = await Promise.race([
        this.simulateWorker(task),
        timeoutPromise,
      ]);

      clearTimeout(timeoutTimer);
      const duration = Date.now() - startTime;

      console.log(
        `  ✅ Worker ${workerId} tamamlandı (${duration}ms, score: ${result.score?.toFixed(
          2
        )})`
      );

      return {
        ...result,
        workerId,
        duration,
        success: true,
      };
    } catch (error) {
      clearTimeout(timeoutTimer);
      const duration = Date.now() - startTime;

      console.log(
        `  ❌ Worker ${workerId} başarısız (${duration}ms): ${error.message}`
      );

      return {
        workerId,
        duration,
        success: false,
        error: error.message,
        solution: null,
        score: -Infinity,
      };
    }
  }

  /**
   * Gerçek Worker görevini simüle eder. (Bu, gerçek implementasyonda worker.js'den gelen mesajı dinler.)
   */
  async simulateWorker(task) {
    // Yapay gecikme ve ilerleme raporlama simülasyonu
    const sleepTime = 500 + Math.random() * 1500; // 0.5s - 2.0s
    const steps = 10;

    for (let i = 1; i <= steps; i++) {
      await this.sleep(sleepTime / steps);
      this.reportProgress(task.id, i / steps);
    }

    // Basit rastgele çözüm
    // Worker ID'ye bağlı hafif skor farkı ekle (dengeyi göstermek için)
    const baseScore = 850;
    const randomScore = baseScore + Math.random() * 150 + task.id * 5;

    return {
      solution: {
        meta: `Worker ${task.id} çözümü`,
        seed: task.seed,
      },
      score: randomScore,
      iterations: Math.floor(200 + Math.random() * 500),
    };
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // SONUÇ TOPLAMA VE SEÇME (AGGRAGATION)
  // ============================================

  /**
   * Yapılandırılmış stratejiye göre en iyi sonucu seçer.
   */
  selectBestSolution(results) {
    const successful = results.filter((r) => r.success && r.solution);

    if (successful.length === 0) {
      console.error("⛔ Hiçbir worker başarılı çözüm üretemedi.");
      return null;
    }

    switch (this.config.aggregationStrategy) {
      case "best":
        return this.aggregateByBest(successful);
      case "median": // Yeni ve daha güvenilir strateji
        return this.aggregateByMedian(successful);
      case "voting":
        return this.aggregateByVoting(successful);
      default:
        return this.aggregateByBest(successful);
    }
  }

  /** En yüksek skora sahip olanı seçer. */
  aggregateByBest(results) {
    let best = results.reduce((a, b) => (a.score > b.score ? a : b));

    console.log(
      `  🏆 Agregasyon (Best): Worker ${
        best.workerId
      } (score: ${best.score.toFixed(2)})`
    );
    return best;
  }

  /** Ortanca (Median) skora en yakın olanı seçer (outlier etkisini azaltır). */
  aggregateByMedian(results) {
    const sortedResults = [...results].sort((a, b) => a.score - b.score);
    const middleIndex = Math.floor(sortedResults.length / 2);
    const medianScore =
      sortedResults.length % 2 === 0
        ? (sortedResults[middleIndex - 1].score +
            sortedResults[middleIndex].score) /
          2
        : sortedResults[middleIndex].score;

    let closest = results[0];
    let minDiff = Math.abs(results[0].score - medianScore);

    for (const result of results) {
      const diff = Math.abs(result.score - medianScore);
      if (diff < minDiff) {
        closest = result;
        minDiff = diff;
      }
    }

    console.log(
      `  📈 Agregasyon (Median): Worker ${
        closest.workerId
      } (score: ${closest.score.toFixed(2)}, median: ${medianScore.toFixed(2)})`
    );
    return closest;
  }

  /** Çözümleri ikili karşılaştırarak en çok kazananı seçer (Pareto yaklaşımına benzer). */
  aggregateByVoting(results) {
    const votes = new Map();
    results.forEach((r) => votes.set(r.workerId, 0));

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        // Basit kıyaslama: Score'u yüksek olan kazanır
        const winner =
          results[i].score > results[j].score ? results[i] : results[j];
        votes.set(winner.workerId, votes.get(winner.workerId) + 1);
      }
    }

    let winner = results[0];
    let maxVotes = -1;

    for (const result of results) {
      const voteCount = votes.get(result.workerId);
      if (voteCount > maxVotes) {
        winner = result;
        maxVotes = voteCount;
      }
    }

    console.log(
      `  🗳️ Agregasyon (Voting): Worker ${
        winner.workerId
      } (${maxVotes} oy, score: ${winner.score.toFixed(2)})`
    );
    return winner;
  }

  // ============================================
  // İSTATİSTİK VE RAPORLAMA
  // ============================================

  /**
   * Tüm worker sonuçlarını kullanarak istatistikleri günceller.
   */
  updateStats(startTime) {
    const completed = this.results.filter((r) => r.success);
    const failed = this.results.filter((r) => !r.success);

    this.stats.completedWorkers = completed.length;
    this.stats.failedWorkers = failed.length;
    this.stats.totalTime = Date.now() - startTime;

    // Sadece başarılı worker'ların süresini dikkate al
    const totalWorkerTime = completed.reduce((sum, r) => sum + r.duration, 0);
    this.stats.avgWorkerTime =
      completed.length > 0 ? totalWorkerTime / completed.length : 0;

    this.stats.bestScore = completed.reduce(
      (max, r) => Math.max(max, r.score),
      -Infinity
    );
  }

  /**
   * Gelişmiş performans metriklerini hesaplar.
   */
  getStats() {
    const speedup =
      this.stats.avgWorkerTime > 0 && this.stats.totalTime > 0
        ? this.stats.avgWorkerTime / this.stats.totalTime
        : 0;

    const efficiency = (speedup * 100) / this.stats.totalWorkers;

    return {
      ...this.stats,
      speedup: speedup.toFixed(2) + "x",
      efficiency: efficiency.toFixed(1) + "%",
      totalTime: this.stats.totalTime + "ms",
      avgWorkerTime: this.stats.avgWorkerTime.toFixed(0) + "ms",
    };
  }

  printReport() {
    const stats = this.getStats();

    console.log("\n📊 PARALLEL SOLVER V2 RAPORU");
    console.log("=".repeat(50));
    console.log(`  • Total Workers: ${stats.totalWorkers}`);
    console.log(
      `  • Completed / Failed: ${stats.completedWorkers} / ${stats.failedWorkers}`
    );
    console.log(`  • Best Score: ${stats.bestScore.toFixed(2)}`);
    console.log(`  • Total Time: ${stats.totalTime}`);
    console.log(`  • Avg Worker Time: ${stats.avgWorkerTime}`);
    console.log(
      `  • Speedup (Hızlanma): ${stats.speedup} (İdeal hızlanma: ${stats.totalWorkers}.00x)`
    );
    console.log(`  • Efficiency (Verimlilik): ${stats.efficiency}`);
    console.log("=".repeat(50) + "\n");
  }

  /**
   * Harici ilerleme raporlama için callback ayarlar.
   */
  onProgress(callback) {
    this.progressCallback = callback;
  }

  /**
   * İlerlemeyi kayıtlı callback'e bildirir.
   */
  reportProgress(workerId, progress) {
    if (this.config.enableProgress && this.progressCallback) {
      // Worker'ın ilerlemesini %0 ile %100 arasında raporla
      this.progressCallback({
        workerId,
        progress: Math.min(1, Math.max(0, progress)),
        totalWorkers: this.stats.totalWorkers,
      });
    }
  }
}

// Global export
if (typeof window !== "undefined") {
  window.ParallelSolver = ParallelSolver;
  console.log("✅ ParallelSolver V2 yüklendi");
}
