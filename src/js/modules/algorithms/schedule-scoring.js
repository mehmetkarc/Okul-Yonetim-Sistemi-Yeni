/**
 * ============================================
 * SCHEDULE SCORING SYSTEM - Global Skor Sistemi V3.0
 * ============================================
 * Programın kalitesini çok boyutlu analiz eder
 *
 * KRİTİK GÜNCELLEMELER (V3.0):
 * 1. 🟢 PERFORMANS: Çakışma ve Yük sayımı için 'IncrementalConflictCache' entegrasyonu.
 * 2. 🟢 FUZZY LOGIC: Soft constraint skorlaması için 'FuzzyLogicEngine' entegrasyonu.
 * 3. 🟢 YAPISAL İYİLEŞTİRME: Gereksiz döngüler kaldırıldı, hız O(N³) → O(N) yaklaştı.
 * 4. 🟢 BAĞIMLILIK KONTROLÜ: Gerekli modüllerin (Cache, Fuzzy) varlığı kontrol edildi.
 */

class ScheduleScoring {
  constructor(config = {}) {
    this.weights = {
      // Kritik kısıtlar (toplam: 50)
      teacherConflict: 20, // Öğretmen çakışması
      classConflict: 20, // Sınıf çakışması
      blockIntegrity: 10, // Blok bütünlüğü

      // Dağılım (toplam: 25)
      dayBalance: 10, // Günlük denge (Fuzzy)
      weekBalance: 8, // Haftalık denge (Fuzzy - yeni)
      teacherLoad: 7, // Öğretmen yükü (Fuzzy)

      // Boşluklar (toplam: 15)
      studentGaps: 8, // Öğrenci boşlukları (Fuzzy)
      teacherGaps: 7, // Öğretmen boşlukları (Fuzzy)

      // Tercihler (toplam: 10)
      teacherPreference: 6, // Öğretmen tercihleri (Fuzzy)
      timePreference: 4, // Zaman tercihleri (Fuzzy)
    };

    // Maksimum skorlar, ağırlıklar ile orantılı olmalı. Basit tutmak için 100 baz alınmıştır.
    this.maxScores = {
      teacherConflict: 100, // Kritik çakışmalar: 0 ise 100, >0 ise 0
      classConflict: 100, // Kritik çakışmalar: 0 ise 100, >0 ise 0
      blockIntegrity: 100, // Blok bütünlüğü oranı
      dayBalance: 100, // Fuzzy Skor
      weekBalance: 100, // Fuzzy Skor
      teacherLoad: 100, // Fuzzy Skor
      studentGaps: 100, // Fuzzy Skor
      teacherGaps: 100, // Fuzzy Skor
      teacherPreference: 100, // Fuzzy Skor
      timePreference: 100, // Fuzzy Skor
    };

    // Bağımlılıkları kontrol et ve başlat
    this.Cache = window.IncrementalConflictCache;
    this.Fuzzy = window.FuzzyLogic ? new window.FuzzyLogic() : null;

    if (!this.Cache) {
      console.error(
        "❌ ScheduleScoring: IncrementalConflictCache bulunamadı! Kritik performans düşüşü."
      );
    }
    if (!this.Fuzzy) {
      console.warn(
        "⚠️ ScheduleScoring: FuzzyLogicEngine bulunamadı. Soft Constraint'ler tam puan verilecektir."
      );
    }

    console.log("📊 ScheduleScoring V3.0 (Optimize) başlatıldı");
  }

  // ============================================
  // ANA SKORLAMA FONKSİYONU
  // ============================================

