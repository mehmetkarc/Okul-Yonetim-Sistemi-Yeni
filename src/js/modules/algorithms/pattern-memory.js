/**
 * ============================================
 * PATTERN MEMORY (Örüntü Hafızası)
 * ============================================
 * Geçmiş başarılı ders programı çözümlerinden, belirli derslerin
 * belirli zaman dilimlerine (gün/saat) yerleştirilme olasılığını öğrenir.
 * Bu bilgi, yeni optimizasyon denemelerinde başlangıç noktası veya
 * rehber (heuristic) olarak kullanılabilir.
 */

class PatternMemory {
  /**
   * Yapılandırıcı (Constructor)
   * @param {object} config - Yapılandırma ayarları
   */
  constructor(config = {}) {
    this.config = {
      storageKey: "pattern_memory",
      minSuccessScore: 800, // Öğrenmeye başlamak için minimum çözüm skoru
      learningRate: 0.1, // Yeni öğrenmenin mevcut hafızaya etkisi (0.01 - 1.0)
      decayRate: 0.001, // Zamanla veya kaydetmeyle örüntü skorlarının azalma oranı (Unutma)
      maxIterations: 100, // Normalize etmek için düşünülen maksimum başarılı yerleşim sayısı
      ...config,
    };

    // this.patterns: {lessonKey: {slotKey: score (0-100)}}
    this.patterns = {};

    // İstatistik takibi
    this.stats = {
      learnCount: 0,
      saveCount: 0,
      totalKeys: 0,
    };

    console.log("🧠 PatternMemory başlatıldı.");
  }

  // ============================================
  // DEPOLAMA İŞLEMLERİ (ASENKRON)
  // ============================================

