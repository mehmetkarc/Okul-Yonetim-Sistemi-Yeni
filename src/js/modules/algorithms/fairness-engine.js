/**
 * ============================================
 * FAIRNESS ENGINE - Yük Dengesi Motoru
 * ============================================
 * Öğretmen ve sınıf yüklerini, günlük dağılımı ve boşlukları dengeler.
 * Temel prensip: Çözümü sürekli küçük optimizasyonlarla iyileştirmek.
 *
 * Özellikler:
 * - Teacher workload balancing (Öğretmen haftalık yük dengeleme)
 * - Daily distribution fairness (Günlük ders saati dağılımı dengeleme)
 * - Gap minimization (Öğrenci/öğretmen ders aralarındaki boşlukları en aza indirme)
 * - Preference satisfaction (Öğretmen tercih (müsaitlik) uyumunu sağlama)
 * - Load variance reduction (Yük varyansını/standart sapmayı düşürme)
 * - Analysis & Reporting (Detaylı analiz ve raporlama)
 */

class FairnessEngine {
  /**
   * Yapılandırıcı (Constructor)
   * @param {object} config - Yapılandırma ayarları
   */
  constructor(config = {}) {
    this.config = {
      // Hedeflenen günlük ders yükü varyansı (standart sapma)
      targetDailyVariance: 1.5,
      // Hedeflenen haftalık toplam yük varyansı (standart sapma)
      targetWeeklyVariance: 2.0,
      maxDailyLoad: 8, // Maksimum günlük ders saati
      minDailyLoad: 1, // Minimum günlük ders saati
      preferMorning: true, // Sabah derslerini tercih etme (ileride kullanılabilir)
      ...config,
    };

    this.metrics = {
      // Haftalık toplam ders yükü standart sapması (Öğretmen)
      teacherVariance: 0,
      // Haftalık toplam ders yükü standart sapması (Sınıf)
      classVariance: 0,
      gapCount: 0, // Toplam boşluk sayısı
      preferenceScore: 0, // Tercih uyum yüzdesi
    };

    console.log("⚖️ FairnessEngine başlatıldı");
  }

  // ============================================
  // ANA DENGELEME FONKSİYONU
  // ============================================

  /**
   * Verilen ders programı çözümünü (solution) iyileştirmek için dengeleme adımlarını uygular.
   * @param {object} solution - Mevcut ders programı (çözüm)
   * @param {object} data - Yardımcı veriler (Henüz tam kullanılmıyor)
   * @returns {object} - İyileştirilmiş çözüm ve sonuç metrikleri
   */
  balance(solution, data) {
    console.log("\n⚖️ FAIRNESS BALANCING BAŞLADI");
    console.log("=".repeat(50));

    const startTime = Date.now();
    let balanced = this.deepCopy(solution);
    let improvements = 0;

    // 1. Öğretmenlerin haftalık toplam yüklerini dengele
    console.log("👨‍🏫 Teacher load balancing...");
    const teacherResult = this.balanceTeacherLoads(balanced, data);
    if (teacherResult.improved) {
      balanced = teacherResult.solution;
      improvements++;
    }

    // 2. Günlük ders saati dağılımını dengele (Sınıf bazında)
    console.log("📅 Daily distribution balancing...");
    const dailyResult = this.balanceDailyDistribution(balanced, data);
    if (dailyResult.improved) {
      balanced = dailyResult.solution;
      improvements++;
    }

    // 3. Ders aralarındaki boşlukları en aza indir (Sınıf bazında)
    console.log("🕳️ Gap minimization...");
    const gapResult = this.minimizeGaps(balanced, data);
    if (gapResult.improved) {
      balanced = gapResult.solution;
      improvements++;
    }

    // 4. Öğretmen tercihlerine göre optimizasyon yap
    console.log("⭐ Preference optimization...");
    const prefResult = this.optimizePreferences(balanced, data);
    if (prefResult.improved) {
      balanced = prefResult.solution;
      improvements++;
    }

    // Nihai metrikleri hesapla
    this.calculateMetrics(balanced);

    const duration = Date.now() - startTime;

    console.log("\n📊 SONUÇLAR:");
    console.log(`  • İyileştirme Adımları: ${improvements}/4`);
    console.log(
      `  • Öğretmen Yük Std. Sapması: ${this.metrics.teacherVariance.toFixed(
        2
      )}`
    );
    console.log(
      `  • Sınıf Yük Std. Sapması: ${this.metrics.classVariance.toFixed(2)}`
    );
    console.log(`  • Toplam Boşluk Sayısı: ${this.metrics.gapCount}`);
    console.log(
      `  • Tercih Uyumu Skoru: ${this.metrics.preferenceScore.toFixed(1)}%`
    );
    console.log(`  • Süre: ${duration}ms`);
    console.log("=".repeat(50) + "\n");

    // Detaylı Analizi Yazdır
    this.printAnalysis(balanced);

    return {
      solution: balanced,
      improvements,
      metrics: this.metrics,
      duration,
    };
  }

