/**
 * ============================================
 * FUZZY LOGIC ENGINE (WCS Uyumlu V2.1)
 * ============================================
 * WeightedConstraintSystem (WCS) ve ScheduleScoring için gelişmiş
 * Üyelik Fonksiyonları (Membership Functions) ve esnek trapezoidal
 * hesaplamalar eklenmiştir.
 *
 * KRİTİK İYİLEŞTİRMELER (V2.1):
 * 1. 🟢 PARAMETRİK FONKSİYONLAR: Trapezoidal (yamuk) fonksiyona A, B, C, D noktaları ile esneklik kazandırıldı.
 * 2. 🟢 ÖZEL SKOR WRAPPERLARI: ScheduleScoring'in kullanacağı metrikler için doğrudan çağrı metotları eklendi.
 * 3. 🟢 TANIMLAMA YÖNTEMİ: Üyelik fonksiyonlarının daha modüler tanımlanması sağlandı.
 */

class FuzzyLogicEngine {
  constructor(config = {}) {
    this.config = {
      morningBonus: config.morningBonus ?? 5,
      afternoonPenalty: config.afternoonPenalty ?? -3,
      conflictPenalty: config.conflictPenalty ?? -10,
      preferredBranchBonus: config.preferredBranchBonus ?? 4,
    };
    this.isAvailable = true; // WCS için kontrol bayrağı

    // 🎯 V2.1 YENİ: Önceden Tanımlı Üyelik Fonksiyonları
    this.membershipFunctions = this.defineMembership();

    console.log("🌫️ FuzzyLogicEngine V2.1 (Gelişmiş) başlatıldı");
  }

  /**
   * Üyelik fonksiyonlarının parametrelerini tanımlar.
   * Bu sayede eşik değerleri (A, B, C, D) merkezi olarak yönetilebilir.
   */
  defineMembership() {
    return {
      // Değerin 0'a yakın olmasının iyi olduğu durumlar (Örn: Çakışma sayısı, Boşluk sayısı)
      LOW: { type: "TRAP_LEFT", params: { A: 0, B: 0, C: 40, D: 60 } },

      // Değerin yüksek olmasının iyi olduğu durumlar (Örn: Tercih Eşleşme Oranı)
      HIGH: { type: "TRAP_RIGHT", params: { A: 40, B: 60, C: 100, D: 100 } },

      // Boşluk sayısı (Gap Count) için özelleştirilmiş ters fonksiyon
      // 0 gap -> 1.0; 1 gap -> ~0.5; 2+ gap -> 0.0
      GAP_INVERSE: { type: "TRAP_LEFT", params: { A: 0, B: 0, C: 1.5, D: 3 } },

      // Denge Sapması (Standard Deviation - stdDev) için optimize edilmiş LOW
      // 0 stdDev -> 1.0; 2 stdDev -> ~0.5; 4+ stdDev -> 0.0
      BALANCE_LOW: { type: "TRAP_LEFT", params: { A: 0, B: 0, C: 2, D: 4 } },

      // Değerin orta aralıkta olmasının iyi olduğu durumlar (Örn: Ortalama ders sayısı)
      OPTIMAL_MID: { type: "TRAP_MID", params: { A: 3, B: 5, C: 7, D: 9 } },
    };
  }

  // ============================================
  // TEMEL FUZZY MATEMATİK FONKSİYONLARI
  // ============================================

  /**
   * Genel Trapezoidal (Yamuk) Üyelik Fonksiyonu.
   * A, B, C, D noktaları ile esnek üyelik hesabı sağlar.
   */
  trapmf(v, a, b, c, d) {
    if (v <= a) return 0.0;
    if (v >= d) return 0.0;

    // Yükselen kenar
    let slope1 = (v - a) / (b - a);

    // Düşen kenar
    let slope2 = (d - v) / (d - c);

    return Math.min(1.0, slope1, slope2);
  }

  // ============================================
  // KRİTİK METOT: ÜYELİK HESAPLAMA (WCS/Scoring için)
  // ============================================

  /**
   * Belirli bir değere (value) göre, bir üyelik tipinin (membershipType)
   * üyelik derecesini (0.0 ile 1.0 arası) döndürür.
   *
   * @param {number} value - Kontrol edilen değer.
   * @param {string} membershipType - Kullanılacak üyelik fonksiyonu.
   * @returns {number} Üyelik derecesi (Membership Degree).
   */
  calculateMembership(value, membershipType) {
    const v = parseFloat(value);
    const definition = this.membershipFunctions[membershipType];

    if (!definition) {
      console.warn(`⚠️ FuzzyLogic: Tanımsız üyelik tipi: ${membershipType}`);
      return 0.5;
    }

    const { A, B, C, D } = definition.params;
    let membership = 0.0;

    switch (definition.type) {
      case "TRAP_LEFT": // LOW ve GAP_INVERSE gibi (Sol tarafta yüksek, sağa doğru düşen)
        // A ve B noktasında 1.0, C'den D'ye düşüyor, D'den sonra 0.0
        if (v <= B) membership = 1.0;
        else if (v > B && v < D) membership = (D - v) / (D - C);
        else membership = 0.0;
        break;

      case "TRAP_RIGHT": // HIGH gibi (Sol tarafta 0.0, C'den D'ye yükseliyor, D'den sonra 1.0)
        // Düşük değerde 0.0, B'den C'ye yükseliyor, C'den sonra 1.0
        if (v >= C) membership = 1.0;
        else if (v > A && v < C) membership = (v - A) / (C - A);
        else membership = 0.0;
        break;

      case "TRAP_MID": // OPTIMAL_MID gibi (Ortada yüksek, iki yana düşen)
        membership = this.trapmf(v, A, B, C, D);
        break;

      default:
        membership = 0.5;
        break;
    }

    // 0 ile 1 arasında kalmasını garanti et
    return Math.min(1.0, Math.max(0.0, membership));
  }

