/**
 * ============================================
 * SOLUTION STABILIZER - Çözüm Stabilizasyonu
 * ============================================
 * Çözümü optimize ederken stabiliteyi korur ve durma kriterlerini yönetir.
 *
 * Özellikler:
 * - Solution quality tracking
 * - Stability score calculation
 * - Convergence detection
 * - Oscillation prevention
 * - Best solution caching
 *
 * GÜNCELLEMELER:
 * - stabilize() metoduna isHardValid kontrolü eklendi.
 * - Blok dersler için istatistik sayımı güncellendi.
 */

class SolutionStabilizer {
  constructor(config = {}) {
    this.config = {
      historySize: 10,
      stabilityThreshold: 0.95,
      oscillationWindow: 5,
      convergenceThreshold: 3,
      enableVerboseLogging: false, // YENİ: Detaylı loglama ayarı
      ...config,
    };

    this.history = [];
    this.bestSolution = null;
    this.bestScore = -Infinity;

    this.stats = {
      iterations: 0,
      improvements: 0,
      degradations: 0,
      oscillations: 0,
      converged: false,
      stabilityScore: 0,
    };

    console.log("🎯 SolutionStabilizer başlatıldı");
  }

  // ============================================
  // ANA STABİLİZASYON FONKSİYONU
  // ============================================

  /**
   * Yeni çözümü değerlendirir, istatistikleri günceller ve durma önerisi sunar.
   * @param {Object} solution - Yeni çözüm nesnesi
   * @param {number} score - Çözümün skoru
   * @param {boolean} isHardValid - Çözümün Hard Constraint'leri ihlal edip etmediği
   * @param {Object} metadata - Ek meta veriler
   */
  stabilize(solution, score, isHardValid = true, metadata = {}) {
    this.stats.iterations++;

    // History'ye ekle
    this.addToHistory({
      solution: this.deepCopy(solution),
      score,
      isHardValid,
      timestamp: Date.now(),
      metadata,
    });

    // En iyi çözümü güncelle (Sadece geçerli bir çözüm ise!)
    if (score > this.bestScore && isHardValid) {
      this.bestSolution = this.deepCopy(solution);
      this.bestScore = score;
      this.stats.improvements++;

      console.log(`✨ Yeni en iyi skor: ${score.toFixed(2)}`);
    } else if (score < this.bestScore - 10) {
      this.stats.degradations++;
    }

    // Stabilite analizi
    const stability = this.analyzeStability();
    this.stats.stabilityScore = stability.score;

    if (this.config.enableVerboseLogging) {
      console.log(
        `📈 Iter: ${this.stats.iterations}, Score: ${score.toFixed(
          2
        )}, Stability: ${(stability.score * 100).toFixed(1)}%`
      );
    }

    // Oscillation kontrolü
    if (this.detectOscillation()) {
      this.stats.oscillations++;
      console.log("⚠️ Oscillation tespit edildi");

      // En iyi çözüme geri dön
      return {
        solution: this.deepCopy(this.bestSolution),
        score: this.bestScore,
        stabilized: true,
        reason: "oscillation_prevention",
      };
    }

    // Convergence kontrolü
    if (this.checkConvergence()) {
      this.stats.converged = true;
      console.log("✅ Convergence sağlandı");

      return {
        solution: this.deepCopy(this.bestSolution),
        score: this.bestScore,
        stabilized: true,
        reason: "converged",
      };
    }

    // Stability yeterli mi?
    if (stability.score >= this.config.stabilityThreshold) {
      console.log("⭐ Çözüm yeterince stabil!");
      return {
        solution: this.deepCopy(this.bestSolution),
        score: this.bestScore,
        stabilized: true,
        reason: "stable",
      };
    }

    // Devam et
    return {
      solution: this.deepCopy(solution),
      score,
      stabilized: false,
      stability: stability.score,
    };
  }

  // ============================================
  // HISTORY YÖNETİMİ
  // ============================================

  addToHistory(entry) {
    this.history.push(entry);

    // History boyutunu sınırla
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
  }

