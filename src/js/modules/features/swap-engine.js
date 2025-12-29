/**
 * ============================================
 * SWAP ENGINE V2.0 (Ders Değişimi Motoru)
 * ============================================
 * Öğretmenler arası akıllı ders değişimi
 * CSP + SA + Tabu + Fuzzy + RL + Pattern Memory
 *
 * ⚡️ OPTIMIZATION: Module initialization and usage checks are enhanced for robustness.
 * ⚡️ OPTIMIZATION: More resilient data access within window.programData.
 * ⚡️ FIX: Improved getCurrentLesson and isTeacherBusy logic for mixed data structures.
 */

class SwapEngine {
  constructor() {
    this.constraintSystem = null;
    this.fuzzyLogic = null;
    this.rl = null;
    this.patternMemory = null;
    this.tabuSearch = null;
    this.sa = null;

    this.swapHistory = [];
    this.tabuList = [];
    this.maxTabuSize = 20;

    this.initializeModules();
  }

  /**
   * Modülleri başlat
   */
  initializeModules() {
    try {
      // Modül adlarının global scope'ta tanımlı olduğu varsayılır.
      if (typeof window.WeightedConstraintSystem !== "undefined") {
        this.constraintSystem = new window.WeightedConstraintSystem({
          teacherConflict: 1000,
          classConflict: 1000,
          teacherPreference: 80,
          gapPenalty: 40,
        });
      }

      if (typeof window.FuzzyLogicEngine !== "undefined") {
        this.fuzzyLogic = new window.FuzzyLogicEngine({ enabled: true });
      }

      if (typeof window.ReinforcementLearning !== "undefined") {
        this.rl = new window.ReinforcementLearning({ learningRate: 0.1 });
        // RL'nin sadece yüklenip yüklenmediği değil, veri de yükleyip yüklemediği kontrol edilmeli
        this.rl.load?.();
      }

      if (typeof window.PatternMemory !== "undefined") {
        this.patternMemory = new window.PatternMemory();
        this.patternMemory.load?.();
      }

      if (typeof window.TabuSearch !== "undefined" && this.constraintSystem) {
        this.tabuSearch = new window.TabuSearch(
          {
            tabuListSize: 50,
            maxIterations: 100,
          },
          this.constraintSystem
        );
      }

      if (
        typeof window.SimulatedAnnealing !== "undefined" &&
        this.constraintSystem
      ) {
        this.sa = new window.SimulatedAnnealing(
          {
            initialTemp: 1000,
            coolingRate: 0.95,
            minTemp: 1,
          },
          this.constraintSystem
        );
      }

      console.log("✅ SwapEngine modülleri başlatıldı (V2.0)");
    } catch (error) {
      console.error("❌ SwapEngine modül hatası:", error);
    }
  }

  /**
   * Değişim adaylarını bul
   */
  async findSwapCandidates(teacherId, day, time, classId, options = {}) {
    console.log("🔍 Değişim adayları aranıyor...", {
      teacherId,
      day,
      time,
      classId,
    });

    const candidates = [];

    try {
      // 1. Öğretmen bilgilerini al
      const teacher = window.ScheduleDataManager?.ogretmenBul(teacherId);
      if (!teacher) {
        console.error("Öğretmen bulunamadı:", teacherId);
        return [];
      }

      // 2. Mevcut dersi al
      const currentLesson = this.getCurrentLesson(day, time, classId);
      if (!currentLesson) {
        console.error("Ders bulunamadı: Program tablosunda ders yok.");
        return [];
      }

      // 3. Aynı branştaki öğretmenleri bul
      const sameBranchCandidates = this.findSameBranchTeachers(
        teacher,
        currentLesson
      );
      candidates.push(...sameBranchCandidates);

      // 4. Farklı branş dahil mi?
      if (options.includeDifferentBranch) {
        const differentBranchCandidates = this.findDifferentBranchTeachers(
          teacher,
          currentLesson
        );
        candidates.push(...differentBranchCandidates);
      }

      // 5. Her aday için uygunluk skoru hesapla
      for (const candidate of candidates) {
        // Asenkron işlemi await ile bekle
        candidate.score = await this.calculateSwapScore(
          teacherId,
          candidate.teacherId,
          day,
          time,
          classId
        );

        candidate.feasibility = this.checkSwapFeasibility(
          teacherId,
          candidate.teacherId,
          day,
          time,
          classId
        );
      }

      // 6. Tabu listesini kontrol et
      // Sadece feasible olanları alıp Tabu kontrolü yap
      let validCandidates = candidates.filter((c) => c.feasibility.feasible);

      if (this.tabuList.length > 0) {
        validCandidates = this.filterTabuCandidates(
          validCandidates,
          teacherId,
          day,
          time
        );
      }

      // 7. Skorlara göre sırala
      validCandidates.sort((a, b) => b.score - a.score);

      console.log(
        `✅ ${validCandidates.length} uygun aday bulundu (Toplam ${candidates.length} aday)`
      );

      return validCandidates;
    } catch (error) {
      console.error("❌ Aday bulma hatası:", error);
      return [];
    }
  }