  /**
   * Programın tüm kalitesini hesaplar.
   * @param {object} program - Çizelge verisi.
   * @param {object} options - Ek seçenekler (Örn: cache: IncrementalConflictCache örneği)
   * @returns {object} Skor detayları.
   */
  calculate(program, options = {}) {
    const startTime = Date.now();

    const scores = {
      total: 0,
      normalized: 0,
      details: {},
      violations: [],
      warnings: [],
    };

    // ⚠️ Çakışma verilerini (Cache) kullanan metotlar program objesinden önce çalışır.
    const cacheInstance = options.cache || this.Cache?.getInstance();

    // 1. Kritik Çakışma Skoru (Cache ile O(1) hızında)
    scores.details.conflicts = this.scoreConflicts(program, cacheInstance);
    // 2. Blok Bütünlüğü (Döngü gerektirir, O(N))
    scores.details.blocks = this.scoreBlocks(program);
    // 3. Boşluk Skoru (Cache ve Fuzzy ile O(N) hızında)
    scores.details.gaps = this.scoreGaps(program, cacheInstance);
    // 4. Dağılım Skoru (Cache ve Fuzzy ile O(N) hızında)
    scores.details.distribution = this.scoreDistribution(
      program,
      cacheInstance
    );
    // 5. Tercih Skoru (Döngü gerektirir, O(N))
    scores.details.preferences = this.scorePreferences(program);

    // --- Toplam Skor Hesaplama ---
    let totalScore = 0;
    let maxPossibleScore = 0;
    let totalWeight = 0;

    // Tüm kategori skorlarını topla ve normalize et
    for (const key of Object.keys(this.maxScores)) {
      const category =
        key.includes("Conflict") || key.includes("Integrity")
          ? "conflicts"
          : key.includes("Balance") || key.includes("Load")
          ? "distribution"
          : key.includes("Gaps")
          ? "gaps"
          : key.includes("Preference")
          ? "preferences"
          : "blocks";

      const detail = scores.details[category]?.details[key];
      const rawScore =
        detail !== undefined ? detail : scores.details[category]?.rawScore || 0;
      const weight = this.weights[key] || 0;
      const maxScore = this.maxScores[key] || 0;

      // Ağırlıklı skor hesapla: (Maksimum Skor * Ağırlık)
      const weightedScore = (rawScore / maxScore) * weight;

      totalScore += weightedScore;
      maxPossibleScore += weight; // Maksimum toplam ağırlık 100'dür (this.weights'in toplamı)
      totalWeight += weight;

      // Detaylar objesine ekle
      scores.details[category].details[key] = {
        rawScore: rawScore,
        maxScore: maxScore,
        weight: weight,
        weightedScore: weightedScore,
      };
    }

    scores.total = totalScore;
    scores.normalized = (totalScore / totalWeight) * 100;

    // İhlal ve uyarıları topla
    for (const category in scores.details) {
      scores.violations.push(...(scores.details[category].violations || []));
      scores.warnings.push(...(scores.details[category].warnings || []));
    }

    scores.calculationTime = Date.now() - startTime;

    console.log(
      `📊 Skor hesaplandı: ${scores.normalized.toFixed(
        2
      )}/100 (Toplam Kritik Ağırlık: ${totalWeight}) (${
        scores.calculationTime
      }ms)`
    );

    return scores;
  }

  // ============================================
  // KRİTİK SKORLAMA (CACHE entegreli)
  // ============================================

  /**
   * Öğretmen ve Sınıf çakışmalarını Cache üzerinden kontrol eder (O(1)).
   */
  scoreConflicts(program, cacheInstance) {
    const result = {
      rawScore: 0,
      weightedScore: 0,
      violations: [],
      warnings: [],
      details: {
        teacherConflict: 0,
        classConflict: 0,
      },
    };

    if (!cacheInstance) return result; // Cache yoksa puan verilemez

    // 1. Öğretmen Çakışması
    const teacherConflicts = cacheInstance.getTeacherConflictCount();
    result.details.teacherConflict = teacherConflicts;

    // Kritik Kural: 0 çakışma = 100 puan, >0 çakışma = 0 puan (Hard Constraint olarak davranır)
    const teacherScore =
      teacherConflicts === 0 ? this.maxScores.teacherConflict : 0;

    if (teacherConflicts > 0) {
      // Cache'ten ihlal listesini alıp uyarıları doldurmak daha doğru
      result.violations.push({
        type: "teacher_conflict",
        severity: "critical",
        message: `${teacherConflicts} adet öğretmen çakışması tespit edildi.`,
        count: teacherConflicts,
      });
    }

    // 2. Sınıf Çakışması
    const classConflicts = cacheInstance.getClassConflictCount();
    result.details.classConflict = classConflicts;

    const classScore = classConflicts === 0 ? this.maxScores.classConflict : 0;

    if (classConflicts > 0) {
      result.violations.push({
        type: "class_conflict",
        severity: "critical",
        message: `${classConflicts} adet sınıf çakışması tespit edildi.`,
        count: classConflicts,
      });
    }

    // Kritik Skor, bu metotta (teacherConflict ve classConflict) doğrudan toplam ağırlıklı skora eklenir.
    result.rawScore = teacherScore + classScore;

    return result;
  }

