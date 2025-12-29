/**
 * ============================================
 * WEIGHTED CONSTRAINT SYSTEM (Geliştirilmiş)
 * ============================================
 * Kısıtları ağırlıklı olarak değerlendirir
 * Öğretmen tercihleri, bloklar, günlük limitler vb.
 */

class WeightedConstraintSystem {
  constructor(weights) {
    this.weights = weights;
  }

  /**
   * Ağırlıkları güncelle
   */
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * Kritik kısıtları kontrol et (hard constraints)
   */
  checkCritical(solution, lesson, day, time) {
    const violations = [];

    // 1. ÖĞRETMEN ÇAKIŞMASI (KRİTİK)
    for (let i = 0; i < lesson.blockSize; i++) {
      const currentTime = time + i;

      for (const classId in solution) {
        const slot = solution[classId][day]?.[currentTime];
        if (slot && slot.teacherId === lesson.teacherId) {
          violations.push({
            type: "TEACHER_CONFLICT",
            severity: "critical",
            weight: this.weights.teacherConflict,
            message: `Öğretmen ${lesson.teacherCode} zaten ${slot.className} sınıfında`,
          });
        }
      }
    }

    // 2. SINIF ÇAKIŞMASI (KRİTİK)
    for (let i = 0; i < lesson.blockSize; i++) {
      const currentTime = time + i;
      if (solution[lesson.classId][day][currentTime]) {
        violations.push({
          type: "CLASS_CONFLICT",
          severity: "critical",
          weight: this.weights.classConflict,
          message: `Sınıf ${lesson.className} zaten dolu`,
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Tüm kısıtları kontrol et ve violations döndür
   */
  checkAllConstraints(solution, lesson, day, time) {
    const violations = [];

    // Kritik kısıtlar
    const critical = this.checkCritical(solution, lesson, day, time);
    if (!critical.valid) {
      violations.push(...critical.violations);
      return { valid: false, violations }; // Kritik ihlal varsa diğerlerine bakma
    }

    // Diğer kısıtları değerlendir
    const score = this.evaluate(solution, lesson, day, time);

    // Negatif skorları ihlal olarak ekle
    if (score < 0) {
      violations.push({
        type: "SOFT_CONSTRAINT",
        severity: "medium",
        weight: Math.abs(score),
        message: "Tercih edilen kısıtlar tam olarak sağlanmıyor",
      });
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Tüm kısıtları değerlendir ve skor üret
   */
  evaluate(solution, lesson, day, time) {
    let score = 0;
    const evaluations = [];

    // ============================================
    // A) ÖĞRETMEN TERCİHLERİ
    // ============================================

    if (window.PreferenceManager) {
      const teacherScore = this.evaluateTeacherPreferences(
        lesson.teacherId,
        day,
        time,
        lesson.blockSize
      );
      score += teacherScore.score;
      evaluations.push(teacherScore);
    }

    // ============================================
    // B) ÖĞRETMEN KISITLARI
    // ============================================

    // 1. Günlük max ders
    const dailyMax = this.evaluateDailyMax(solution, lesson.teacherId, day);
    score += dailyMax.score;
    evaluations.push(dailyMax);

    // 2. Günlük min ders
    const dailyMin = this.evaluateDailyMin(solution, lesson.teacherId, day);
    score += dailyMin.score;
    evaluations.push(dailyMin);

    // 3. Boş pencere (gap)
    const gap = this.evaluateTeacherGap(solution, lesson.teacherId, day, time);
    score += gap.score;
    evaluations.push(gap);

    // 4. Haftalık denge
    const weekBalance = this.evaluateWeekBalance(
      solution,
      lesson.teacherId,
      day
    );
    score += weekBalance.score;
    evaluations.push(weekBalance);

    // ============================================
    // C) SINIF KISITLARI
    // ============================================

    // 1. Aynı gün aynı ders
    const sameDay = this.checkSameDaySubject(
      solution,
      lesson.classId,
      lesson.subjectId,
      day
    );
    score += sameDay.score;
    evaluations.push(sameDay);

    // 2. Sınıf boş pencere
    const classGap = this.evaluateClassGap(solution, lesson.classId, day, time);
    score += classGap.score;
    evaluations.push(classGap);

    // ============================================
    // D) DERS KISITLARI
    // ============================================

    // 1. Blok bütünlüğü
    if (lesson.blockSize > 1) {
      const block = this.evaluateBlockPlacement(day, time, lesson.blockSize);
      score += block.score;
      evaluations.push(block);
    }

    // 2. Saat tercihi
    const timeScore = this.evaluateTimePreference(time);
    score += timeScore.score;
    evaluations.push(timeScore);

    // 3. Gün tercihi
    const dayScore = this.evaluateDayPreference(day);
    score += dayScore.score;
    evaluations.push(dayScore);

    return score;
  }

  // ============================================
  // ÖĞRETMEN TERCİH DEĞERLENDİRMESİ
  // ============================================

  evaluateTeacherPreferences(teacherId, day, time, blockSize) {
    let score = 0;
    const details = [];

    if (!window.PreferenceManager) {
      return { type: "TEACHER_PREF", score: 0, details };
    }

    const prefs = window.PreferenceManager.tercihGetir(teacherId);
    if (!prefs) {
      return { type: "TEACHER_PREF", score: 0, details };
    }

    // 1. BOŞ GÜN TERCİHİ
    if (prefs.bosGun && parseInt(prefs.bosGun) === parseInt(day)) {
      score -= this.weights.teacherPreference;
      details.push({
        reason: "BOŞ GÜN",
        penalty: -this.weights.teacherPreference,
        message: `Öğretmen bu günü boş istiyor`,
      });
    }

    // 2. KAPALI SAAT TERCİHLERİ
    if (prefs.kapaliSaatler && prefs.kapaliSaatler[day]) {
      const blockedTimes = prefs.kapaliSaatler[day];

      for (let i = 0; i < blockSize; i++) {
        const currentTime = time + i;

        if (blockedTimes.includes(currentTime)) {
          score -= this.weights.timePreference;
          details.push({
            reason: "KAPALI SAAT",
            penalty: -this.weights.timePreference,
            message: `${currentTime}. saat kapalı`,
          });
        }
      }
    }

    // 3. BONUS: Tercih edilen saatler
    if (prefs.tercihEdilenSaatler && prefs.tercihEdilenSaatler[day]) {
      const preferredTimes = prefs.tercihEdilenSaatler[day];

      if (preferredTimes.includes(time)) {
        score += this.weights.timePreference * 0.5;
        details.push({
          reason: "TERCİH EDİLEN SAAT",
          bonus: this.weights.timePreference * 0.5,
          message: "Bu saat tercih ediliyor",
        });
      }
    }

    return {
      type: "TEACHER_PREF",
      score,
      details,
    };
  }

  // ============================================
  // ÖĞRETMEN GÜNLÜK MAX DERS
  // ============================================

  evaluateDailyMax(solution, teacherId, day) {
    const dailyCount = this.countTeacherDailyLessons(solution, teacherId, day);
    const maxLimit = 8;

    let score = 0;
    let message = "";

    if (dailyCount >= maxLimit) {
      score = -this.weights.dailyMaxLessons;
      message = `Günlük max limit (${maxLimit}) aşıldı`;
    } else if (dailyCount >= maxLimit - 1) {
      score = -this.weights.dailyMaxLessons * 0.5;
      message = `Günlük limite yakın (${dailyCount}/${maxLimit})`;
    } else {
      message = `Günlük ders sayısı normal (${dailyCount}/${maxLimit})`;
    }

    return {
      type: "DAILY_MAX",
      score,
      message,
    };
  }

  // ============================================
  // ÖĞRETMEN GÜNLÜK MIN DERS
  // ============================================

  evaluateDailyMin(solution, teacherId, day) {
    const dailyCount = this.countTeacherDailyLessons(solution, teacherId, day);
    const minLimit = 2;

    let score = 0;
    let message = "";

    if (dailyCount > 0 && dailyCount < minLimit) {
      score = -this.weights.dailyMinLessons;
      message = `Günlük min limiti altında (${dailyCount}/${minLimit})`;
    } else {
      message = `Günlük ders sayısı uygun (${dailyCount})`;
    }

    return {
      type: "DAILY_MIN",
      score,
      message,
    };
  }

  // ============================================
  // ÖĞRETMEN BOŞ PENCERE
  // ============================================

  evaluateTeacherGap(solution, teacherId, day, newTime) {
    const lessons = [];

    for (const classId in solution) {
      const daySchedule = solution[classId][day];
      if (daySchedule) {
        for (const time in daySchedule) {
          if (daySchedule[time].teacherId === teacherId) {
            lessons.push(parseInt(time));
          }
        }
      }
    }

    lessons.push(parseInt(newTime));
    lessons.sort((a, b) => a - b);

    let maxGap = 0;
    for (let i = 0; i < lessons.length - 1; i++) {
      const gap = lessons[i + 1] - lessons[i] - 1;
      if (gap > maxGap) maxGap = gap;
    }

    let penalty = 0;
    let message = "";

    if (maxGap === 0) {
      penalty = this.weights.gapPenalty * 0.5; // Bonus
      message = "Boşluk yok (mükemmel)";
    } else if (maxGap === 1) {
      penalty = 0;
      message = "1 saat boşluk (kabul edilebilir)";
    } else if (maxGap === 2) {
      penalty = -this.weights.gapPenalty * 0.5;
      message = "2 saat boşluk (orta)";
    } else {
      penalty = -this.weights.gapPenalty * maxGap;
      message = `${maxGap} saat boşluk (kötü)`;
    }

    return {
      type: "TEACHER_GAP",
      score: penalty,
      gap: maxGap,
      message,
    };
  }

  // ============================================
  // HAFTALIK DENGE
  // ============================================

  evaluateWeekBalance(solution, teacherId, day) {
    const weeklyDist = {};

    for (let d = 1; d <= 5; d++) {
      weeklyDist[d] = this.countTeacherDailyLessons(solution, teacherId, d);
    }

    const values = Object.values(weeklyDist);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    let score = 0;

    if (stdDev < 1) {
      score = this.weights.weekBalance * 0.5;
    } else if (stdDev > 2) {
      score = -this.weights.weekBalance * 0.5;
    }

    return {
      type: "WEEK_BALANCE",
      score,
      stdDev: stdDev.toFixed(2),
      message: `Haftalık sapma: ${stdDev.toFixed(2)}`,
    };
  }

  // ============================================
  // AYNI GÜN AYNI DERS
  // ============================================

  checkSameDaySubject(solution, classId, subjectId, day) {
    const daySchedule = solution[classId][day];

    if (daySchedule) {
      for (const time in daySchedule) {
        if (daySchedule[time].subjectId === subjectId) {
          return {
            type: "SAME_DAY_SUBJECT",
            score: -50,
            message: "Aynı ders aynı günde tekrar ediyor",
          };
        }
      }
    }

    return {
      type: "SAME_DAY_SUBJECT",
      score: 0,
      message: "OK",
    };
  }

  // ============================================
  // SINIF BOŞ PENCERE
  // ============================================

  evaluateClassGap(solution, classId, day, newTime) {
    const lessons = [];
    const daySchedule = solution[classId][day];

    if (daySchedule) {
      for (const time in daySchedule) {
        lessons.push(parseInt(time));
      }
    }

    lessons.push(parseInt(newTime));
    lessons.sort((a, b) => a - b);

    let maxGap = 0;
    for (let i = 0; i < lessons.length - 1; i++) {
      const gap = lessons[i + 1] - lessons[i] - 1;
      if (gap > maxGap) maxGap = gap;
    }

    const penalty = maxGap > 1 ? -this.weights.gapPenalty * maxGap * 0.5 : 0;

    return {
      type: "CLASS_GAP",
      score: penalty,
      gap: maxGap,
      message: maxGap > 0 ? `${maxGap} saat boşluk` : "Boşluk yok",
    };
  }

  // ============================================
  // BLOK YERLEŞTİRME
  // ============================================

  evaluateBlockPlacement(day, time, blockSize) {
    let score = 0;
    const messages = [];

    // Sabah saatleri ideal
    if (time <= 2) {
      score += this.weights.morningBonus;
      messages.push("Sabah saati (ideal)");
    }

    // Öğle arası bölünmesi
    if (time <= 4 && time + blockSize - 1 >= 5) {
      score -= this.weights.blockIntegrity;
      messages.push("Öğle arası ile bölünüyor");
    }

    // Gün sonu
    if (time + blockSize - 1 > 7) {
      score -= 20;
      messages.push("Gün sonu (kötü)");
    }

    return {
      type: "BLOCK_PLACEMENT",
      score,
      message: messages.join(", "),
    };
  }

  // ============================================
  // SAAT TERCİHİ
  // ============================================

  evaluateTimePreference(time) {
    let score = 0;
    let message = "";

    if (time >= 1 && time <= 3) {
      score = this.weights.morningBonus;
      message = "Sabah saati (tercih edilir)";
    } else if (time >= 6) {
      score = this.weights.afternoonPenalty;
      message = "Öğleden sonra (tercih edilmez)";
    }

    return {
      type: "TIME_PREF",
      score,
      message,
    };
  }

  // ============================================
  // GÜN TERCİHİ
  // ============================================

  evaluateDayPreference(day) {
    let score = 0;
    let message = "";

    if (day === 1 || day === 5) {
      score = -10;
      message = day === 1 ? "Pazartesi (hafif)" : "Cuma (hafif)";
    } else {
      score = 5;
      message = "Orta gün (ideal)";
    }

    return {
      type: "DAY_PREF",
      score,
      message,
    };
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  countTeacherDailyLessons(solution, teacherId, day) {
    let count = 0;

    for (const classId in solution) {
      const daySchedule = solution[classId][day];
      if (daySchedule) {
        for (const time in daySchedule) {
          if (daySchedule[time].teacherId === teacherId) {
            count++;
          }
        }
      }
    }

    return count;
  }
}

// Export
if (typeof window !== "undefined") {
  window.WeightedConstraintSystem = WeightedConstraintSystem;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = WeightedConstraintSystem;
}

console.log("✅ WeightedConstraintSystem yüklendi");

// 🌍 Global erişim
window.WeightedConstraintSystem = WeightedConstraintSystem;
console.log("📦 WeightedConstraintSystem global erişim aktif!");