  getHistory(count = null) {
    if (count === null) {
      return [...this.history];
    }
    return this.history.slice(-count);
  }

  clearHistory() {
    this.history = [];
    this.stats = {
      iterations: 0,
      improvements: 0,
      degradations: 0,
      oscillations: 0,
      converged: false,
      stabilityScore: 0,
    };

    console.log("🧹 History temizlendi");
  }

  // ============================================
  // STABİLİTE ANALİZİ
  // ============================================

  analyzeStability() {
    if (this.history.length < 3) {
      return { score: 0, trend: "insufficient_data" };
    }

    const recent = this.getHistory(Math.min(5, this.history.length));
    const scores = recent.map((h) => h.score);

    // Skor varyansı
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (düşük = stabil)
    const cv = avg !== 0 ? stdDev / Math.abs(avg) : 1; // Mutlak değer kullandık

    // Trend analizi
    let trend = "stable";
    if (scores[scores.length - 1] > scores[0] + stdDev) {
      trend = "improving";
    } else if (scores[scores.length - 1] < scores[0] - stdDev) {
      trend = "degrading";
    }

    // Stability score (0-1) - CV düşükse, skor yüksektir.
    const stabilityScore = Math.max(0, 1 - cv);

    return {
      score: stabilityScore,
      trend,
      variance,
      stdDev,
      cv,
      avgScore: avg,
    };
  }

  // ============================================
  // OSCİLLATİON TESPİTİ
  // ============================================

  detectOscillation() {
    if (this.history.length < this.config.oscillationWindow) {
      return false;
    }

    const recent = this.getHistory(this.config.oscillationWindow);
    const scores = recent.map((h) => h.score);

    // Ardışık iniş-çıkışları say
    let oscillations = 0;

    for (let i = 1; i < scores.length - 1; i++) {
      const prev = scores[i - 1];
      const curr = scores[i];
      const next = scores[i + 1];

      // Tepe veya vadi
      // Küçük farkları görmezden gelmek için eşik eklenebilir. (Basitlik için şimdilik yok)
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        oscillations++;
      }
    }

