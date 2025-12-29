/**
 * ============================================
 * DISTRIBUTION ANALYZER V2.0
 * ============================================
 * Ders dağıtımını, verimliliği ve kalite skorlarını analiz eder.
 * Bir optimizasyon algoritmasından (GA, ACO) çıkan 'solution' nesnesini
 * detaylı bir şekilde değerlendirir.
 */

class DistributionAnalyzer {
  constructor() {
    this.analysisCache = {};
    // Programın varsayılan sınırları
    this.MAX_DAILY_HOURS = 8;
    this.TOTAL_DAYS = 5;
  }

  /**
   * Tam analiz raporu oluştur
   * @param {Object} solution - Algoritma tarafından üretilen program verisi
   */
  analyzeDistribution(solution) {
    console.log("📊 Distribution Analyzer V2.0 başlatıldı...");

    // Flatten programData for easier analysis in some steps
    const flatAssignments = this.flattenProgram(solution);

    const report = {
      timestamp: Date.now(),
      overall: this.analyzeOverall(solution, flatAssignments),
      teachers: this.analyzeTeachers(solution, flatAssignments),
      classes: this.analyzeClasses(solution, flatAssignments),
      conflicts: this.analyzeConflicts(solution), // ConflictDetector'den alınabilir, şimdilik basit tutuldu
      quality: this.analyzeQuality(solution),
      recommendations: [],
    };

    // Öneriler oluştur
    report.recommendations = this.generateRecommendations(report);

    console.log("✅ Analiz tamamlandı");
    return report;
  }