  // ============================================
  // DAĞILIM SKORLAMA (FUZZY entegreli)
  // ============================================

  /**
   * Günlük denge (stdDev) ve öğretmen yükü dengesini (stdDev) Fuzzy Logic ile puanlar.
   */
  scoreDistribution(program, cacheInstance) {
    const result = {
      rawScore: 0,
      weightedScore: 0,
      violations: [],
      warnings: [],
      details: {
        dayBalance: 0,
        weekBalance: 0, // Şimdilik yer tutucu
        teacherLoad: 0,
      },
    };

    if (!cacheInstance) return result;

    // 1. Günlük Denge (Sınıf bazlı)
    const classDailyCounts = cacheInstance.getClassDailyCounts();
    let totalDayBalanceScore = 0;
    let totalClassesWithLessons = 0;

    for (const classId in classDailyCounts) {
      const counts = Object.values(classDailyCounts[classId]).filter(
        (v) => v > 0
      );
      if (counts.length === 0) continue;

      totalClassesWithLessons++;

      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance =
        counts.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
        counts.length;
      const stdDev = Math.sqrt(variance);

      // Fuzzy Logic kullanımı: Standart Sapma düşük olmalı (BALANCE_LOW)
      const balanceFuzzyScore = this.Fuzzy
        ? this.Fuzzy.scoreBalanceDeviation(stdDev * 10) // StdDev'i 10 ile çarparak skalayı genişlet
        : Math.max(0, 100 - stdDev * 20); // Fallback: Eski düz hesap

      totalDayBalanceScore += balanceFuzzyScore;

      if (stdDev > 1.5) {
        // Dengesizlik uyarısı
        result.warnings.push({
          type: "day_imbalance",
          severity: "medium",
          message: `Günlük dengesizlik (Sınıf): StdDev: ${stdDev.toFixed(1)}`,
          stdDev: stdDev,
        });
      }
    }

    result.details.dayBalance =
      totalClassesWithLessons > 0
        ? totalDayBalanceScore / totalClassesWithLessons
        : 100;

    // 2. Öğretmen Yükü Dengesi (Haftalık toplam yük stdDev)
    const teacherTotalCounts = cacheInstance.getTeacherTotalCounts();
    const loads = Object.values(teacherTotalCounts).filter((v) => v > 0);

    if (loads.length > 0) {
      const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
      const loadVariance =
        loads.reduce((sum, v) => sum + Math.pow(v - avgLoad, 2), 0) /
        loads.length;
      const loadStdDev = Math.sqrt(loadVariance);

      // Fuzzy Logic kullanımı: Standart Sapma düşük olmalı (BALANCE_LOW)
      const loadFuzzyScore = this.Fuzzy
        ? this.Fuzzy.scoreBalanceDeviation(loadStdDev) // Yük StdDev'i daha büyük bir aralıkta olduğu için çarpmadan kullan
        : Math.max(0, 100 - loadStdDev * 2); // Fallback: Eski düz hesap

      result.details.teacherLoad = loadFuzzyScore;
    } else {
      result.details.teacherLoad = 100;
    }

    // Ham skor hesapla (Ağırlıklı skor hesaplaması 'calculate' metodunda yapılıyor)
    // Bu metot 0-100 arası skorları döndürür.
    return result;
  }

  // ============================================
  // BOŞLUK SKORLAMA (FUZZY entegreli)
  // ============================================

