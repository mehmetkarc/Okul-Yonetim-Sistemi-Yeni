/**
 * ============================================
 * STATISTICS MANAGER V3.0
 * ============================================
 * Detaylı program istatistikleri, analiz ve kalite metrikleri.
 * ProgramData, classId bazlı objeler içerir: {classId: {day: {time: lessonObject}}}
 */

class StatisticsManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10000; // 10 saniye cache süresi (10000 ms)
    this.TOTAL_DAYS = 5;
    this.TOTAL_HOURS_PER_DAY = 8;
  }

  // ============================================
  // YARDIMCI METOTLAR
  // ============================================

  /**
   * Program verisini (programData) standart bir ders listesine dönüştürür
   * ve genel istatistikler için gerekli yük verilerini toplar.
   */
  getLessonsFromProgramData(programData) {
    const lessons = [];
    const teacherLessons = {}; // {teacherId: {total: 0, daily: {1: [saatler], ...}}}
    const classLessons = {}; // {classId: {total: 0, daily: {1: [saatler], ...}}}
    const teacherWorkDays = new Set(); // Öğretmenlerin çalıştığı günleri takip eder

    for (const classId in programData) {
      for (const gun in programData[classId]) {
        for (const saat in programData[classId][gun]) {
          const ders = programData[classId][gun][saat];

          // Dersi olan (atama yapılmış) slotları filtrele
          if (!ders || !ders.ders_id || !ders.ogretmen_id) continue;

          lessons.push(ders);

          const teacherId = ders.ogretmen_id;
          const currentDay = parseInt(gun);
          const currentTime = parseInt(saat);

          // Öğretmen Yükü
          if (!teacherLessons[teacherId]) {
            teacherLessons[teacherId] = {
              total: 0,
              daily: { 1: [], 2: [], 3: [], 4: [], 5: [] },
            };
          }
          teacherLessons[teacherId].total++;
          teacherLessons[teacherId].daily[currentDay].push(currentTime);
          teacherWorkDays.add(`${teacherId}_${currentDay}`);

          // Sınıf Yükü
          if (!classLessons[classId]) {
            classLessons[classId] = {
              total: 0,
              daily: { 1: [], 2: [], 3: [], 4: [], 5: [] },
            };
          }
          classLessons[classId].total++;
          classLessons[classId].daily[currentDay].push(currentTime);
        }
      }
    }

    return { lessons, teacherLessons, classLessons, teacherWorkDays };
  }

  // ============================================
  // GENEL İSTATİSTİKLER
  // ============================================

  getOverallStats(programData) {
    const cacheKey = "overall";
    const cached = this.cache.get(cacheKey);

    // Basitleştirilmiş cache kontrolü
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const { lessons, teacherLessons, classLessons, teacherWorkDays } =
      this.getLessonsFromProgramData(programData);

    const stats = {
      // Temel
      totalLessons: lessons.length,
      totalClasses: Object.keys(classLessons).length,
      totalTeachers: Object.keys(teacherLessons).length,
      totalPossibleSlots:
        this.TOTAL_DAYS * this.TOTAL_HOURS_PER_DAY * stats.totalClasses, // Programdaki tüm boş/dolu slot sayısı
      fillRate: 0,

      // Öğretmen
      avgTeacherLoad: 0,
      teacherLoads: [],
      maxTeacherLoad: 0,
      minTeacherLoad: 0,
      totalGapsPerTeacher: 0,
      avgGapsPerTeacher: 0,
      teacherWorkDaysCount: teacherWorkDays.size,

      // Sınıf
      avgClassLoad: 0,
      classLoads: [],
      totalGapsPerClass: 0,
      avgGapsPerClass: 0,

      // Kalite Skorları (0-100)
      balanceScore: 0, // Öğretmen yük dengelemesi
      gapScore: 0, // Boşluk (ders araları) cezası
      qualityScore: 0, // Genel kalite skoru
    };

    // ------------------------------------------
    // 1. Öğretmen İstatistikleri
    // ------------------------------------------

    for (const teacherId in teacherLessons) {
      const t = teacherLessons[teacherId];
      stats.teacherLoads.push(t.total);

      // Boşluklar
      stats.totalGapsPerTeacher += this.calculateGaps(t.daily);
    }

    // Yük Hesaplamaları
    const tCount = stats.totalTeachers || 1;
    stats.avgTeacherLoad = (
      stats.teacherLoads.reduce((a, b) => a + b, 0) / tCount
    ).toFixed(1);
    stats.maxTeacherLoad = Math.max(...stats.teacherLoads, 0);
    stats.minTeacherLoad =
      stats.teacherLoads.length > 0 ? Math.min(...stats.teacherLoads) : 0;

    // Boşluk Ortalaması
    stats.avgGapsPerTeacher = (stats.totalGapsPerTeacher / tCount).toFixed(1);

    // ------------------------------------------
    // 2. Sınıf İstatistikleri
    // ------------------------------------------

    for (const classId in classLessons) {
      const c = classLessons[classId];
      stats.classLoads.push(c.total);

      // Boşluklar
      stats.totalGapsPerClass += this.calculateGaps(c.daily);
    }

    const cCount = stats.totalClasses || 1;
    stats.avgClassLoad = (
      stats.classLoads.reduce((a, b) => a + b, 0) / cCount
    ).toFixed(1);
    stats.avgGapsPerClass = (stats.totalGapsPerClass / cCount).toFixed(1);

    // ------------------------------------------
    // 3. Genel ve Kalite Skorları
    // ------------------------------------------

    // Doluluk Oranı
    stats.fillRate = (
      (stats.totalLessons / stats.totalPossibleSlots) *
      100
    ).toFixed(1);

    // Denge Skoru (Öğretmen yük dengelemesi)
    stats.balanceScore = this.calculateBalanceScore(stats.teacherLoads);

    // Boşluk Skoru (Ortalama öğretmen boşluğuna göre ceza)
    // Her 1 boşluk için 10 puan ceza, max 100 puan. (0 boşluk = 100)
    stats.gapScore = Math.max(
      0,
      100 - parseFloat(stats.avgGapsPerTeacher) * 10
    ).toFixed(1);

    // Genel Kalite Skoru (Ağırlıklı Ortalama)
    // Denge (%40), Boşluk (%40), Doluluk (%20)
    stats.qualityScore = (
      parseFloat(stats.balanceScore) * 0.4 +
      parseFloat(stats.gapScore) * 0.4 +
      parseFloat(stats.fillRate) * 0.2
    ).toFixed(1);

    // Cache'e kaydet
    this.cache.set(cacheKey, {
      data: stats,
      timestamp: Date.now(),
    });

    return stats;
  }

  // ============================================
  // ÖĞRETMEN DETAY İSTATİSTİKLERİ
  // ============================================

  getTeacherStats(programData, teacherId) {
    const stats = {
      teacherId: teacherId,
      teacherName: "",
      totalLessons: 0,
      dailyDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      hourlyDistribution: {},
      gaps: 0,
      maxDailyLoad: 0,
      minDailyLoad: this.TOTAL_HOURS_PER_DAY,
      avgDailyLoad: 0,
      totalClasses: 0,
      totalSubjects: 0,
      workingDays: 0,
      loadBalanceScore: 0, // Günlük yük dengesi
    };

    const dailyLessons = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const classes = new Set();
    const subjects = new Set();
    const dailyLoads = [];

    // Sadece ilgili öğretmenin derslerini topla
    for (const classId in programData) {
      for (const gun in programData[classId]) {
        for (const saat in programData[classId][gun]) {
          const ders = programData[classId][gun][saat];

          if (ders && ders.ogretmen_id == teacherId) {
            stats.totalLessons++;
            const currentDay = parseInt(gun);
            const currentTime = parseInt(saat);

            stats.dailyDistribution[gun]++;

            stats.hourlyDistribution[saat] =
              (stats.hourlyDistribution[saat] || 0) + 1;

            dailyLessons[gun].push(currentTime);

            if (ders.sinif_id) classes.add(ders.sinif_id);
            if (ders.ders_id) subjects.add(ders.ders_id);
            if (ders.ogretmen_adi) stats.teacherName = ders.ogretmen_adi;
          }
        }
      }
    }

    // Günlük yük hesapla
    let totalWorkingDays = 0;
    for (const gun in stats.dailyDistribution) {
      const load = stats.dailyDistribution[gun];
      if (load > 0) {
        totalWorkingDays++;
        dailyLoads.push(load);
        stats.maxDailyLoad = Math.max(stats.maxDailyLoad, load);
        stats.minDailyLoad = Math.min(stats.minDailyLoad, load);
      }
    }

    stats.workingDays = totalWorkingDays;
    stats.avgDailyLoad = (stats.totalLessons / stats.workingDays).toFixed(1);

    // Boşlukları hesapla
    stats.gaps = this.calculateGaps(dailyLessons);
    stats.totalClasses = classes.size;
    stats.totalSubjects = subjects.size;

    if (stats.minDailyLoad === this.TOTAL_HOURS_PER_DAY) stats.minDailyLoad = 0;

    // Günlük Yük Denge Skoru (Günler arası denge)
    stats.loadBalanceScore = this.calculateBalanceScore(dailyLoads);

    return stats;
  }

  // ============================================
  // SINIF DETAY İSTATİSTİKLERİ
  // ============================================

  getClassStats(programData, classId) {
    // Sınıf İstatistikleri mantığı teacher stats'a benzer, sadece classId'ye odaklanır.
    // Orijinal kod yeterince sağlam. Öğretmen istatistiklerindeki mantıkla aynıdır.

    const stats = {
      classId: classId,
      className: "",
      totalLessons: 0,
      dailyDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      hourlyDistribution: {},
      gaps: 0,
      maxDailyLoad: 0,
      minDailyLoad: this.TOTAL_HOURS_PER_DAY,
      avgDailyLoad: 0,
      totalTeachers: 0,
      totalSubjects: 0,
      loadBalanceScore: 0, // Günlük yük dengesi
    };

    const dailyLessons = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const teachers = new Set();
    const subjects = new Set();
    const dailyLoads = [];

    // Veri topla (Sadece ilgili sınıf için)
    const classProgram = programData[classId] || {};

    for (const gun in classProgram) {
      for (const saat in classProgram[gun]) {
        const ders = classProgram[gun][saat];

        if (ders && ders.ders_id) {
          // Ders var
          stats.totalLessons++;
          const currentDay = parseInt(gun);
          const currentTime = parseInt(saat);

          stats.dailyDistribution[gun]++;

          stats.hourlyDistribution[saat] =
            (stats.hourlyDistribution[saat] || 0) + 1;

          dailyLessons[gun].push(currentTime);

          if (ders.ogretmen_id) teachers.add(ders.ogretmen_id);
          if (ders.ders_id) subjects.add(ders.ders_id);
          if (ders.sinif_kodu) stats.className = ders.sinif_kodu;
        }
      }
    }

    // Günlük yük hesapla
    let totalWorkingDays = 0;
    for (const gun in stats.dailyDistribution) {
      const load = stats.dailyDistribution[gun];
      if (load > 0) {
        totalWorkingDays++;
        dailyLoads.push(load);
        stats.maxDailyLoad = Math.max(stats.maxDailyLoad, load);
        stats.minDailyLoad = Math.min(stats.minDailyLoad, load);
      }
    }

    // Ortalamalar
    stats.avgDailyLoad = (stats.totalLessons / totalWorkingDays).toFixed(1);
    stats.gaps = this.calculateGaps(dailyLessons);

    // Set'leri sayıya çevir
    stats.totalTeachers = teachers.size;
    stats.totalSubjects = subjects.size;

    if (stats.minDailyLoad === this.TOTAL_HOURS_PER_DAY) stats.minDailyLoad = 0;

    // Günlük Yük Denge Skoru (Günler arası denge)
    stats.loadBalanceScore = this.calculateBalanceScore(dailyLoads);

    return stats;
  }

  // ============================================
  // KALİTE HESAPLAMA METOTLARI
  // ============================================

  /**
   * Günlük ders aralarındaki boşluk sayısını hesaplar. (Örn: 1. saat ders, 3. saat ders = 1 boşluk)
   * @param {Object} dailyLessons - {1: [saatler], 2: [saatler], ...}
   * @returns {number} Toplam boşluk sayısı
   */
  calculateGaps(dailyLessons) {
    let totalGaps = 0;

    for (const gun in dailyLessons) {
      // Saatleri küçükten büyüğe sırala
      const times = dailyLessons[gun].sort((a, b) => a - b);

      if (times.length < 2) continue; // 1 veya 0 ders varsa boşluk olmaz

      // İlk ders ile son ders arasındaki saatleri say, dolu saatleri çıkar.
      const firstHour = times[0];
      const lastHour = times[times.length - 1];

      // Toplam geçen saat (dahil) = lastHour - firstHour + 1
      const slots = lastHour - firstHour + 1;

      // Boşluk = Toplam Saat - Ders Sayısı
      const gap = slots - times.length;

      totalGaps += gap;
    }

    return totalGaps;
  }

  /**
   * Yüklerin (ders sayısı) ne kadar dengeli olduğunu hesaplar (0-100).
   * Standart sapma yerine ortalamadan sapma kullanılarak daha basit bir ceza puanı verilir.
   * @param {Array<number>} loads - Öğretmenlerin veya günlerin ders yükleri
   * @returns {string} Denge skoru (0-100)
   */
  calculateBalanceScore(loads) {
    if (loads.length === 0) return "100.0";

    // Yalnızca dersi olan öğretmenleri/günleri dikkate al
    const activeLoads = loads.filter((l) => l > 0);
    if (activeLoads.length <= 1) return "100.0";

    const avg = activeLoads.reduce((a, b) => a + b, 0) / activeLoads.length;

    // Ortalama Mutlak Sapma (Mean Absolute Deviation)
    const totalDeviation = activeLoads.reduce(
      (sum, load) => sum + Math.abs(load - avg),
      0
    );
    const meanDeviation = totalDeviation / activeLoads.length;

    // Skoru hesapla (Ortalama sapma arttıkça skor düşer)
    // 1 puan sapma yaklaşık 10 puan ceza
    const score = Math.max(0, 100 - meanDeviation * 10);

    return score.toFixed(1);
  }

  // ============================================
  // RAPOR OLUŞTURMA VE KULLANICI ARAYÜZÜ
  // ============================================

  /**
   * Genel program raporunu oluşturur.
   */
  generateReport(programData) {
    const overall = this.getOverallStats(programData);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalLessons: overall.totalLessons,
        fillRate: overall.fillRate + "%",
        qualityScore: overall.qualityScore,
        teacherCount: overall.totalTeachers,
        classCount: overall.totalClasses,
      },
      metrics: {
        balance: overall.balanceScore,
        gaps: overall.gapScore,
        efficiency: overall.fillRate,
      },
      details: overall,
    };

    return report;
  }

  /**
   * Raporu konsola yazdırır.
   */
  printReport(report) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 PROGRAM İSTATİSTİK RAPORU (V3.0)");
    console.log("=".repeat(60));
    console.log("\n📈 ÖZET:");
    console.log(`  • Toplam Ders: ${report.summary.totalLessons}`);
    console.log(`  • Doluluk Oranı: ${report.summary.fillRate}`);
    console.log(`  • Genel Kalite Skoru: ${report.summary.qualityScore} / 100`);
    console.log(`  • Öğretmen Sayısı: ${report.summary.teacherCount}`);
    console.log(`  • Sınıf Sayısı: ${report.summary.classCount}`);
    console.log("\n📊 METRİKLER (0-100):");
    console.log(`  • Yük Denge Skoru (Öğretmen): ${report.metrics.balance}`);
    console.log(`  • Boşluk Skoru (Öğretmen): ${report.metrics.gaps}`);
    console.log(`  • Verimlilik (Doluluk): ${report.metrics.efficiency}%`);
    console.log("\n" + "=".repeat(60) + "\n");
    console.log("DETAYLAR:");
    console.log(
      `  • Ortalama Öğretmen Yükü: ${report.details.avgTeacherLoad} ders`
    );
    console.log(
      `  • Ortalama Öğretmen Boşluğu: ${report.details.avgGapsPerTeacher} boşluk/öğretmen`
    );
  }

  // Cache temizle
  clearCache() {
    this.cache.clear();
    console.log("🔄 StatisticsManager cache temizlendi.");
  }
}

// Global export
if (typeof window !== "undefined") {
  window.StatisticsManager = StatisticsManager;
  // Globalde tekil erişim noktası
  window.statisticsManager = new StatisticsManager();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = StatisticsManager;
}

console.log(
  "✅ StatisticsManager yüklendi (V3.0 - Gelişmiş Kalite Metrikleri)"
);