  /**
   * LocalStorage'dan örüntü hafızasını yükler (Asenkron taklit).
   * Gelecekte IndexedDB gibi gerçek asenkron depolamaya geçişi kolaylaştırır.
   */
  async load() {
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved) {
        this.patterns = JSON.parse(saved);
        this.stats.totalKeys = Object.keys(this.patterns).length;

        console.log(
          `💾 Pattern Memory yüklendi: ${this.stats.totalKeys} anahtar bulundu.`
        );
      }
    } catch (error) {
      console.error("❌ Pattern Memory yükleme hatası:", error);
    }
  }

  /**
   * Örüntü hafızasını LocalStorage'a kaydeder (Asenkron taklit).
   */
  async save() {
    // Hafızayı kaydetmeden önce eskime oranını uygula (Unutma/Decay)
    this.applyDecay();

    try {
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.patterns)
      );
      this.stats.saveCount++;
    } catch (error) {
      console.error(
        "❌ Pattern Memory kaydetme hatası (Boyut aşımı olabilir):",
        error
      );
    }
  }

  // ============================================
  // ÖĞRENME FONKSİYONLARI
  // ============================================

  /**
   * Verilen bir çözümden (solution) öğrenme yapar.
   * @param {object} solution - Çözüm objesi (Ders programı)
   * @param {number} score - Çözümün fitness skoru
   */
  async learn(solution, score) {
    // Çözüm, minimum öğrenme eşiğini geçmeli
    if (score < this.config.minSuccessScore) {
      console.log(
        `  ⏭️ Öğrenme atlandı: Score (${score}) eşiğin (${this.config.minSuccessScore}) altında.`
      );
      return;
    }

    // Öğrenme döngüsü
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];

          // Örn: T101_MATEMATİK (Öğretmen ve Ders Anahtarı)
          const lessonKey = this.getLessonKey(lesson);
          const slotKey = `${day}_${time}`; // Örn: 1_2 (Pazartesi 2. saat)

          this.patterns[lessonKey] = this.patterns[lessonKey] || {};

          // Mevcut skoru al (Yoksa 0)
          const currentScore = this.patterns[lessonKey][slotKey] || 0;

          // Ağırlıklandırılmış Öğrenme: Yeni skor, mevcut skor ile öğrenme hızı arasında dengeleme yapar.
          // Yeni skor = Mevcut Skor + (Yeni Öğe * LearningRate)
          // Burada Yeni Öğe 1 (başarılı yerleşim)
          this.patterns[lessonKey][slotKey] =
            currentScore + this.config.learningRate;
        }
      }
    }

    this.stats.learnCount++;
    this.stats.totalKeys = Object.keys(this.patterns).length;

    // Her 10 öğrenme işleminde veya belirli aralıklarla kaydet
    if (this.stats.learnCount % 10 === 0) {
      this.save();
    }

    console.log(
      `  ✅ Öğrenme başarılı. Yeni öğrenme: ${this.stats.learnCount}`
    );
  }

  /**
   * Hafızadaki tüm skorlara "unutma" oranını uygular.
   * Yüksek skorların bile zamanla değerini kaybetmesini sağlar.
   */
  applyDecay() {
    if (this.config.decayRate <= 0) return;

    const decayFactor = 1 - this.config.decayRate;

    for (const lessonKey in this.patterns) {
      for (const slotKey in this.patterns[lessonKey]) {
        const currentScore = this.patterns[lessonKey][slotKey];
        // Skoru azalt
        this.patterns[lessonKey][slotKey] = Math.max(
          0,
          currentScore * decayFactor
        );

        // Eğer skor sıfıra çok yakınsa temizle
        if (this.patterns[lessonKey][slotKey] < 0.001) {
          delete this.patterns[lessonKey][slotKey];
        }
      }
      // Boş kalan anahtarları temizle
      if (Object.keys(this.patterns[lessonKey]).length === 0) {
        delete this.patterns[lessonKey];
      }
    }
    console.log("  ⏳ Decay (Unutma) uygulandı.");
  }

  // ============================================
  // TAHMİN FONKSİYONLARI
  // ============================================

  /**
   * Belirtilen ders için verilen gün/saat diliminde yerleştirilme olasılığını tahmin eder.
   * @param {object} lesson - Ders objesi (teacherId, subjectId içermeli)
   * @param {string} day - Gün (Örn: '1' - Pazartesi)
   * @param {string} time - Saat (Örn: '2')
   * @returns {number} - Normalize edilmiş olasılık skoru (0-100)
   */
  predict(lesson, day, time) {
    const lessonKey = this.getLessonKey(lesson);
    const slotKey = `${day}_${time}`;

    const rawScore = this.patterns[lessonKey]?.[slotKey] || 0;

    // Normalizasyon: Raw skoru, tanımlanan max iterasyon sayısına göre 0-100 aralığına ölçekle.
    // Bu, örüntünün "ne kadar güçlü" olduğunu gösterir.
    const normalizedScore = (rawScore / this.config.maxIterations) * 100;

    return Math.min(normalizedScore, 100); // 100'ü geçmesin
  }

  /**
   * Belirli bir ders için tüm slotlardaki olasılık skorlarını döndürür.
   * @param {object} lesson - Ders objesi
   * @returns {object} - {slotKey: score} formatında objeler
   */
  predictAllSlots(lesson) {
    const lessonKey = this.getLessonKey(lesson);
    const pattern = this.patterns[lessonKey];

    if (!pattern) return {};

    const predictions = {};
    const maxScore = this.config.maxIterations;

    for (const slotKey in pattern) {
      const rawScore = pattern[slotKey];
      // Normalizasyon
      predictions[slotKey] = Math.min((rawScore / maxScore) * 100, 100).toFixed(
        2
      );
    }

    return predictions;
  }

  // ============================================
  // YARDIMCI VE RAPORLAMA
  // ============================================

  /**
   * Bir ders objesinden örüntü hafızası için anahtar (key) oluşturur.
   * @param {object} lesson - Ders objesi
   * @returns {string} - Anahtar
   */
  getLessonKey(lesson) {
    // Sadece öğretmen ve ders kombinasyonunu kullan
    if (lesson.teacherId && lesson.subjectId) {
      return `${lesson.teacherId}_${lesson.subjectId}`;
    }
    // Gerekirse sadece ders veya sınıf bazlı anahtarlar eklenebilir.
    return "UNKNOWN_KEY";
  }

  /**
   * Örüntü Hafızası hakkında genel raporu konsola yazdırır.
   */
  printReport() {
    console.log("\n🧠 PATTERN MEMORY RAPORU");
    console.log("=".repeat(50));

    const totalSlots = Object.values(this.patterns).reduce(
      (acc, p) => acc + Object.keys(p).length,
      0
    );

    console.table([
      {
        Metric: "Total Lesson Keys (Öğretmen+Ders)",
        Value: this.stats.totalKeys,
      },
      { Metric: "Total Pattern Slots (Hafıza Öğeleri)", Value: totalSlots },
      {
        Metric: "Total Learnings (Öğrenme Sayısı)",
        Value: this.stats.learnCount,
      },
      {
        Metric: "Min Score Threshold (Min. Eşik)",
        Value: this.config.minSuccessScore,
      },
      {
        Metric: "Learning Rate (Öğrenme Hızı)",
        Value: this.config.learningRate,
      },
    ]);

    console.log("\nTop 5 Öğretmen/Ders Örüntüsü:");

    // İlk 5 anahtarı ve içindeki en yüksek 1 slotu göster
    const topPatterns = Object.entries(this.patterns)
      .slice(0, 5)
      .map(([key, slots]) => {
        const bestSlot = Object.entries(slots).reduce(
          (best, [slotKey, score]) =>
            score > best.score ? { slotKey, score } : best,
          { slotKey: "-", score: 0 }
        );

        // Raw skoru olasılığa çevir
        const probability = this.predict(
          { teacherId: key.split("_")[0], subjectId: key.split("_")[1] },
          bestSlot.slotKey.split("_")[0],
          bestSlot.slotKey.split("_")[1]
        ).toFixed(2);

        return {
          Öğretmen_Ders: key,
          "En İyi Slot": bestSlot.slotKey,
          "Olasılık (%)": probability,
          "Raw Score": bestSlot.score.toFixed(2),
        };
      });

    if (topPatterns.length > 0) {
      console.table(topPatterns);
    } else {
      console.log("  (Hafıza boş, öğrenme yapılmamış.)");
    }

    console.log("=".repeat(50) + "\n");
  }
}

// 🌍 Global erişim
window.PatternMemory = PatternMemory;
console.log("📦 PatternMemory global erişim aktif!");