  /**
   * Öğrenci ve Öğretmen Boşluklarını (Gap) Cache üzerinden toplayıp Fuzzy Logic ile puanlar.
   */
  scoreGaps(program, cacheInstance) {
    const result = {
      rawScore: 0,
      weightedScore: 0,
      violations: [],
      warnings: [],
      details: {
        studentGaps: 0,
        teacherGaps: 0,
      },
    };

    if (!cacheInstance) return result;

    // 1. Öğrenci Boşlukları (Sınıf bazlı günlük maksimum boşluk sayılarının ortalaması)
    // Cache: totalClassGaps (tüm boşlukların toplamı) yerine, *maksimum* boşluk sayısına odaklanmak daha iyidir.
    const classDailyMaxGaps = cacheInstance.getClassDailyMaxGaps();
    let totalStudentFuzzyScore = 0;
    let countStudentDays = 0;

    for (const classId in classDailyMaxGaps) {
      for (const day in classDailyMaxGaps[classId]) {
        const maxGap = classDailyMaxGaps[classId][day];
        if (maxGap > 0) {
          // maxGap arttıkça puan düşmeli
          const fuzzyScore = this.Fuzzy
            ? this.Fuzzy.scoreGapPenalty(maxGap)
            : Math.max(0, 100 - maxGap * 30); // Fallback: Eski düz hesap

          totalStudentFuzzyScore += fuzzyScore;
          countStudentDays++;

          if (maxGap > 2) {
            result.warnings.push({
              type: "student_gap",
              severity: maxGap > 3 ? "high" : "medium",
              message: `Öğrenci büyük boşluğu: ${this.getClassName(
                classId,
                program
              )} - Max Gap: ${maxGap}`,
              gap: maxGap,
            });
          }
        } else if (maxGap === 0) {
          // Boşluk yoksa tam puan
          totalStudentFuzzyScore += 100;
          countStudentDays++;
        }
      }
    }

    result.details.studentGaps =
      countStudentDays > 0 ? totalStudentFuzzyScore / countStudentDays : 100;

    // 2. Öğretmen Boşlukları (Öğretmen bazlı günlük maksimum boşluk sayılarının ortalaması)
    const teacherDailyMaxGaps = cacheInstance.getTeacherDailyMaxGaps();
    let totalTeacherFuzzyScore = 0;
    let countTeacherDays = 0;

    for (const teacherId in teacherDailyMaxGaps) {
      for (const day in teacherDailyMaxGaps[teacherId]) {
        const maxGap = teacherDailyMaxGaps[teacherId][day];
        if (maxGap > 0) {
          // maxGap arttıkça puan düşmeli
          const fuzzyScore = this.Fuzzy
            ? this.Fuzzy.scoreGapPenalty(maxGap)
            : Math.max(0, 100 - maxGap * 30); // Fallback: Eski düz hesap

          totalTeacherFuzzyScore += fuzzyScore;
          countTeacherDays++;
        } else if (maxGap === 0) {
          // Boşluk yoksa tam puan
          totalTeacherFuzzyScore += 100;
          countTeacherDays++;
        }
      }
    }

    result.details.teacherGaps =
      countTeacherDays > 0 ? totalTeacherFuzzyScore / countTeacherDays : 100;

    // Ham skor hesapla (Ağırlıklı skor hesaplaması 'calculate' metodunda yapılıyor)
    // Bu metot 0-100 arası skorları döndürür.
    return result;
  }

  // ============================================
  // TERCİH SKORLAMA (FUZZY entegreli)
  // ============================================