  // ============================================
  // TEACHER LOAD BALANCING (Öğretmen Yük Dengeleme)
  // ============================================

  /**
   * Öğretmenlerin haftalık toplam ders yüklerini dengelemeye çalışır.
   * En yüklü öğretmenden ders alıp, yerini değiştirmeye odaklanır.
   * @param {object} solution - Ders programı
   * @param {object} data - Veri
   * @returns {object} - Sonuç
   */
  balanceTeacherLoads(solution, data) {
    const improved = this.deepCopy(solution);
    let changesMade = 0;

    const maxIterations = 20;

    for (let iter = 0; iter < maxIterations; iter++) {
      const teacherLoads = this.calculateTeacherLoads(improved);
      // Yükleri sırala (Çoktan aza)
      const sortedTeachers = [...teacherLoads.entries()].sort(
        (a, b) => b[1].total - a[1].total
      );

      if (sortedTeachers.length < 2) break;

      const [maxTeacher, maxLoad] = sortedTeachers[0];
      const [minTeacher, minLoad] = sortedTeachers[sortedTeachers.length - 1];

      const diff = maxLoad.total - minLoad.total;

      // Yük farkı kabul edilebilir seviyeye gelirse dur
      if (diff <= 2) break;

      // En yüklü öğretmenden bir ders bul
      let moved = false;

      // En yüklü öğretmenin bir dersini bulup, başka bir slota taşımayı dene
      for (const classId in improved) {
        for (const day in improved[classId]) {
          for (const time in improved[classId][day]) {
            const lesson = improved[classId][day][time];

            if (lesson && lesson.teacherId === maxTeacher) {
              // Bu dersi farklı bir slota (aynı sınıfta) taşımayı dene
              for (let newDay = 1; newDay <= 5; newDay++) {
                // Öğretmenin diğer dersleriyle çakışmayacak bir saat bul
                for (let newTime = 1; newTime <= 8; newTime++) {
                  // Hedef slot boş olmalı
                  if (!improved[classId][newDay]?.[newTime]) {
                    // Öğretmen yeni slotta başka bir sınıfla meşgul olmamalı
                    if (
                      !this.isTeacherBusy(improved, maxTeacher, newDay, newTime)
                    ) {
                      // Taşıma işlemini yap
                      delete improved[classId][day][time];
                      // Hedef slotu kontrol et ve gerekirse oluştur (Eğer deepCopy sınıf/gün yapısını korumadıysa)
                      if (!improved[classId][newDay])
                        improved[classId][newDay] = {};
                      improved[classId][newDay][newTime] = lesson;

                      changesMade++;
                      moved = true;
                      break;
                    }
                  }
                }
                if (moved) break;
              }
            }
            if (moved) break;
          }
          if (moved) break;
        }
        if (moved) break;
      }

      if (!moved) break; // İyileştirme yapılamıyorsa döngüyü kır
    }

    console.log(`  ✅ ${changesMade} değişiklik yapıldı`);

    return {
      solution: improved,
      improved: changesMade > 0,
      changes: changesMade,
    };
  }

  /**
   * Mevcut çözümdeki tüm öğretmenlerin haftalık ve günlük ders yüklerini hesaplar.
   * @param {object} solution - Ders programı
   * @returns {Map<string, {daily: object, total: number}>} - Öğretmen yükleri haritası
   */
  calculateTeacherLoads(solution) {
    const loads = new Map();

    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];