  /**
   * Yardımcı Metot: Karmaşık program yapısını derslerin düz bir listesine dönüştürür.
   */
  flattenProgram(solution) {
    const lessons = [];
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];
          // lesson nesnesinin gerekli alanlara (teacherId, className, day, time) sahip olduğunu varsayıyoruz
          if (lesson && lesson.teacherId) {
            lessons.push({
              ...lesson,
              classId: classId,
              day: parseInt(day),
              time: parseInt(time),
            });
          }
        }
      }
    }
    return lessons;
  }

  /**
   * Genel analiz
   */
  analyzeOverall(solution, flatAssignments) {
    let totalClasses = new Set();
    let totalTeachers = new Set();
    let filledSlots = flatAssignments.length;

    // Total slot hesaplaması (Tüm sınıflar için hafta boyunca toplam potansiyel ders saati)
    for (const assignment of flatAssignments) {
      totalClasses.add(assignment.classId);
      totalTeachers.add(assignment.teacherId);
    }

    const totalPossibleSlots =
      totalClasses.size * this.TOTAL_DAYS * this.MAX_DAILY_HOURS;

    return {
      totalClasses: totalClasses.size,
      totalTeachers: totalTeachers.size,
      totalPossibleSlots: totalPossibleSlots,
      filledSlots: filledSlots,
      emptySlots: totalPossibleSlots - filledSlots,
      fillRate: ((filledSlots / totalPossibleSlots) * 100).toFixed(2) + "%",
      avgLessonsPerClass:
        totalClasses.size > 0
          ? (filledSlots / totalClasses.size).toFixed(2)
          : 0,
      avgLessonsPerTeacher:
        totalTeachers.size > 0
          ? (filledSlots / totalTeachers.size).toFixed(2)
          : 0,
    };
  }

  /**
   * Öğretmen bazlı analiz
   */
  analyzeTeachers(solution, flatAssignments) {
    const teacherAnalysis = {};

    // 1. Aşama: Veri Toplama
    for (const lesson of flatAssignments) {
      const teacherId = lesson.teacherId;
      const day = lesson.day;
      const time = lesson.time;

      if (!teacherAnalysis[teacherId]) {
        teacherAnalysis[teacherId] = {
          teacherId: teacherId,
          teacherName: lesson.teacherName,
          totalLessons: 0,
          dailyDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          timeSlots: {}, // Gün/saat bazlı atamaları tutar
          classes: new Set(),
          subjects: new Set(),
          preferenceMatch: 100, // Varsayılan
          issues: [],
        };
      }

      const analysis = teacherAnalysis[teacherId];
      analysis.totalLessons++;
      analysis.dailyDistribution[day]++;
      analysis.timeSlots[`${day}_${time}`] = lesson;
      analysis.classes.add(lesson.className);
      analysis.subjects.add(lesson.subjectName);
    }

    // 2. Aşama: İstatistiksel ve Kalite Hesaplamaları
    for (const teacherId in teacherAnalysis) {
      const analysis = teacherAnalysis[teacherId];

      // Boşlukları hesapla
      const gapAnalysis = this.calculateGaps(analysis.timeSlots);
      analysis.gaps = gapAnalysis.totalGaps;
      analysis.maxGap = gapAnalysis.maxGap;
      analysis.gapDetails = gapAnalysis.details;
      analysis.gapCount = gapAnalysis.gapCount; // Kaç boş pencere olduğu eklendi

      // Gün dengesini hesapla (Mean, StdDev, Variance)
      analysis.dayBalance = this.calculateDayBalance(
        analysis.dailyDistribution
      );

      // Verimlilik (Utilization) Hesapla
      const possibleDays = Object.values(analysis.dailyDistribution).filter(
        (v) => v > 0
      ).length;
      analysis.utilization = this.calculateUtilization(
        analysis.totalLessons,
        possibleDays
      );

      // Tercih uyumunu hesapla (Eski kodda global manager'a bağımlı, burada basitleştirildi)
      if (window.PreferenceManager) {
        analysis.preferenceMatch = this.calculatePreferenceMatch(
          flatAssignments,
          teacherId
        );
      } else {
        analysis.preferenceMatch = 100; // Varsayılan olarak mükemmel uyum
      }

      // Sorunları tespit et
      analysis.issues = this.findTeacherIssues(analysis);

      // Set'leri array'e çevir
      analysis.classes = Array.from(analysis.classes);
      analysis.subjects = Array.from(analysis.subjects);

      // Kalite skoru
      analysis.qualityScore = this.calculateTeacherQuality(analysis);
    }

    return teacherAnalysis;
  }

  /**
   * Sınıf bazlı analiz
   */
  analyzeClasses(solution, flatAssignments) {
    const classAnalysis = {};

    // 1. Aşama: Veri Toplama
    for (const lesson of flatAssignments) {
      const classId = lesson.classId;
      const day = lesson.day;
      const time = lesson.time;

      if (!classAnalysis[classId]) {
        classAnalysis[classId] = {
          classId: classId,
          className: lesson.className,
          totalLessons: 0,
          dailyDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          timeSlots: {},
          teachers: new Set(),
          subjects: new Set(),
          issues: [],
        };
      }

      const analysis = classAnalysis[classId];
      analysis.totalLessons++;
      analysis.dailyDistribution[day]++;
      analysis.timeSlots[`${day}_${time}`] = lesson;
      analysis.teachers.add(lesson.teacherName);
      analysis.subjects.add(lesson.subjectName);
    }

    // 2. Aşama: İstatistiksel ve Kalite Hesaplamaları
    for (const classId in classAnalysis) {
      const analysis = classAnalysis[classId];

      // Boşlukları hesapla
      const gapAnalysis = this.calculateGaps(analysis.timeSlots);
      analysis.gaps = gapAnalysis.totalGaps;
      analysis.maxGap = gapAnalysis.maxGap;
      analysis.gapDetails = gapAnalysis.details;
      analysis.gapCount = gapAnalysis.gapCount;

      // Gün dengesini hesapla
      analysis.dayBalance = this.calculateDayBalance(
        analysis.dailyDistribution
      );

      // Sorunları tespit et
      analysis.issues = this.findClassIssues(analysis);

      // Set'leri array'e çevir
      analysis.teachers = Array.from(analysis.teachers);
      analysis.subjects = Array.from(analysis.subjects);

      // Kalite skoru
      analysis.qualityScore = this.calculateClassQuality(analysis);
    }

    return classAnalysis;
  }

  /**
   * Çakışmaları analiz et
   * NOT: Bu metot ideal olarak ConflictDetector sınıfından veri almalıdır.
   * Şimdilik basit öğretmen çakışması kontrolü korundu.
   */
  analyzeConflicts(solution) {
    const conflicts = {
      teacherConflicts: [],
      classConflicts: [], // Sınıf çakışmaları (tek sınıfta birden fazla ders)
      roomConflicts: [], // Oda çakışmaları (aynı odada birden fazla ders)
      preferenceViolations: [],
      total: 0,
    };

    // Eğer ConflictDetector global olarak mevcutsa, onu kullan
    if (window.conflictDetector && window.conflictDetector.detectAll) {
      const conflictReport = window.conflictDetector.detectAll(
        solution,
        window.conflictDetector.DEFAULT_WEIGHTS
      );

      conflicts.total = conflictReport.total;
      conflicts.teacherConflicts =
        conflictReport.byType[
          window.conflictDetector.conflictTypes.TEACHER_OVERLAP
        ] || [];
      conflicts.classConflicts =
        conflictReport.byType[
          window.conflictDetector.conflictTypes.CLASS_OVERLAP
        ] || [];
      conflicts.roomConflicts =
        conflictReport.byType[
          window.conflictDetector.conflictTypes.ROOM_OVERLAP
        ] || [];
      conflicts.preferenceViolations =
        conflictReport.byType[
          window.conflictDetector.conflictTypes.SOFT_CONSTRAINT_VIOLATION
        ] || [];

      // Ceza puanı skorunu da buraya ekleyelim
      conflicts.penaltyScore = conflictReport.penaltyScore;
    } else {
      // ConflictDetector yoksa, eski basit mantığı kullan
      // ... (Orijinal koddaki basit çakışma kontrolü mantığı aynen korunur) ...
      // Basit kontrol: Öğretmen çakışması
      const teacherSchedule = {};

      for (const classId in solution) {
        for (const day in solution[classId]) {
          for (const time in solution[classId][day]) {
            const lesson = solution[classId][day][time];
            if (!lesson || !lesson.teacherId) continue;

            const key = `${lesson.teacherId}_${day}_${time}`;
            if (!teacherSchedule[key]) teacherSchedule[key] = [];
            teacherSchedule[key].push({ classId: classId, ...lesson });
          }
        }
      }

      for (const key in teacherSchedule) {
        if (teacherSchedule[key].length > 1) {
          const [teacherId, day, time] = key.split("_");
          conflicts.teacherConflicts.push({
            teacherId: parseInt(teacherId),
            teacherName: teacherSchedule[key][0].teacherName,
            day: parseInt(day),
            time: parseInt(time),
            lessons: teacherSchedule[key].map((l) => l.className),
          });
        }
      }
      conflicts.total = conflicts.teacherConflicts.length;
      conflicts.penaltyScore = conflicts.total * 500; // Varsayılan ceza puanı
    }

    return conflicts;
  }

  /**
   * Kalite analizi
   */
  analyzeQuality(solution) {
    const quality = {
      overall: 0,
      metrics: {
        gapPenalty: 0, // Boşluk cezası
        balancePenalty: 0, // Denge cezası
        preferenceScore: 0, // Tercih uyumu (100 üzerinden)
        conflictPenalty: 0, // Çakışma cezası (Sıfır olmalı)
      },
      issues: [],
      strengths: [],
    };

    const teacherAnalysis = this.analyzeTeachers(
      solution,
      this.flattenProgram(solution)
    );
    const conflicts = this.analyzeConflicts(solution);
    const entityCount = Object.keys(teacherAnalysis).length;

    if (entityCount === 0)
      return {
        overall: 100,
        metrics: {
          ...quality.metrics,
          conflictPenalty: conflicts.penaltyScore || 0,
        },
      };

    let totalGaps = 0;
    let totalGapWindows = 0;
    let totalVariance = 0;
    let totalPreference = 0;

    for (const teacherId in teacherAnalysis) {
      const teacher = teacherAnalysis[teacherId];
      totalGaps += teacher.gaps; // Toplam boş saat
      totalGapWindows += teacher.gapCount; // Toplam boş pencere sayısı
      totalVariance += parseFloat(teacher.dayBalance.variance);
      totalPreference += parseFloat(teacher.preferenceMatch);
    }

    // METRİK HESAPLAMALARI

    // 1. Çakışma Cezası (Sıfır olmalıdır)
    quality.metrics.conflictPenalty = conflicts.penaltyScore || 0;

    // 2. Boşluk Cezası (Gap Penalty) - Total boş pencere sayısı ve saat büyüklüğü
    // Ceza: (Toplam Boş Saat * 5) + (Toplam Boş Pencere * 20) / Öğretmen Sayısı
    quality.metrics.gapPenalty =
      (totalGaps * 5 + totalGapWindows * 20) / entityCount;

    // 3. Denge Cezası (Balance Penalty) - Varyans ortalaması
    // Ceza: (Toplam Varyans / Öğretmen Sayısı) * 10
    const avgVariance = totalVariance / entityCount;
    quality.metrics.balancePenalty = avgVariance * 10;

    // 4. Tercih Skoru (Preference Score) - Yüksek olmalıdır
    quality.metrics.preferenceScore = totalPreference / entityCount;

    // GENEL SKOR (Bu, Fitness Fonksiyonunun tersi gibi düşünülebilir)
    // 100 üzerinden başlayıp cezaları çıkarırız.
    const MAX_GAP_PENALTY = 50;
    const MAX_BALANCE_PENALTY = 40;

    let finalScore = 100;
    finalScore -= Math.min(quality.metrics.gapPenalty, MAX_GAP_PENALTY);
    finalScore -= Math.min(quality.metrics.balancePenalty, MAX_BALANCE_PENALTY);
    // Tercih Uyumunu puana ekleme (Eğer %80 ise - %20'si kadar ceza alırız)
    finalScore -= (100 - quality.metrics.preferenceScore) * 0.5; // Kalan %20'nin yarısı ceza

    // Kritik çakışmalar varsa skor hemen 0'a yakın olmalıdır.
    if (conflicts.penaltyScore > 0) {
      finalScore = Math.max(
        0,
        finalScore - Math.min(conflicts.penaltyScore / 100, 100)
      );
    }

    quality.overall = Math.max(0, finalScore);

    // Güçlü yönler ve sorunlar (Orijinal kod mantığı korundu)
    if (quality.metrics.conflictPenalty === 0 && conflicts.total === 0) {
      quality.strengths.push(
        "Hiç kritik çakışma yok (HARD CONSTRAINTS başarısı)."
      );
    }
    // ... (Diğer strength ve issue eklemeleri) ...

    if (quality.overall < 30) {
      quality.issues.push(
        "Çözüm kalitesi çok düşük. Algoritma parametrelerini gözden geçirin."
      );
    }

    return quality;
  }

  /**
   * Öğretmen/Sınıf Boşluklarını Hesapla
   * @param {Object} timeSlots - Gün_Saat anahtarlı ders nesneleri
   */
  calculateGaps(timeSlots) {
    const gaps = {
      totalGaps: 0,
      maxGap: 0,
      gapCount: 0,
      details: [],
    };

    for (let day = 1; day <= this.TOTAL_DAYS; day++) {
      const times = [];
      for (let time = 1; time <= this.MAX_DAILY_HOURS; time++) {
        if (timeSlots[`${day}_${time}`]) {
          times.push(time);
        }
      }

      times.sort((a, b) => a - b);

      for (let i = 0; i < times.length - 1; i++) {
        const gap = times[i + 1] - times[i] - 1;

        if (gap > 0) {
          gaps.totalGaps += gap;
          gaps.gapCount++;

          if (gap > gaps.maxGap) {
            gaps.maxGap = gap;
          }

          gaps.details.push({
            day: day,
            between: `${times[i]}-${times[i + 1]}`,
            gapSize: gap,
          });
        }
      }
    }
    return gaps;
  }

  /**
   * Öğretmen Verimliliğini (Utilization) Hesapla
   * @param {number} totalLessons - Toplam ders saati
   * @param {number} possibleDays - Ders verilen gün sayısı
   */
  calculateUtilization(totalLessons, possibleDays) {
    const maxPossible = possibleDays * this.MAX_DAILY_HOURS;
    return maxPossible > 0
      ? ((totalLessons / maxPossible) * 100).toFixed(2) + "%"
      : "0.00%";
  }

  /**
   * Tercih uyumunu hesapla
   */
  calculatePreferenceMatch(flatAssignments, teacherId) {
    let totalSlots = 0;
    let matchedSlots = 0;

    for (const lesson of flatAssignments) {
      if (lesson.teacherId === teacherId) {
        totalSlots++;
        // Varsayım: lesson nesnesinde tercih uyumu bilgisi var veya PreferenceManager globalde mevcut
        if (
          window.PreferenceManager &&
          window.PreferenceManager.saatMusaitMi(
            lesson.day,
            lesson.time,
            teacherId
          )
        ) {
          matchedSlots++;
        } else if (!window.PreferenceManager) {
          // PreferenceManager yoksa, sadece atanmış derslerin sayısını al
          matchedSlots = totalSlots;
        }
      }
    }

    return totalSlots > 0
      ? ((matchedSlots / totalSlots) * 100).toFixed(2)
      : 100;
  }

  /**
   * Gün dengesini hesapla
   */
  calculateDayBalance(dailyDistribution) {
    const values = Object.values(dailyDistribution).filter((v) => v > 0);

    if (values.length === 0) {
      return { mean: 0, variance: 0, stdDev: 0, balanced: true };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Varyans hesaplanırken paydada N kullanılır (Popülasyon Varyansı)
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    const stdDev = Math.sqrt(variance);

    return {
      mean: mean.toFixed(2),
      variance: variance.toFixed(2),
      stdDev: stdDev.toFixed(2),
      balanced: stdDev < 1.5,
    };
  }

  /**
   * Öğretmen sorunlarını bul
   */
  findTeacherIssues(analysis) {
    const issues = [];
    const MAX_GAP_WINDOWS = 2; // Maksimum 2 boş pencere kabul edilebilir
    const MAX_STD_DEV = 1.5; // Maksimum standart sapma
    const MIN_PREF_MATCH = 70; // Minimum tercih uyumu

    // Çok fazla boşluk (Boş pencere sayısı kontrolü eklendi)
    if (analysis.gapCount > MAX_GAP_WINDOWS) {
      issues.push({
        type: "HIGH_GAPS",
        severity: "high",
        message: `${analysis.gapCount} boş pencere var (${analysis.gaps} boş saat)`,
      });
    }

    // Dengesiz dağılım
    if (parseFloat(analysis.dayBalance.stdDev) > MAX_STD_DEV) {
      issues.push({
        type: "UNBALANCED",
        severity: "medium",
        message: `Haftalık dağılım dengesiz (StdDev: ${analysis.dayBalance.stdDev})`,
      });
    }

    // Düşük tercih uyumu
    if (parseFloat(analysis.preferenceMatch) < MIN_PREF_MATCH) {
      issues.push({
        type: "LOW_PREFERENCE",
        severity: "high",
        message: `Tercih uyumu düşük (%${analysis.preferenceMatch})`,
      });
    }

    // Günlük aşırı yük
    const maxDaily = Math.max(...Object.values(analysis.dailyDistribution));
    if (maxDaily > 7) {
      issues.push({
        type: "DAILY_OVERLOAD",
        severity: "high",
        message: `Bir günde ${maxDaily} saat ders var (İdeal max 7)`,
      });
    }

    return issues;
  }

  /**
   * Sınıf sorunlarını bul
   */
  findClassIssues(analysis) {
    const issues = [];

    // Çok fazla boşluk
    if (analysis.gapCount > 3) {
      // Sınıflar için biraz daha esnek
      issues.push({
        type: "HIGH_GAPS",
        severity: "medium",
        message: `${analysis.gapCount} boş pencere var`,
      });
    }

    // Dengesiz dağılım
    if (parseFloat(analysis.dayBalance.stdDev) > 2) {
      issues.push({
        type: "UNBALANCED",
        severity: "low",
        message: `Haftalık ders dağılımı dengesiz (StdDev: ${analysis.dayBalance.stdDev})`,
      });
    }

    return issues;
  }

  /**
   * Öğretmen kalite skoru (Basit Skor)
   */
  calculateTeacherQuality(analysis) {
    let score = 100;

    // Boşluk cezası: Her boş pencere için -5 puan
    score -= analysis.gapCount * 5;

    // Denge cezası: StdDev'in karesi * 10
    score -= Math.pow(parseFloat(analysis.dayBalance.stdDev), 2) * 5;

    // Tercih cezası: Uyumsuzluk yüzdesi
    score -= (100 - parseFloat(analysis.preferenceMatch)) * 0.3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Sınıf kalite skoru (Basit Skor)
   */
  calculateClassQuality(analysis) {
    let score = 100;

    // Boşluk cezası: Her boş pencere için -3 puan
    score -= analysis.gapCount * 3;

    // Denge cezası: StdDev'in karesi * 3
    score -= Math.pow(parseFloat(analysis.dayBalance.stdDev), 2) * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Öneriler oluştur
   */
  generateRecommendations(report) {
    const recommendations = [];

    // Genel kalite düşükse
    if (report.quality.overall < 70) {
      recommendations.push({
        priority: "high",
        category: "optimization",
        message: `Genel kalite düşük (${report.quality.overall.toFixed(
          2
        )}/100). Daha iyi bir çözüm arayışına girilmeli.`,
        action:
          "Algoritma iterasyon (nesil) sayısını artırın veya ceza ağırlıklarını gözden geçirin.",
      });
    }

    // Çok çakışma varsa
    if (report.conflicts.penaltyScore > 0) {
      recommendations.push({
        priority: "critical",
        category: "conflicts",
        message: `${report.conflicts.total} kritik/sert kısıt ihlali tespit edildi (Ceza: ${report.conflicts.penaltyScore}).`,
        action:
          "Programı bu çakışmalardan kurtarmak için yüksek ceza ağırlıkları ile algoritmayı yeniden çalıştırın.",
      });
    }

    // Boşluk sorunu
    if (report.quality.metrics.gapPenalty > 20) {
      recommendations.push({
        priority: "medium",
        category: "gaps",
        message: `Çok fazla boşluk/boş pencere cezası mevcut (Penalty: ${report.quality.metrics.gapPenalty.toFixed(
          2
        )}).`,
        action:
          "Algoritmada boşlukları minimize eden soft constraint (yumuşak kısıt) ağırlığını artırın.",
      });
    }

    // Tercih sorunu
    if (report.quality.metrics.preferenceScore < 70) {
      recommendations.push({
        priority: "medium",
        category: "preferences",
        message: `Öğretmen tercihleri uyumu düşük (%${report.quality.metrics.preferenceScore.toFixed(
          2
        )}).`,
        action:
          "Tercih kısıtlarını gevşetin veya bu soft constraint'in ağırlığını artırarak algoritmaya yeniden şans verin.",
      });
    }

    // Öğretmen bazlı öneriler (Sadece HIGH/MEDIUM sorunlular listelensin)
    for (const teacherId in report.teachers) {
      const teacher = report.teachers[teacherId];

      teacher.issues.forEach((issue) => {
        if (issue.severity === "high" || issue.severity === "medium") {
          recommendations.push({
            priority: issue.severity,
            category: "teacher",
            teacher: teacher.teacherName,
            message: `${teacher.teacherName} için sorun: ${issue.message}`,
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * Raporu konsola yazdır
   */
  printReport(report) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 DERS DAĞITIM ANALİZ RAPORU V2.0 (ALGORİTMA)");
    console.log("=".repeat(60));

    console.log("\n📈 GENEL VE PERFORMANS BİLGİLERİ:");
    console.log(`  • Sınıf Sayısı: ${report.overall.totalClasses}`);
    console.log(`  • Öğretmen Sayısı: ${report.overall.totalTeachers}`);
    console.log(`  • Doluluk Oranı: ${report.overall.fillRate}`);
    console.log(
      `  • Ortalama Ders/Öğretmen: ${report.overall.avgLessonsPerTeacher}`
    );

    console.log("\n🎯 KALİTE METRİKLERİ:");
    console.log(
      `  • GENEL KALİTE SKORU: ${report.quality.overall.toFixed(2)}/100`
    );
    console.log(
      `  • Conflict Penalty: ${report.quality.metrics.conflictPenalty.toFixed(
        2
      )}`
    );
    console.log(
      `  • Gap Penalty: ${report.quality.metrics.gapPenalty.toFixed(2)}`
    );
    console.log(
      `  • Balance Penalty: ${report.quality.metrics.balancePenalty.toFixed(2)}`
    );
    console.log(
      `  • Tercih Uyum Skoru: ${report.quality.metrics.preferenceScore.toFixed(
        2
      )}/100`
    );

    if (report.conflicts.total > 0) {
      console.log("\n⚠️ ÇAKIŞMALAR (ConflictDetector'den gelen):");
      console.log(`  • Toplam İhlal: ${report.conflicts.total}`);
      console.log(
        `  • Öğretmen Çakışması: ${report.conflicts.teacherConflicts.length}`
      );
      console.log(
        `  • Oda Çakışması: ${report.conflicts.roomConflicts.length}`
      );
      console.log(`  • Toplam Ceza Puanı: ${report.conflicts.penaltyScore}`);
    }

    if (report.recommendations.length > 0) {
      console.log("\n💡 ÖNERİLER:");
      report.recommendations.forEach((rec, i) => {
        console.log(
          `  ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`
        );
      });
    }

    console.log("\n" + "=".repeat(60) + "\n");
  }

  /**
   * HTML raporu oluştur
   */
  generateHTMLReport(report) {
    // TODO: HTML rapor şablonu güncellenmeli
    return `<div class="analysis-report">
        <h1>Ders Dağıtım Analizi</h1>
        <h2>Genel Skor: ${report.quality.overall.toFixed(2)}/100</h2>
        <p>Toplam Ceza Puanı: ${report.conflicts.penaltyScore.toFixed(2)}</p>
        </div>`;
  }
}

// Export
if (typeof window !== "undefined") {
  window.DistributionAnalyzer = DistributionAnalyzer;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DistributionAnalyzer;
}

console.log("✅ DistributionAnalyzer yüklendi (V2.0 - Algoritma Uyumlu)");