  // ============================================
  // SCHEDULE SCORING ENTEGRASYON WRAPPERLARI
  // ============================================

  /**
   * ScheduleScoring.scoreGaps metodunun kullanabileceği ceza/bonus hesaplayıcı.
   * Boşluk sayısı (gapCount) ne kadar düşükse, üyelik o kadar yüksektir.
   *
   * @param {number} gapCount - Bir sınıftaki veya öğretmendeki ardışık boş ders saati sayısı.
   * @returns {number} 0.0 (en kötü) ile 1.0 (en iyi) arasında skor.
   */
  scoreGapPenalty(gapCount) {
    return this.calculateMembership(gapCount, "GAP_INVERSE");
  }

  /**
   * ScheduleScoring.scoreDistribution metodunun kullanabileceği denge hesaplayıcı.
   * Standart sapma (stdDev) ne kadar düşükse (0'a yakınsa), üyelik o kadar yüksektir.
   *
   * @param {number} stdDev - Günlük ders yükü dağılımının standart sapması.
   * @returns {number} 0.0 (kötü denge) ile 1.0 (mükemmel denge) arasında skor.
   */
  scoreBalanceDeviation(stdDev) {
    return this.calculateMembership(stdDev, "BALANCE_LOW");
  }

  /**
   * ScheduleScoring.scorePreferences metodunun kullanabileceği tercih skorlayıcı.
   * Eşleşme oranı (matchRatio) ne kadar yüksekse, üyelik o kadar yüksektir.
   *
   * @param {number} matchRatio - Eşleşen tercihler / Toplam tercihler (0-100 arası).
   * @returns {number} 0.0 (kötü eşleşme) ile 1.0 (mükemmel eşleşme) arasında skor.
   */
  scorePreferenceMatch(matchRatio) {
    return this.calculateMembership(matchRatio, "HIGH");
  }

  // ============================================
  // ORİJİNAL METOTLAR (Tek başına değerlendirme için korundu)
  // ============================================

  /**
   * Tüm programı değerlendirir (Orijinal Fuzzy Logic skorlama)
   */
  evaluate(solution) {
    let total = 0;

    // ✅ Solution objesi ise array'e çevir
    let slots = [];

    if (Array.isArray(solution)) {
      // Zaten array
      slots = solution;
    } else if (typeof solution === "object" && solution !== null) {
      // Schedule objesi - dönüştür
      for (const classId in solution) {
        for (const day in solution[classId]) {
          for (const time in solution[classId][day]) {
            const lesson = solution[classId][day][time];
            if (lesson) {
              // Time ve Day'in string yerine number olduğundan emin olalım
              slots.push({
                day: parseInt(day),
                time: parseInt(time),
                lesson: lesson,
              });
            }
          }
        }
      }
    }

    // Scoring
    for (const slot of slots) {
      total += this.evaluateSlot(slot.day, slot.time, slot.lesson);
    }

    console.log("🌫️ Fuzzy toplam skor (Legacy):", total);
    return total;
  }

  /**
   * Tek bir ders yerinin bulanık puanını hesaplar (Legacy)
   */
  evaluateSlot(day, time, lesson) {
    let score = 0;

    // Sabah saatleri → yüksek verim
    if (this.isMorning(time)) {
      score += this.config.morningBonus;
    }

    // Öğleden sonra saatleri → düşük verim
    if (this.isAfternoon(time)) {
      score += this.config.afternoonPenalty;
    }

    // Aynı branştan üst üste iki ders olursa yorgunluk
    // NOT: lesson.repeated yerine, WCS entegrasyonu için lesson'ın çevresindeki slotları kontrol etmek daha güvenlidir.
    // Ancak bu metot sadece Legacy amaçlı korunmuştur.
    if (lesson.repeated === true) {
      score += this.config.conflictPenalty;
    }

    // Bazı branşlar sabah daha iyi olabilir (opsiyonel)
    if (lesson.subjectName === "Matematik" && this.isMorning(time)) {
      score += this.config.preferredBranchBonus;
    }

    return score;
  }

  isMorning(time) {
    const t = parseInt(time);
    return t >= 0 && t <= 3; // 0-3 saatler arası
  }

  isAfternoon(time) {
    const t = parseInt(time);
    return t >= 6 && t <= 7; // 6-7 saatler arası (8 saatlik bir günde)
  }

  // ============================================
  // ALGORİTMA ENTEGRASYON WRAPPER (Legacy)
  // ============================================

  /**
   * GA veya diğer algoritmalar için optimize wrapper (Legacy)
   */
  optimize(config) {
    console.log("🌫️ Fuzzy.optimize() → evaluate() yönlendiriliyor");

    // Fuzzy logic score hesapla
    const score = this.evaluate(config.solution);

    // schedule-algorithm-v2.js'in beklediği formatta dön
    return {
      success: true,
      solution: config.solution, // Değişiklik yok, sadece scoring
      fitness: score,
      iterations: 1,
    };
  }
}

// 🌍 Konsol ve diğer scriptlerde erişilebilir
if (typeof window !== "undefined") {
  window.FuzzyLogic = FuzzyLogicEngine;
  console.log("✅ FuzzyLogicEngine V2.1 (Gelişmiş) yüklendi");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = FuzzyLogicEngine;
}