  /**
   * Öğretmen müsaitlik tercihleri ve zaman tercihlerini Fuzzy Logic ile puanlar.
   */
  scorePreferences(program) {
    const result = {
      rawScore: 0,
      weightedScore: 0,
      violations: [],
      warnings: [],
      details: {
        teacherPreference: 0,
        timePreference: 0,
      },
    };

    let matchedPreferences = 0;
    let totalPreferences = 0;
    let morningCount = 0;
    let totalLessons = 0;

    // --- Öğretmen Tercihleri Kontrolü ---
    if (window.PreferenceManager) {
      for (const classId in program) {
        for (const day in program[classId]) {
          for (const time in program[classId][day]) {
            const lesson = program[classId][day][time];
            if (lesson && lesson.teacherId) {
              totalPreferences++;
              totalLessons++;

              // Tercih Eşleşme Kontrolü
              if (
                window.PreferenceManager.saatMusaitMi(
                  day,
                  time,
                  lesson.teacherId
                )
              ) {
                matchedPreferences++;
              } else {
                result.warnings.push({
                  type: "preference_violation",
                  severity: "low",
                  message: `Tercih ihlali: ${
                    lesson.teacherName || "Bilinmeyen"
                  } - ${this.getDayName(day)} ${time}. saat`,
                  teacherId: lesson.teacherId,
                  day: day,
                  time: time,
                });
              }

              // Zaman Tercihi Kontrolü (Hızlı skorlama için aynı döngüde)
              const t = parseInt(time);
              if (t <= 4) {
                // Sabah saatleri (1. ders-5. ders arası)
                morningCount++;
              }
            }
          }
        }
      }

      // Fuzzy Logic kullanımı: Eşleşme Oranı yüksek olmalı (HIGH)
      const matchRatio =
        totalPreferences > 0
          ? (matchedPreferences / totalPreferences) * 100
          : 100;

      result.details.teacherPreference = this.Fuzzy
        ? this.Fuzzy.scorePreferenceMatch(matchRatio)
        : matchRatio; // Fallback: Eski düz hesap
    } else {
      result.details.teacherPreference = 50; // PreferenceManager yoksa orta puan

      // Zaman tercihi için ayrı döngü
      if (!window.PreferenceManager) {
        for (const classId in program) {
          for (const day in program[classId]) {
            for (const time in program[classId][day]) {
              const lesson = program[classId][day][time];
              if (lesson) {
                totalLessons++;
                const t = parseInt(time);
                if (t <= 4) {
                  morningCount++;
                }
              }
            }
          }
        }
      }
    }

    // --- Zaman Tercihi Skoru ---
    // Sabah (0-4. dersler) / Toplam dersler oranı
    if (totalLessons > 0) {
      const morningRatio = (morningCount / totalLessons) * 100;

      // Fuzzy Logic kullanımı: Sabah ders oranı yüksek olmalı (HIGH)
      result.details.timePreference = this.Fuzzy
        ? this.Fuzzy.scorePreferenceMatch(morningRatio) // MorningRatio'yu yüksek uygunluk olarak skorla
        : morningRatio; // Fallback: Eski düz hesap
    } else {
      result.details.timePreference = 50; // Veri yoksa orta puan
    }

    // Ham skor hesapla (0-100 arası skorlar)
    return result;
  }

  // ============================================
  // BLOK SKORLAMA (Bütünlük Kontrolü)
  // ============================================