  /**
   * Mevcut dersi al
   * @param {number} day - Gün indeksi
   * @param {number} time - Saat indeksi
   * @param {string} classId - Sınıf ID'si
   * @returns {Object|null} İlgili ders objesi
   */
  getCurrentLesson(day, time, classId) {
    if (
      !window.programData ||
      !window.programData[day] ||
      !window.programData[day][time]
    ) {
      return null;
    }

    const slotData = window.programData[day][time];

    // Tekil ders veya Çift Ders (Split/Merged) kontrolü
    const lessons = Array.isArray(slotData) ? slotData : [slotData];

    return lessons.find((l) => l.sinif_id === classId);
  }

  /**
   * Aynı branştaki öğretmenleri bul
   */
  findSameBranchTeachers(currentTeacher, currentLesson) {
    const candidates = [];

    if (!window.ScheduleDataManager) return candidates;

    // Öğretmen listesini güvenli bir şekilde al
    const allTeachers = window.ScheduleDataManager.getOgretmenler?.() || [];

    allTeachers.forEach((teacher) => {
      if (teacher.id === currentTeacher.id) return; // Kendini atlat
      // Eğer kilitli property'si varsa ve true ise atlat
      if (teacher.locked) return;

      // Aynı branş kontrolü
      if (teacher.brans === currentTeacher.brans) {
        candidates.push({
          teacherId: teacher.id,
          teacherName: teacher.tamAd,
          teacherCode: teacher.kod,
          branch: teacher.brans,
          sameBranch: true,
          score: 0,
          feasibility: null,
        });
      }
    });

    return candidates;
  }

  /**
   * Farklı branştaki öğretmenleri bul
   */
  findDifferentBranchTeachers(currentTeacher, currentLesson) {
    const candidates = [];

    if (!window.ScheduleDataManager) return candidates;

    const allTeachers = window.ScheduleDataManager.getOgretmenler?.() || [];

    allTeachers.forEach((teacher) => {
      if (teacher.id === currentTeacher.id) return;
      if (teacher.locked) return;

      // Farklı branş
      if (teacher.brans !== currentTeacher.brans) {
        candidates.push({
          teacherId: teacher.id,
          teacherName: teacher.tamAd,
          teacherCode: teacher.kod,
          branch: teacher.brans,
          sameBranch: false,
          score: 0,
          feasibility: null,
        });
      }
    });

    return candidates;
  }

  /**
   * Değişim skorunu hesapla
   */
  async calculateSwapScore(teacher1Id, teacher2Id, day, time, classId) {
    let score = 100; // Başlangıç taban puanı

    try {
      // 1. Constraint System ile uygunluk (CSP/SA/Tabu için)
      if (this.constraintSystem && window.programData) {
        const constraintScore = this.evaluateConstraints(
          teacher1Id,
          teacher2Id,
          day,
          time,
          classId
        );
        score += constraintScore;
      }

      // 2. Fuzzy Logic ile benzerlik
      if (this.fuzzyLogic) {
        const similarityScore = this.calculateTeacherSimilarity(
          teacher1Id,
          teacher2Id
        );
        score += similarityScore * 10;
      }

      // 3. RL ile geçmiş performans (Q-Learning)
      if (this.rl && this.rl.getQValue) {
        // RL'den altyapının durumuna göre Q-Value al
        const rlScore = this.rl.getQValue(
          window.programData,
          {
            teacherId: teacher2Id,
            day,
            time,
          } // Durum bilgisi
        );
        score += rlScore * 5;
      }

      // 4. Pattern Memory ile benzer değişimler
      if (this.patternMemory) {
        const historyScore = this.getSwapHistoryScore(teacher1Id, teacher2Id);
        score += historyScore * 3;
      }
    } catch (error) {
      console.error("Skor hesaplama hatası:", error);
      score = 0; // Hata durumunda düşük skor
    }

    // Negatif skorlardan kaçın
    return Math.max(0, score);
  }

  /**
   * Kısıt değerlendirmesi (Basit CSP/Weighting)
   */
  evaluateConstraints(teacher1Id, teacher2Id, day, time, classId) {
    let score = 0;

    // Öğretmen 2'nin bu saatte başka dersi var mı? (Kritik)
    const teacher2Busy = this.isTeacherBusy(teacher2Id, day, time);

    if (teacher2Busy) {
      score -= 1000; // Kritik ihlal (Yüksek ceza)
    }

    // Öğretmen 2'nin tercihleri
    if (window.PreferenceManager && window.PreferenceManager.saatMusaitMi) {
      if (window.PreferenceManager.saatMusaitMi(day, time, teacher2Id)) {
        score += 20; // Hafif ödül
      } else {
        score -= 30; // Hafif ceza
      }
    }

    // Diğer dersleri ile boşluk (gap) oluşturma (SA için)
    // Bu kontrol çok karmaşık olduğu için burada sadece basit bir yaklaşım kullanılır.
    // Detaylı gap analizi ConstraintSystem içinde yapılmalıdır.

    return score;
  }