    // Çok fazla salınım varsa oscillation
    return oscillations >= this.config.oscillationWindow - 2;
  }

  // ============================================
  // CONVERGENCE KONTROLÜ
  // ============================================

  checkConvergence() {
    if (this.history.length < this.config.convergenceThreshold + 2) {
      return false;
    }

    const recent = this.getHistory(this.config.convergenceThreshold + 2);
    const scores = recent.map((h) => h.score);

    // Son N skorun max-min farkı
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;

    // Ortalama skor
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Relative range
    const relativeRange = avg !== 0 ? range / Math.abs(avg) : 1;

    // Convergence: relative range < 0.01 (1% değişim)
    return relativeRange < 0.01;
  }

  // ============================================
  // EN İYİ ÇÖZÜM YÖNETİMİ
  // ============================================

  getBestSolution() {
    return {
      solution: this.deepCopy(this.bestSolution),
      score: this.bestScore,
    };
  }

  resetBest() {
    this.bestSolution = null;
    this.bestScore = -Infinity;
    console.log("🔄 Best solution reset edildi");
  }

  // ============================================
  // SKOR TAHMİNİ
  // ============================================

  predictNextScore() {
    if (this.history.length < 3) {
      return null;
    }

    const recent = this.getHistory(5);
    const scores = recent.map((h) => h.score);

    // Linear regression (basit)
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = scores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null; // Sıfıra bölme hatası

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Sonraki değer
    const prediction = slope * n + intercept;

    return {
      prediction,
      trend: slope > 0 ? "increasing" : slope < 0 ? "decreasing" : "stable",
      confidence: this.calculatePredictionConfidence(scores, slope, intercept),
    };
  }

  calculatePredictionConfidence(scores, slope, intercept) {
    // R-squared hesapla
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const yMean = scores.reduce((a, b) => a + b, 0) / n;

    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i] + intercept;
      ssRes += Math.pow(scores[i] - predicted, 2);
      ssTot += Math.pow(scores[i] - yMean, 2);
    }

    const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    return Math.max(0, Math.min(1, r2));
  }

  // ============================================
  // ADAPTASYON ÖNERİLERİ
  // ============================================

  suggestAdaptation() {
    const stability = this.analyzeStability();
    const suggestions = [];

    // Instability
    if (stability.score < 0.7) {
      suggestions.push({
        type: "reduce_mutation",
        priority: "high",
        message: "Mutation oranını azalt (instability)",
        action: { mutationRate: 0.8 }, // %80'ine düşür
      });
    }

    // Degradation
    if (
      this.stats.degradations > this.stats.improvements &&
      this.history.length > 5
    ) {
      suggestions.push({
        type: "increase_elitism",
        priority: "high",
        message: "Elitism arttır (çok degradation)",
        action: { eliteCount: "+2" },
      });
    }

    // Oscillation
    if (this.stats.oscillations > 2) {
      suggestions.push({
        type: "enable_stabilization",
        priority: "medium",
        message: "Stabilization mekanizmaları aktif et",
        action: { stabilization: true },
      });
    }

    // Convergence
    if (this.stats.converged) {
      suggestions.push({
        type: "increase_exploration",
        priority: "low",
        message: "Exploration arttır (converged)",
        action: { mutationRate: 1.2 }, // %120'ye çıkar
      });
    }

    // Slow improvement
    const recent = this.getHistory(5);
    if (recent.length >= 5) {
      const scores = recent.map((h) => h.score);
      const improvement = scores[scores.length - 1] - scores[0];

      if (improvement < 10) {
        suggestions.push({
          type: "restart",
          priority: "medium",
          message: "Restart düşün (düşük improvement)",
          action: { restart: true },
        });
      }
    }

    return suggestions;
  }

  // ============================================
  // KARŞILAŞTIRMA
  // ============================================

  compare(solutionA, scoreA, solutionB, scoreB) {
    // Basit skor karşılaştırması
    if (Math.abs(scoreA - scoreB) > 5) {
      return {
        winner: scoreA > scoreB ? "A" : "B",
        difference: Math.abs(scoreA - scoreB),
        significant: true,
      };
    }

    // Skorlar yakınsa derinlemesine karşılaştır
    const metricsA = this.calculateDetailedMetrics(solutionA);
    const metricsB = this.calculateDetailedMetrics(solutionB);

    let scoreAdjusted = scoreA;
    let scoreBdjusted = scoreB;

    // Gap cezası
    scoreAdjusted -= metricsA.gaps * 2;
    scoreBdjusted -= metricsB.gaps * 2;

    // Variance cezası
    scoreAdjusted -= metricsA.variance * 5;
    scoreBdjusted -= metricsB.variance * 5;

    return {
      winner: scoreAdjusted > scoreBdjusted ? "A" : "B",
      difference: Math.abs(scoreAdjusted - scoreBdjusted),
      significant: Math.abs(scoreAdjusted - scoreBdjusted) > 3,
      details: {
        A: { score: scoreA, adjusted: scoreAdjusted, metrics: metricsA },
        B: { score: scoreB, adjusted: scoreBdjusted, metrics: metricsB },
      },
    };
  }

  calculateDetailedMetrics(solution) {
    let gaps = 0;
    let variance = 0;
    let totalLessons = 0;

    // Daily counts ve Gap count
    const dailyCounts = [];
    for (const classId in solution) {
      for (const day in solution[classId]) {
        const times = Object.keys(solution[classId][day])
          .map(Number)
          .sort((a, b) => a - b);

        let dayLessons = 0;

        for (let i = 0; i < times.length; i++) {
          const lesson = solution[classId][day][times[i]];
          // Blok dersleri sadece bir kere say
          if (lesson && (lesson.blockIndex === 0 || lesson.blockSize === 1)) {
            dayLessons++;
            totalLessons++;
          }

          // Gap hesapla
          if (i < times.length - 1) {
            gaps += times[i + 1] - times[i] - 1;
          }
        }

        if (dayLessons > 0) {
          dailyCounts.push(dayLessons);
        }
      }
    }

    // Daily variance
    if (dailyCounts.length > 0) {
      const avg = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
      variance = Math.sqrt(
        dailyCounts.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
          dailyCounts.length
      );
    }

    return { gaps, variance, totalLessons };
  }

  // ============================================
  // İSTATİSTİKLER VE RAPORLAMA
  // ============================================

  getStats() {
    const analysis = this.analyzeStability();

    return {
      ...this.stats,
      historySize: this.history.length,
      bestScore: this.bestScore,

      // Detaylı Stabilite Analizi
      stability: {
        score: analysis.score.toFixed(4),
        trend: analysis.trend,
        avgScore: analysis.avgScore.toFixed(2),
        stdDev: analysis.stdDev.toFixed(2),
      },

      improvementRate:
        this.stats.iterations > 0
          ? ((this.stats.improvements / this.stats.iterations) * 100).toFixed(
              1
            ) + "%"
          : "0%",
    };
  }

  printReport() {
    const stats = this.getStats();
    const stability = this.analyzeStability();
    const prediction = this.predictNextScore();
    const suggestions = this.suggestAdaptation();

    console.log("\n🎯 SOLUTION STABILIZER RAPORU");
    console.log("=".repeat(50));

    console.log("\n📊 İstatistikler:");
    console.log(`  • Iterations: ${stats.iterations}`);
    console.log(
      `  • Improvements/Degradations: ${stats.improvements} / ${stats.degradations}`
    );
    console.log(`  • Oscillations: ${stats.oscillations}`);
    console.log(`  • Converged: ${stats.converged ? "Evet" : "Hayır"}`);
    console.log(`  • Improvement Rate: ${stats.improvementRate}`);

    console.log("\n📈 Stabilite:");
    console.log(`  • Score: ${(stability.score * 100).toFixed(1)}%`);
    console.log(`  • Trend: ${stability.trend}`);
    console.log(`  • Variance (StdDev): ${stability.stdDev.toFixed(2)}`);
    console.log(`  • Avg Score: ${stability.avgScore.toFixed(2)}`);

    if (prediction) {
      console.log("\n🔮 Tahmin:");
      console.log(`  • Next Score: ${prediction.prediction.toFixed(2)}`);
      console.log(`  • Trend: ${prediction.trend}`);
      console.log(
        `  • Confidence: ${(prediction.confidence * 100).toFixed(1)}%`
      );
    }

    if (suggestions.length > 0) {
      console.log("\n💡 Öneriler:");
      suggestions.forEach((s) => {
        console.log(`  • [${s.priority}] ${s.message}`);
      });
    }

    console.log("\n🏆 En İyi:");
    console.log(`  • Best Score: ${this.bestScore.toFixed(2)}`);
    console.log(`  • Has Solution: ${this.bestSolution !== null}`);

    console.log("=".repeat(50) + "\n");
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  exportHistory() {
    return {
      history: this.history,
      stats: this.stats,
      bestScore: this.bestScore,
      timestamp: new Date().toISOString(),
    };
  }

  importHistory(data) {
    this.history = data.history || [];
    this.stats = data.stats || this.stats;
    this.bestScore = data.bestScore || -Infinity;

    // Best solution'ı history'den bul
    if (this.history.length > 0) {
      const best = this.history.reduce((max, h) =>
        h.score > max.score && h.isHardValid ? h : max
      );
      this.bestSolution = best.solution;
    }

    console.log("📥 History import edildi");
  }
}

// Global export
if (typeof window !== "undefined") {
  window.SolutionStabilizer = SolutionStabilizer;
  console.log("✅ SolutionStabilizer yüklendi");
}

// 🌍 Global erişim
window.SolutionStabilizer = SolutionStabilizer;
console.log("📦 SolutionStabilizer global erişim aktif!");