  /**
   * Blok bütünlüğü (derslerin arka arkaya gelmesi) kontrol edilir (O(N)).
   */
  scoreBlocks(program) {
    const result = {
      rawScore: 0,
      weightedScore: 0,
      violations: [],
      warnings: [],
      details: {
        blockIntegrity: 0, // 0-100 arası oran
      },
    };

    let totalBlockStarts = 0;
    let validBlockStarts = 0;

    for (const classId in program) {
      for (const day in program[classId]) {
        // time'ları sıralı alalım
        const times = Object.keys(program[classId][day])
          .map(Number)
          .sort((a, b) => a - b);

        for (const time of times) {
          const lesson = program[classId][day][time];

          // Eğer ders varsa ve blok başlangıcı ise (bir önceki ders farklı veya boşsa)
          if (lesson && lesson.blockSize > 1) {
            const prevLesson = program[classId][day][time - 1];
            const isBlockStart =
              !prevLesson || prevLesson.lessonId !== lesson.lessonId;

            if (isBlockStart) {
              totalBlockStarts++;

              // Blok bütünlüğü kontrolü (mevcut pozisyondan başlayarak)
              let blockValid = true;
              for (let i = 1; i < lesson.blockSize; i++) {
                const nextTime = time + i;
                const nextLesson = program[classId][day][nextTime];

                if (!nextLesson || nextLesson.lessonId !== lesson.lessonId) {
                  blockValid = false;
                  break;
                }
              }

              if (blockValid) {
                validBlockStarts++;
              } else {
                result.violations.push({
                  type: "block_integrity",
                  severity: "high",
                  message: `Blok bütünlüğü bozuk: ${this.getClassName(
                    classId,
                    program
                  )} - ${lesson.subjectName} (${lesson.blockSize} saat)`,
                  classId: classId,
                  day: day,
                  time: time,
                });
              }
            }
          }
        }
      }
    }

    // Blok bütünlüğü oranı (0-100)
    result.details.blockIntegrity =
      totalBlockStarts > 0 ? (validBlockStarts / totalBlockStarts) * 100 : 100;

    // Ham skor hesapla (0-100 arası skorlar)
    return result;
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  getDayName(day) {
    const days = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    return days[day] || day;
  }

  getClassName(classId, program) {
    if (program[classId]) {
      // Bir dersin className'ini bulmak için hızlıca ilk dersi al
      for (const day in program[classId]) {
        for (const time in program[classId][day]) {
          return program[classId][day][time].className || `Sınıf ${classId}`;
        }
      }
    }
    return `Sınıf ${classId}`;
  }

  // ============================================
  // KARŞILAŞTIRMA VE RAPORLAMA (Güncellendi)
  // ============================================

  compare(program1, program2, cache1, cache2) {
    const score1 = this.calculate(program1, { cache: cache1 });
    const score2 = this.calculate(program2, { cache: cache2 });

    return {
      program1: score1,
      program2: score2,
      difference: score2.normalized - score1.normalized,
      winner: score2.normalized > score1.normalized ? "program2" : "program1",
    };
  }

  generateReport(scores) {
    const report = {
      summary: `Toplam Skor: ${scores.normalized.toFixed(2)}/100`,
      grade: this.getGrade(scores.normalized),
      categories: {},
      criticalIssues: scores.violations.filter((v) => v.severity === "critical")
        .length,
      warnings: scores.warnings.length,
    };

    for (const category in scores.details) {
      const detail = scores.details[category];
      // Ağırlıklı skoru detaylardan alıp topla
      let categoryWeightedScore = 0;
      let maxCategoryWeight = 0;

      for (const key in detail.details) {
        if (detail.details[key].weightedScore !== undefined) {
          categoryWeightedScore += detail.details[key].weightedScore;
          maxCategoryWeight += detail.details[key].weight;
        }
      }

      report.categories[category] = {
        weightedScore: categoryWeightedScore.toFixed(2),
        scorePercentage:
          maxCategoryWeight > 0
            ? ((categoryWeightedScore / maxCategoryWeight) * 100).toFixed(2)
            : "100.00",
        violations: detail.violations?.length || 0,
        warnings: detail.warnings?.length || 0,
      };
    }

    return report;
  }

  getGrade(normalizedScore) {
    if (normalizedScore >= 90) return "A+ (Mükemmel)";
    if (normalizedScore >= 80) return "A (Çok İyi)";
    if (normalizedScore >= 70) return "B (İyi)";
    if (normalizedScore >= 60) return "C (Orta)";
    if (normalizedScore >= 50) return "D (Geçer)";
    return "F (Yetersiz)";
  }
}

// Global export
if (typeof window !== "undefined") {
  window.ScheduleScoring = ScheduleScoring;
  console.log("✅ ScheduleScoring V3.0 (Optimize) yüklendi");
}

// ✅ calculateFitness wrapper metodu ekle (schedule-algorithm-v2.js uyumluluğu için)
ScheduleScoring.prototype.calculateFitness = function (schedule, options = {}) {
  // options'tan cache örneği alınıp calculate'a iletilmeli
  const cacheInstance = options.cache || this.Cache?.getInstance();

  // console.log("📊 ScheduleScoring.calculateFitness() → calculate() yönlendiriliyor");

  const result = this.calculate(schedule, { cache: cacheInstance });

  // schedule-algorithm-v2.js'in beklediği format: sadece sayı döndür
  return result.normalized || 0;
};

console.log("✅ ScheduleScoring.calculateFitness() wrapper optimize edildi");