  /**
   * Öğretmen meşgul mü?
   */
  isTeacherBusy(teacherId, day, time) {
    if (
      !window.programData ||
      !window.programData[day] ||
      !window.programData[day][time]
    ) {
      return false;
    }

    const slotData = window.programData[day][time];

    // Tekil ders veya Çift Ders (Split/Merged) kontrolü
    const lessons = Array.isArray(slotData) ? slotData : [slotData];

    // Yerleştirilecek öğretmenin (teacherId), o slotta başka bir derse sahip olup olmadığını kontrol et
    return lessons.some((lesson) => lesson?.ogretmen_id === teacherId);
  }

  /**
   * Öğretmen benzerliği (Fuzzy)
   */
  calculateTeacherSimilarity(teacher1Id, teacher2Id) {
    const teacher1 = window.ScheduleDataManager?.ogretmenBul(teacher1Id);
    const teacher2 = window.ScheduleDataManager?.ogretmenBul(teacher2Id);

    if (!teacher1 || !teacher2) return 0;

    let similarity = 0;

    // Aynı branş mı? (Keskin kriter)
    if (teacher1.brans === teacher2.brans) {
      similarity += 5;
    }

    // Benzer ders yükü mü? (Yumuşak kriter)
    if (teacher1.dersYuku && teacher2.dersYuku) {
      // Ders yükü farkı 1-2 saat içindeyse daha yüksek benzerlik
      const diff = Math.abs(teacher1.dersYuku - teacher2.dersYuku);
      similarity += Math.max(0, 5 - diff);
    }

    return similarity;
  }

  /**
   * Geçmiş değişim skoru (Pattern Memory)
   */
  getSwapHistoryScore(teacher1Id, teacher2Id) {
    const key = `${teacher1Id}_${teacher2Id}`;
    const reverseKey = `${teacher2Id}_${teacher1Id}`;

    // swapHistory'yi daha az sık kullanılan bir Map veya Set'e taşımak performansı artırabilir.
    const history = this.swapHistory.filter(
      (h) => h.key === key || h.key === reverseKey
    );

    if (history.length === 0) return 0;

    const successCount = history.filter((h) => h.success).length;
    const successRate = successCount / history.length;

    return successRate * 10; // Başarı oranı arttıkça skor artar
  }

  /**
   * Değişim yapılabilir mi kontrol et (Feasibility Check)
   */
  checkSwapFeasibility(teacher1Id, teacher2Id, day, time, classId) {
    const issues = [];

    // Öğretmen 2 meşgul mü? (KRİTİK)
    if (this.isTeacherBusy(teacher2Id, day, time)) {
      issues.push({
        type: "conflict",
        severity: "critical",
        message: "Öğretmen bu saatte başka derstedir",
      });
    }

    // Öğretmen 2'nin tercihleri (MEDIUM)
    if (window.PreferenceManager && window.PreferenceManager.saatMusaitMi) {
      if (!window.PreferenceManager.saatMusaitMi(day, time, teacher2Id)) {
        issues.push({
          type: "preference",
          severity: "medium",
          message: "Öğretmenin tercihine uygun değil (Tercih ihlali)",
        });
      }
    }

    // Lock kontrolü (KRİTİK)
    const teacher2 = window.ScheduleDataManager?.ogretmenBul(teacher2Id);
    if (teacher2?.locked) {
      issues.push({
        type: "locked",
        severity: "critical",
        message: "Öğretmen kilitli",
      });
    }

    // Kritik hata yoksa feasible
    const feasible =
      issues.filter((i) => i.severity === "critical").length === 0;

    return {
      feasible: feasible,
      issues: issues,
    };
  }

  /**
   * Tabu listesini kontrol et
   */
  filterTabuCandidates(candidates, teacherId, day, time) {
    return candidates.filter((candidate) => {
      // Değişimin anahtarı
      const key = `${teacherId}_${candidate.teacherId}_${day}_${time}`;
      return !this.tabuList.includes(key);
    });
  }