          if (lesson && lesson.teacherId) {
            if (!loads.has(lesson.teacherId)) {
              loads.set(lesson.teacherId, {
                // Günlük ders sayıları (1'den 5'e kadar günler)
                daily: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                total: 0,
              });
            }

            const load = loads.get(lesson.teacherId);
            // day anahtarının geçerli olduğundan emin ol
            if (load.daily[day] !== undefined) {
              load.daily[day]++;
            }
            load.total++;
          }
        }
      }
    }

    return loads;
  }
  // ============================================
  // DAILY DISTRIBUTION BALANCING (Günlük Dağılım Dengeleme)
  // ============================================

  /**
   * Sınıf bazında günlük ders saati dağılımındaki varyansı azaltır.
   * Çok ders olan günden (maxDay) az ders olan güne (minDay) ders taşımaya çalışır.
   * @param {object} solution - Ders programı
   * @param {object} data - Veri
   * @returns {object} - Sonuç
   */
  balanceDailyDistribution(solution, data) {
    const improved = this.deepCopy(solution);
    let changesMade = 0;

    // Her sınıfın günlük derslerini dengele
    for (const classId in improved) {
      const dailyCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      // Günlük ders sayısını hesapla
      for (const day in improved[classId]) {
        dailyCounts[day] = Object.keys(improved[classId][day]).length;
      }

      // Günlük ders sayılarının standart sapmasını hesapla
      const values = Object.values(dailyCounts);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      // Standart sapma hesaplaması
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
      );

      // Standart sapma hedeften büyükse dengele
      if (stdDev > this.config.targetDailyVariance) {
        // En çok ders olan gün
        const maxDay = Object.keys(dailyCounts).find(
          (d) => dailyCounts[d] === Math.max(...values)
        );
        // En az ders olan gün
        const minDay = Object.keys(dailyCounts).find(
          (d) => dailyCounts[d] === Math.min(...values)
        );

        // maxDay'den minDay'e ders taşımayı dene
        // maxDay'deki dersleri saat sırasına göre kontrol et
        for (const time in improved[classId][maxDay]) {
          const lesson = improved[classId][maxDay][time];

          // minDay'de boş bir yer ara
          for (let newTime = 1; newTime <= 8; newTime++) {
            if (!improved[classId][minDay]?.[newTime]) {
              // Öğretmen minDay'de newTime slotunda başka bir sınıfla meşgul olmamalı
              if (
                !this.isTeacherBusy(improved, lesson.teacherId, minDay, newTime)
              ) {
                // Taşıma işlemini yap
                delete improved[classId][maxDay][time];
                improved[classId][minDay][newTime] = lesson;

                changesMade++;
                break; // Bir taşıma yeter
              }
            }
          }

          if (changesMade > 0) break; // Bir taşıma yapıldıysa diğer derslere geçme
        }
      }
    }

    console.log(`  ✅ ${changesMade} değişiklik yapıldı`);

    return {
      solution: improved,
      improved: changesMade > 0,
      changes: changesMade,
    };
  }

  // ============================================
  // GAP MINIMIZATION (Boşlukları En Aza İndirme)
  // ============================================

  /**
   * Sınıf ve öğretmen programlarında ders aralarındaki boşlukları kapatmaya çalışır.
   * Örneğin: [Ders] - [BOŞLUK] - [Ders] -> [Ders] - [Ders] - [BOŞ]
   * @param {object} solution - Ders programı
   * @param {object} data - Veri
   * @returns {object} - Sonuç
   */
  minimizeGaps(solution, data) {
    const improved = this.deepCopy(solution);
    let gapsReduced = 0;

    for (const classId in improved) {
      for (const day in improved[classId]) {
        const slots = improved[classId][day];
        // O güne ait dolu saatleri sırala
        const times = Object.keys(slots)
          .map(Number)
          .sort((a, b) => a - b);

        // Boşlukları kapatmaya çalış (Sadece 1 boşluk olanları)
        for (let i = 0; i < times.length - 1; i++) {
          const sourceTime = times[i + 1]; // Boşluğun arkasındaki dersin saati
          const targetTime = times[i] + 1; // Boşluğun kapatılacağı saat

          const gap = sourceTime - targetTime; // Boşluk sayısı (0 ise boşluk yok)

          if (gap >= 1) {
            // 1 veya daha fazla boşluk varsa
            const lesson = improved[classId][day][sourceTime];

            // Öğretmenin yeni hedef saatte (targetTime) başka bir sınıfla meşgul olup olmadığını kontrol et
            if (
              !this.isTeacherBusy(improved, lesson.teacherId, day, targetTime)
            ) {
              // Taşıma işlemi: Arkadaki dersi öne al
              delete improved[classId][day][sourceTime];
              improved[classId][day][targetTime] = lesson;

              gapsReduced++;
              break; // Bir taşıma yapıldı, sonraki gün/sınıf döngüsüne geç
            }
          }
        }
      }
    }

    console.log(`  ✅ ${gapsReduced} boşluk azaltıldı`);

    return {
      solution: improved,
      improved: gapsReduced > 0,
      gapsReduced,
    };
  }

  // ============================================
  // PREFERENCE OPTIMIZATION (Tercih Optimizasyonu)
  // ============================================

  /**
   * Öğretmen tercihlerine uymayan dersleri, uyumlu bir slota taşımaya çalışır.
   * `window.PreferenceManager` objesinin varlığını varsayar.
   * @param {object} solution - Ders programı
   * @param {object} data - Veri
   * @returns {object} - Sonuç
   */
  optimizePreferences(solution, data) {
    const improved = this.deepCopy(solution);
    let optimizations = 0;

    // PreferenceManager'ın globalde tanımlı olduğunu varsayıyoruz.
    if (
      !window.PreferenceManager ||
      typeof window.PreferenceManager.saatMusaitMi !== "function"
    ) {
      console.log(
        "  ⚠️ PreferenceManager bulunamadı veya saatMusaitMi metodu eksik."
      );
      return { solution: improved, improved: false };
    }

    // Tercih ihlallerini bul
    for (const classId in improved) {
      for (const day in improved[classId]) {
        for (const time in improved[classId][day]) {
          const lesson = improved[classId][day][time];

          // O anki slot öğretmen tercihi için uygun değilse
          if (
            !window.PreferenceManager.saatMusaitMi(day, time, lesson.teacherId)
          ) {
            // Alternatif, uygun ve boş bir slot bul
            for (let newDay = 1; newDay <= 5; newDay++) {
              for (let newTime = 1; newTime <= 8; newTime++) {
                // Yeni slotun öğretmenin tercihlerine uygun olup olmadığını kontrol et
                if (
                  window.PreferenceManager.saatMusaitMi(
                    newDay,
                    newTime,
                    lesson.teacherId
                  )
                ) {
                  // Yeni slotun hedef sınıfta boş olup olmadığını kontrol et
                  if (!improved[classId][newDay]?.[newTime]) {
                    // Yeni slotta öğretmenin başka bir sınıfla meşgul olup olmadığını kontrol et
                    if (
                      !this.isTeacherBusy(
                        improved,
                        lesson.teacherId,
                        newDay,
                        newTime
                      )
                    ) {
                      // Taşıma işlemini yap
                      delete improved[classId][day][time];
                      improved[classId][newDay][newTime] = lesson;

                      optimizations++;
                      // Taşıma yapıldı, dış döngüleri kır
                      newTime = 9;
                      newDay = 6;
                      break;
                    }
                  }
                }
              }
              if (optimizations > 0) break;
            }
          }
          if (optimizations > 0) break;
        }
        if (optimizations > 0) break;
      }
      if (optimizations > 0) break;
    }

    console.log(`  ✅ ${optimizations} tercih optimizasyonu`);

    return {
      solution: improved,
      improved: optimizations > 0,
      optimizations,
    };
  }

  // ============================================
  // METRİK HESAPLAMA
  // ============================================

  /**
   * Ders programının temel denge metriklerini hesaplar ve `this.metrics`'i günceller.
   * Standart Sapma (Standard Deviation) kullanılmıştır.
   * @param {object} solution - Ders programı
   */
  calculateMetrics(solution) {
    // 1. Öğretmen Haftalık Yük Std. Sapması (Teacher Variance)
    const teacherLoads = this.calculateTeacherLoads(solution);
    const teacherTotals = [...teacherLoads.values()].map((l) => l.total);

    if (teacherTotals.length > 0) {
      const avg =
        teacherTotals.reduce((a, b) => a + b, 0) / teacherTotals.length;
      // Standart Sapma (Karekök(Varyans))
      this.metrics.teacherVariance = Math.sqrt(
        teacherTotals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
          teacherTotals.length
      );
    } else {
      this.metrics.teacherVariance = 0;
    }

    // 2. Sınıf Haftalık Yük Std. Sapması (Class Variance)
    const classTotals = [];
    for (const classId in solution) {
      let total = 0;
      for (const day in solution[classId]) {
        total += Object.keys(solution[classId][day]).length;
      }
      classTotals.push(total);
    }

    if (classTotals.length > 0) {
      const avg = classTotals.reduce((a, b) => a + b, 0) / classTotals.length;
      // Standart Sapma
      this.metrics.classVariance = Math.sqrt(
        classTotals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
          classTotals.length
      );
    } else {
      this.metrics.classVariance = 0;
    }

    // 3. Toplam Boşluk Sayısı (Gap count)
    this.metrics.gapCount = 0;
    for (const classId in solution) {
      for (const day in solution[classId]) {
        const times = Object.keys(solution[classId][day])
          .map(Number)
          .sort((a, b) => a - b);
        for (let i = 0; i < times.length - 1; i++) {
          // İki ders arasındaki boş saat sayısı
          this.metrics.gapCount += times[i + 1] - times[i] - 1;
        }
      }
    }

    // 4. Tercih Uyumu Skoru (Preference score)
    let matched = 0;
    let total = 0;

    if (
      window.PreferenceManager &&
      typeof window.PreferenceManager.saatMusaitMi === "function"
    ) {
      for (const classId in solution) {
        for (const day in solution[classId]) {
          for (const time in solution[classId][day]) {
            const lesson = solution[classId][day][time];
            total++;

            if (
              window.PreferenceManager.saatMusaitMi(day, time, lesson.teacherId)
            ) {
              matched++;
            }
          }
        }
      }
    }

    this.metrics.preferenceScore = total > 0 ? (matched / total) * 100 : 0;
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  /**
   * Belirtilen gün ve saatte öğretmenin başka bir sınıfla meşgul olup olmadığını kontrol eder.
   * @param {object} solution - Ders programı
   * @param {string} teacherId - Öğretmen ID'si
   * @param {string|number} day - Gün (1-5)
   * @param {string|number} time - Saat (1-8)
   * @returns {boolean} - Meşgulse true
   */
  isTeacherBusy(solution, teacherId, day, time) {
    // Tüm sınıfları kontrol et
    for (const classId in solution) {
      // Eğer belirtilen gün ve saatte o sınıfta ders varsa VE dersin öğretmeni kontrol edilen öğretmen ise
      if (solution[classId][day]?.[time]?.teacherId === teacherId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Derin kopya oluşturur (Deep copy).
   * @param {object} obj - Kopyalanacak nesne
   * @returns {object} - Yeni nesne
   */
  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ============================================
  // ANALİZ VE RAPORLAMA
  // ============================================

  /**
   * Mevcut çözümün denge durumunu detaylı olarak analiz eder.
   * @param {object} solution - Ders programı
   * @returns {object} - Detaylı analiz raporu
   */
  analyzeBalance(solution) {
    // Metrikleri güncelle
    this.calculateMetrics(solution);

    const analysis = {
      teachers: [],
      classes: [],
      overall: {
        teacherBalance: "unknown",
        classBalance: "unknown",
        gapSeverity: "unknown",
        preferenceCompliance: "unknown",
      },
    };

    // 1. Öğretmen Analizi (Günlük yük standart sapması)
    const teacherLoads = this.calculateTeacherLoads(solution);

    for (const [teacherId, load] of teacherLoads.entries()) {
      const dailyValues = Object.values(load.daily);
      const avg = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
      // Günlük yük standart sapması (Öğretmenin günleri arasındaki dengesi)
      const variance = Math.sqrt(
        dailyValues.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
          dailyValues.length
      );

      analysis.teachers.push({
        teacherId,
        total: load.total,
        daily: load.daily,
        variance: variance.toFixed(2),
        // Standart Sapmaya göre denge durumu
        balance:
          variance < 1.0
            ? "excellent"
            : variance < 2.0
            ? "good"
            : variance < 3.0
            ? "fair"
            : "poor",
      });
    }

    // 2. Sınıf Analizi (Günlük yük standart sapması ve boşluklar)
    for (const classId in solution) {
      const dailyCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let gaps = 0;

      for (const day in solution[classId]) {
        dailyCounts[day] = Object.keys(solution[classId][day]).length;

        const times = Object.keys(solution[classId][day])
          .map(Number)
          .sort((a, b) => a - b);
        // Günlük boşluk sayısı
        for (let i = 0; i < times.length - 1; i++) {
          gaps += times[i + 1] - times[i] - 1;
        }
      }

      const values = Object.values(dailyCounts);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      // Günlük yük standart sapması (Sınıfın günleri arasındaki dengesi)
      const variance = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
      );

      analysis.classes.push({
        classId,
        daily: dailyCounts,
        gaps,
        variance: variance.toFixed(2),
        // Standart Sapmaya göre denge durumu
        balance:
          variance < 1.0
            ? "excellent"
            : variance < 2.0
            ? "good"
            : variance < 3.0
            ? "fair"
            : "poor",
      });
    }

    // 3. Genel Değerlendirme
    const avgTeacherVariance =
      analysis.teachers.length > 0
        ? analysis.teachers.reduce(
            (sum, t) => sum + parseFloat(t.variance),
            0
          ) / analysis.teachers.length
        : 0;

    const avgClassVariance =
      analysis.classes.length > 0
        ? analysis.classes.reduce((sum, c) => sum + parseFloat(c.variance), 0) /
          analysis.classes.length
        : 0;

    const totalGaps = analysis.classes.reduce((sum, c) => sum + c.gaps, 0);

    analysis.overall.teacherBalance =
      this.metrics.teacherVariance < this.config.targetWeeklyVariance
        ? "excellent"
        : this.metrics.teacherVariance < this.config.targetWeeklyVariance * 1.5
        ? "good"
        : "needs improvement";

    analysis.overall.classBalance =
      this.metrics.classVariance < this.config.targetDailyVariance
        ? "excellent"
        : this.metrics.classVariance < this.config.targetDailyVariance * 1.5
        ? "good"
        : "needs improvement";

    analysis.overall.gapSeverity =
      totalGaps < 10 ? "minimal" : totalGaps < 30 ? "moderate" : "high";

    analysis.overall.preferenceCompliance =
      this.metrics.preferenceScore > 85
        ? "high"
        : this.metrics.preferenceScore > 70
        ? "medium"
        : "low";

    return analysis;
  }

  /**
   * Detaylı analiz raporunu konsola yazdırır.
   * @param {object} solution - Ders programı
   */
  printAnalysis(solution) {
    const analysis = this.analyzeBalance(solution);

    console.log("\n📈 FAIRNESS ANALYSIS (Denge Analizi)");
    console.log("=".repeat(50));

    // Analizi görselleştirmeye yardımcı olabilecek bir çizelge (örneğin bir ısı haritası) faydalı olacaktır.
    //

    console.log("\n📊 Genel Değerlendirme:");
    console.log(
      `  • Öğretmen Yük Dengesi: ${
        analysis.overall.teacherBalance
      } (Std. Sapma: ${this.metrics.teacherVariance.toFixed(2)})`
    );
    console.log(
      `  • Sınıf Günlük Dengesi: ${
        analysis.overall.classBalance
      } (Std. Sapma: ${this.metrics.classVariance.toFixed(2)})`
    );
    console.log(
      `  • Boşluk Durumu: ${analysis.overall.gapSeverity} (Toplam: ${this.metrics.gapCount})`
    );
    console.log(
      `  • Tercih Uyumu: ${
        analysis.overall.preferenceCompliance
      } (Skor: ${this.metrics.preferenceScore.toFixed(1)}%)`
    );

    console.log("\n👨‍🏫 Öğretmen Günlük Dağılım Detayları (İlk 5):");
    analysis.teachers.slice(0, 5).forEach((t) => {
      console.log(
        `  • Teacher ${t.teacherId} (Total: ${t.total}): Günlük Std. Sapma ${t.variance} (${t.balance})`
      );
    });
    if (analysis.teachers.length > 5) console.log("  ...ve diğerleri");

    console.log("\n🏫 Sınıf Günlük Dağılım Detayları (İlk 5):");
    analysis.classes.slice(0, 5).forEach((c) => {
      console.log(
        `  • Class ${c.classId}: ${c.gaps} boşluk, Günlük Std. Sapma ${c.variance} (${c.balance})`
      );
    });
    if (analysis.classes.length > 5) console.log("  ...ve diğerleri");

    console.log("=".repeat(50) + "\n");
  }
}

// Global export
if (typeof window !== "undefined") {
  window.FairnessEngine = FairnessEngine;
  console.log("✅ FairnessEngine yüklendi");
}

// 🌍 Global erişim
window.FairnessEngine = FairnessEngine;
console.log("📦 FairnessEngine global erişim aktif!");