  /**
   * Değişimi uygula
   */
  async executeSwap(teacher1Id, teacher2Id, day, time, classId) {
    console.log("🔄 Ders değişimi uygulanıyor...", {
      teacher1Id,
      teacher2Id,
      day,
      time,
      classId,
    });

    try {
      // 1. Feasibility kontrolü (Tekrar)
      const feasibility = this.checkSwapFeasibility(
        teacher1Id,
        teacher2Id,
        day,
        time,
        classId
      );
      if (!feasibility.feasible) {
        throw new Error(
          `Kritik kısıt ihlali nedeniyle değişim yapılamaz: ${feasibility.issues
            .filter((i) => i.severity === "critical")
            .map((i) => i.message)
            .join(", ")}`
        );
      }

      // 2. Undo için kaydet
      if (window.UndoRedoManager?.saveState) {
        window.UndoRedoManager.saveState(window.programData, "Ders Değişimi");
      }

      // 3. Mevcut dersi al
      const currentLesson = this.getCurrentLesson(day, time, classId);
      if (!currentLesson) {
        throw new Error("Ders bulunamadı: Değişim yapılamadı.");
      }

      // 4. Öğretmen 2'nin bilgilerini al
      const teacher2 = window.ScheduleDataManager?.ogretmenBul(teacher2Id);
      if (!teacher2) {
        throw new Error("Yeni öğretmen bulunamadı: Değişim yapılamadı.");
      }

      // 5. Değişimi yap (Dersin öğretmen bilgilerini güncelle)
      currentLesson.ogretmen_id = teacher2Id;
      currentLesson.ogretmen_kod = teacher2.kod;
      currentLesson.ogretmen_adi = teacher2.tamAd;

      // programData'yı güncelle (Referans güncellendiği için bu adım çoğu zaman gereksizdir, ancak güvenlik için bırakılmıştır)
      const slotData = window.programData[day][time];
      if (Array.isArray(slotData)) {
        const index = slotData.findIndex((l) => l.sinif_id === classId);
        if (index !== -1) {
          slotData[index] = currentLesson;
        }
      } else {
        // Tekil ders yapısı varsa, referans zaten currentLesson'ı gösterir.
        window.programData[day][time] = currentLesson;
      }

      // 6. Tabu listesine ekle
      const tabuKey = `${teacher1Id}_${teacher2Id}_${day}_${time}`;
      this.tabuList.push(tabuKey);

      if (this.tabuList.length > this.maxTabuSize) {
        this.tabuList.shift(); // En eskiyi sil
      }

      // 7. Geçmişe kaydet (Başarılı)
      this.swapHistory.push({
        key: `${teacher1Id}_${teacher2Id}`,
        timestamp: Date.now(),
        day,
        time,
        classId,
        success: true,
      });

      // 8. RL'e öğret (Ödül)
      if (this.rl?.learn) {
        await this.rl.learn(window.programData, 100);
      }

      // 9. Pattern Memory'ye kaydet
      if (this.patternMemory?.learn) {
        await this.patternMemory.learn(window.programData, 100);
      }

      // 10. localStorage'a kaydet
      if (window.ScheduleDataManager?.saveToStorage) {
        window.ScheduleDataManager.saveToStorage();
      }

      // 11. UI'ı güncelle
      if (window.updateProgramTable) {
        window.updateProgramTable();
      }

      console.log("✅ Ders değişimi başarılı");

      return {
        success: true,
        message: `Ders, ${teacher2.tamAd} (${teacher2.kod}) öğretmenine başarıyla aktarıldı.`,
      };
    } catch (error) {
      console.error("❌ Ders değişimi hatası:", error);

      // Başarısız değişimi kaydet (Ceza)
      this.swapHistory.push({
        key: `${teacher1Id}_${teacher2Id}`,
        timestamp: Date.now(),
        day,
        time,
        classId,
        success: false,
      });

      // RL'e ceza öğret (Daha az ödül veya ceza)
      if (this.rl?.learn) {
        await this.rl.learn(window.programData, -50);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Değişim öner (UI için)
   */
  async suggestSwaps(teacherId, day, time, classId, limit = 5) {
    const candidates = await this.findSwapCandidates(
      teacherId,
      day,
      time,
      classId,
      { includeDifferentBranch: false } // Varsayılan olarak farklı branşı dahil etme
    );

    // En yüksek skorlu limit kadar adayı döndür
    return candidates.slice(0, limit);
  }

  /**
   * İstatistikler
   */
  getStatistics() {
    const totalSwaps = this.swapHistory.length;
    const successfulSwaps = this.swapHistory.filter((h) => h.success).length;
    const successRate =
      totalSwaps > 0 ? ((successfulSwaps / totalSwaps) * 100).toFixed(1) : 0;

    return {
      totalSwaps,
      successfulSwaps,
      successRate: `${successRate}%`,
      tabuListSize: this.tabuList.length,
      maxTabuSize: this.maxTabuSize,
    };
  }
}

// Export
if (typeof window !== "undefined") {
  window.SwapEngine = SwapEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SwapEngine;
}

console.log("✅ SwapEngine yüklendi (V2.0)");
