/**
 * ============================================
 * BLOCK DAY VALIDATOR V3.0 - ALGORİTMA ENTEGRE (DERS ADI FIX)
 * ============================================
 *
 * 🔥 CRITICAL FIX: lesson.name yerine lesson.subjectName/lesson.name kullanımı
 *
 * ✅ GA/SA/ACO/TABU/RL/FUZZY tam entegrasyonu
 * ✅ BlockStructure V3.0 API kullanımı
 * ✅ Matematik özel kuralı: (2-2-2) → 3 blok, farklı günler, min 1 gün ara
 * ✅ Tarih özel kuralı: (2) → tek blok, aynı gün, arka arkaya
 * ✅ Algoritma skorlama desteği
 * ✅ Penalty sistemi
 */

class BlockDayValidator {
  constructor() {
    this.violations = new Map();
    this.validatedBlocks = new Set();

    this.stats = {
      totalValidations: 0,
      passed: 0,
      failed: 0,
      matematikViolations: 0,
      consecutiveViolations: 0,
      sameDayViolations: 0,
      minDayGapViolations: 0,
      totalPenalty: 0,
    };

    this.DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    // ALGORİTMA CEZA AĞIRLIKLARI
    this.PENALTIES = {
      SAME_DAY_VIOLATION: 20000, // Matematik blokları aynı gün
      MIN_DAY_GAP_VIOLATION: 15000, // Bloklar arası gün ara eksik
      SIZE_MISMATCH: 10000, // Blok boyutu uyumsuz
      CONSECUTIVE_VIOLATION: 8000, // Ardışık değil
      MISSING_BLOCK: 25000, // Blok eksik
    };

    console.log("📅 BlockDayValidator V3.0 (Algoritma Entegre) başlatıldı");
  }

  // ============================================
  // ANA VALIDASYON FONKSİYONU
  // ============================================

  validate(schedule, lesson) {
    console.log("\n" + "=".repeat(70));
    console.log("📅 BLOCK DAY VALIDATION");
    console.log("=".repeat(70));

    this.stats.totalValidations++;

    if (
      !window.BlockStructure ||
      !window.BlockStructure.isBlockLesson(lesson)
    ) {
      console.log("   ℹ️  Bloksuz ders, validasyon atlandı");
      this.stats.passed++;
      return { valid: true, penalty: 0, reason: "Not a block lesson" };
    }

    const blockType = window.BlockStructure.getBlockType(lesson);
    const violations = [];
    let totalPenalty = 0;

    // 🔥 KRİTİK DÜZELTME: lesson.name yerine subjectName/name kullanılır
    const lessonName = lesson.subjectName || lesson.name || "Bilinmeyen Ders";

    console.log(`   🔷 Ders: ${lessonName} (${lesson.className})`);
    console.log(`   📦 Blok yapısı: (${blockType.patternString})`);
    console.log(`   🔢 Blok sayısı: ${blockType.blockCount}`);

    if (blockType.specialRule) {
      console.log(`   ⭐ Özel kural: ${blockType.specialRule}`);
    }

    const placements = this.getLessonPlacements(schedule, lesson);

    if (placements.length === 0) {
      console.log("   ⚠️  Ders henüz yerleştirilmemiş");
      console.log("=".repeat(70) + "\n");
      return { valid: true, penalty: 0, reason: "Not placed yet" };
    }

    console.log(`   📍 Toplam yerleştirme: ${placements.length} slot\n`);

    const blockGroups = this.groupByBlockIndex(
      placements,
      blockType.blockCount
    );

    // Her bloku kontrol et
    for (let blockIndex = 0; blockIndex < blockType.blockCount; blockIndex++) {
      const blockSize = blockType.blockSizes[blockIndex];
      const blockPlacements = blockGroups[blockIndex] || [];

      console.log(
        `   📍 Blok ${blockIndex + 1}/${
          blockType.blockCount
        } (${blockSize} saat):`
      );

      if (blockPlacements.length === 0) {
        violations.push({
          type: "MISSING_BLOCK",
          blockIndex,
          penalty: this.PENALTIES.MISSING_BLOCK,
          message: `Blok ${blockIndex + 1} yerleştirilmemiş`,
        });
        totalPenalty += this.PENALTIES.MISSING_BLOCK;
        console.log(
          `      ❌ Yerleştirilmemiş (-${this.PENALTIES.MISSING_BLOCK})`
        );
        continue;
      }

      // 1. SIZE KONTROLÜ
      if (blockPlacements.length !== blockSize) {
        const penalty = this.PENALTIES.SIZE_MISMATCH;
        violations.push({
          type: "SIZE_MISMATCH",
          blockIndex,
          expected: blockSize,
          actual: blockPlacements.length,
          penalty,
          message: `Blok boyutu uyumsuz: ${blockPlacements.length}/${blockSize}`,
        });
        totalPenalty += penalty;
        this.stats.consecutiveViolations++;
        console.log(`      ❌ Boyut uyumsuz (-${penalty})`);
      } else {
        console.log(`      ✅ Boyut: ${blockSize} saat`);
      }

      // 2. ARDIŞIK KONTROLÜ
      if (blockType.mustBeConsecutive) {
        const consecutiveCheck = this.checkConsecutive(
          blockPlacements,
          blockSize
        );

        if (!consecutiveCheck.valid) {
          const penalty = this.PENALTIES.CONSECUTIVE_VIOLATION;
          violations.push({
            type: "CONSECUTIVE",
            blockIndex,
            penalty,
            ...consecutiveCheck,
          });
          totalPenalty += penalty;
          this.stats.consecutiveViolations++;
          console.log(`      ❌ Ardışık değil (-${penalty})`);
        } else {
          console.log(`      ✅ Ardışık: TAMAM`);
        }
      }

      // 3. AYNI GÜN KONTROLÜ
      if (blockType.mustBeSameDay) {
        const sameDayCheck = this.checkSameDay(blockPlacements);

        if (!sameDayCheck.valid) {
          const penalty = this.PENALTIES.CONSECUTIVE_VIOLATION;
          violations.push({
            type: "SAME_DAY",
            blockIndex,
            penalty,
            ...sameDayCheck,
          });
          totalPenalty += penalty;
          this.stats.sameDayViolations++;
          console.log(`      ❌ Aynı gün değil (-${penalty})`);
        } else {
          const day = blockPlacements[0].day;
          console.log(`      ✅ Aynı gün: ${this.DAYS[day]}`);
        }
      }
    }

    // 4. MATEMATİK ÖZEL KURALI
    if (blockType.specialRule === "MATEMATIK") {
      console.log(`\n   ⭐ Matematik özel kuralı kontrolü:`);

      const matematikCheck = this.checkMatematikRule(blockGroups, blockType);

      if (!matematikCheck.valid) {
        violations.push({
          type: "MATEMATIK_RULE",
          penalty: matematikCheck.penalty,
          ...matematikCheck,
        });
        totalPenalty += matematikCheck.penalty;
        this.stats.matematikViolations++;
        this.stats.minDayGapViolations++;
        console.log(
          `      ❌ ${matematikCheck.reason} (-${matematikCheck.penalty})`
        );
      } else {
        console.log(`      ✅ Matematik kuralı: UYGUN`);
      }
    }

    const valid = violations.length === 0;
    this.stats.totalPenalty += totalPenalty;

    if (valid) {
      this.stats.passed++;
      this.validatedBlocks.add(lesson.id);
      console.log("\n   ✅ VALIDASYON BAŞARILI!");
    } else {
      this.stats.failed++;
      this.violations.set(lesson.id, violations);
      console.log(
        `\n   ❌ VALIDASYON BAŞARISIZ! (${violations.length} ihlal, ceza: ${totalPenalty})`
      );
    }

    console.log("=".repeat(70) + "\n");

    return {
      valid,
      violations,
      penalty: totalPenalty,
      lesson: lessonName, // Düzeltilmiş isim
      className: lesson.className,
      blockType: blockType.key,
      placements: placements.length,
    };
  }

  // ============================================
  // MATEMATİK ÖZEL KURALI KONTROLÜ (CEZALI)
  // ============================================

  checkMatematikRule(blockGroups, blockType) {
    const blockDays = [];

    for (let blockIndex = 0; blockIndex < blockType.blockCount; blockIndex++) {
      const blockPlacements = blockGroups[blockIndex] || [];

      if (blockPlacements.length > 0) {
        const day = blockPlacements[0].day;
        blockDays.push({ blockIndex, day });
      }
    }

    if (blockDays.length === 0) {
      return {
        valid: false,
        penalty: this.PENALTIES.MISSING_BLOCK * blockType.blockCount,
        reason: "Hiç blok yerleştirilmemiş",
      };
    }

    // 1. FARKLI GÜNLER KONTROLÜ
    const days = blockDays.map((b) => b.day);
    const uniqueDays = [...new Set(days)];

    if (uniqueDays.length !== days.length) {
      const duplicateDays = days.filter(
        (day, index) => days.indexOf(day) !== index
      );
      return {
        valid: false,
        penalty:
          this.PENALTIES.SAME_DAY_VIOLATION * (days.length - uniqueDays.length),
        reason: `Bloklar aynı güne yerleştirilmiş: ${[...new Set(duplicateDays)]
          .map((d) => this.DAYS[d])
          .join(", ")}`,
      };
    }

    // 2. MİNİMUM GÜN ARASI KONTROLÜ
    if (blockType.minDaysBetween && blockType.minDaysBetween > 0) {
      const sortedDays = [...days].sort((a, b) => a - b);
      let totalViolations = 0;

      for (let i = 1; i < sortedDays.length; i++) {
        const gap = sortedDays[i] - sortedDays[i - 1];

        if (gap < blockType.minDaysBetween) {
          totalViolations++;
        }
      }

      if (totalViolations > 0) {
        return {
          valid: false,
          penalty: this.PENALTIES.MIN_DAY_GAP_VIOLATION * totalViolations,
          reason: `Bloklar arası gün ara yetersiz (${totalViolations} ihlal)`,
        };
      }
    }

    return { valid: true, penalty: 0 };
  }

  // ============================================
  // ALGORİTMA ENTEGRASYON METHODLARı
  // ============================================

  /**
   * GA/SA için hızlı validasyon (sadece ceza skoru)
   */
  quickValidate(schedule, lessons) {
    let totalPenalty = 0;
    let violationCount = 0;

    const blockLessons = lessons.filter(
      (l) => window.BlockStructure && window.BlockStructure.isBlockLesson(l)
    );

    // Hızlı validasyon için döngüde konsol çıktısı engellenir.
    for (const lesson of blockLessons) {
      const result = this._internalValidate(schedule, lesson);

      if (!result.valid) {
        totalPenalty += result.penalty;
        violationCount += result.violations.length;
      }
    }

    return {
      penalty: totalPenalty,
      violationCount,
      valid: violationCount === 0,
    };
  }

  /**
   * validate metodunun konsol çıktısı olmayan iç versiyonu
   */
  _internalValidate(schedule, lesson) {
    if (
      !window.BlockStructure ||
      !window.BlockStructure.isBlockLesson(lesson)
    ) {
      return { valid: true, penalty: 0, reason: "Not a block lesson" };
    }

    const blockType = window.BlockStructure.getBlockType(lesson);
    const violations = [];
    let totalPenalty = 0;

    // Ders yerleşimlerini al
    const placements = this.getLessonPlacements(schedule, lesson);

    if (placements.length === 0) {
      return { valid: true, penalty: 0, reason: "Not placed yet" };
    }

    // Bloklara göre grupla
    const blockGroups = this.groupByBlockIndex(
      placements,
      blockType.blockCount
    );

    // Her bloku kontrol et
    for (let blockIndex = 0; blockIndex < blockType.blockCount; blockIndex++) {
      const blockSize = blockType.blockSizes[blockIndex];
      const blockPlacements = blockGroups[blockIndex] || [];

      if (blockPlacements.length === 0) {
        violations.push({
          type: "MISSING_BLOCK",
          penalty: this.PENALTIES.MISSING_BLOCK,
        });
        totalPenalty += this.PENALTIES.MISSING_BLOCK;
        continue;
      }

      // 1. SIZE KONTROLÜ
      if (blockPlacements.length !== blockSize) {
        totalPenalty += this.PENALTIES.SIZE_MISMATCH;
      }

      // 2. ARDIŞIK KONTROLÜ
      if (blockType.mustBeConsecutive) {
        const consecutiveCheck = this.checkConsecutive(
          blockPlacements,
          blockSize
        );
        if (!consecutiveCheck.valid) {
          totalPenalty += this.PENALTIES.CONSECUTIVE_VIOLATION;
        }
      }

      // 3. AYNI GÜN KONTROLÜ
      if (blockType.mustBeSameDay) {
        const sameDayCheck = this.checkSameDay(blockPlacements);
        if (!sameDayCheck.valid) {
          totalPenalty += this.PENALTIES.CONSECUTIVE_VIOLATION;
        }
      }
    }

    // 4. MATEMATİK ÖZEL KURALI
    if (blockType.specialRule === "MATEMATIK") {
      const matematikCheck = this.checkMatematikRule(blockGroups, blockType);
      if (!matematikCheck.valid) {
        totalPenalty += matematikCheck.penalty;
      }
    }

    return {
      valid: totalPenalty === 0,
      penalty: totalPenalty,
      violations: totalPenalty > 0 ? [{ type: "QUICK_VIOLATION" }] : [],
    };
  }

  /**
   * GA için fitness katkısı
   */
  getFitnessContribution(schedule, lessons) {
    const result = this.quickValidate(schedule, lessons);
    return -result.penalty; // Negatif çünkü fitness maksimize edilir
  }

  /**
   * SA için enerji katkısı
   */
  getEnergyContribution(schedule, lessons) {
    const result = this.quickValidate(schedule, lessons);
    return result.penalty; // Pozitif çünkü enerji minimize edilir
  }

  /**
   * ACO için feromon faktörü
   */
  getPheromoneFactor(schedule, lessons) {
    const result = this.quickValidate(schedule, lessons);

    if (result.valid) {
      return 1.0; // Mükemmel
    } else {
      // Ceza oranına göre feromon azalt
      const maxPenalty = this.PENALTIES.SAME_DAY_VIOLATION * 10;
      return Math.max(0.05, 1.0 - result.penalty / maxPenalty);
    }
  }

  /**
   * TABU için tenure katkısı
   */
  getTabuTenure(lesson) {
    if (
      !window.BlockStructure ||
      !window.BlockStructure.isBlockLesson(lesson)
    ) {
      return 3;
    }

    const blockType = window.BlockStructure.getBlockType(lesson);

    if (blockType.specialRule === "MATEMATIK") {
      return 10; // Çok uzun tenure (matematik swap'a kapalı)
    }

    return 5 + blockType.blockCount;
  }

  /**
   * RL için reward hesaplama
   */
  getReward(oldPenalty, newPenalty) {
    if (newPenalty === 0 && oldPenalty === 0) {
      return 0.0; // Değişiklik yok
    } else if (newPenalty === 0) {
      return 1.0; // Mükemmel
    } else if (newPenalty < oldPenalty) {
      return 0.5; // İyileşme
    } else if (newPenalty === oldPenalty) {
      return -0.1; // Kötüleşme yok ama iyileşme de yok
    } else {
      return -1.0; // Kötüleşme
    }
  }

  /**
   * FUZZY için violation severity skoru
   */
  getViolationSeverity(schedule, lessons) {
    const result = this.quickValidate(schedule, lessons);

    if (result.valid) {
      return 0.0; // Severity yok
    }

    const blockLessons = lessons.filter(
      (l) => window.BlockStructure && window.BlockStructure.isBlockLesson(l)
    );

    const matematikViolations = result.violationCount;
    const totalBlocks = blockLessons.reduce((sum, l) => {
      const bt = window.BlockStructure.getBlockType(l);
      return sum + bt.blockCount;
    }, 0);

    // Severity = (ihlal sayısı / toplam blok) * 100
    const severity =
      totalBlocks > 0 ? (matematikViolations / totalBlocks) * 100 : 0;

    return Math.min(severity, 100); // Max 100
  }

  /**
   * Tüm algoritmalara genel skor
   */
  getAlgorithmScore(schedule, lessons, algorithmType = "GA") {
    const result = this.quickValidate(schedule, lessons);

    switch (algorithmType) {
      case "GA":
        return this.getFitnessContribution(schedule, lessons);
      case "SA":
        return this.getEnergyContribution(schedule, lessons);
      case "ACO":
        return this.getPheromoneFactor(schedule, lessons);
      case "RL":
        return this.getReward(result.penalty, 0);
      case "FUZZY":
        return this.getViolationSeverity(schedule, lessons);
      case "TABU":
        return result.penalty;
      default:
        return -result.penalty;
    }
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  getLessonPlacements(schedule, lesson) {
    const placements = [];

    if (!schedule.data || !schedule.data[lesson.classId]) {
      return placements;
    }

    const classSchedule = schedule.data[lesson.classId];

    for (let day = 0; day < 5; day++) {
      const daySchedule = classSchedule[day];
      if (!daySchedule) continue;

      for (let period = 0; period < 8; period++) {
        const slot = daySchedule[period];

        if (slot && slot.lessonId === lesson.id) {
          placements.push({
            day,
            period,
            blockIndex: slot.metadata?.blockIndex ?? 0,
            blockSize: slot.metadata?.blockSize ?? 1,
            blockPosition: slot.metadata?.blockPosition ?? 0,
          });
        }
      }
    }

    placements.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.period - b.period;
    });

    return placements;
  }

  groupByBlockIndex(placements, blockCount) {
    const groups = {};

    for (let i = 0; i < blockCount; i++) {
      groups[i] = [];
    }

    for (const placement of placements) {
      const blockIndex = placement.blockIndex || 0;
      if (groups[blockIndex]) {
        groups[blockIndex].push(placement);
      }
    }

    return groups;
  }

  checkConsecutive(placements, expectedSize) {
    if (placements.length === 0) {
      return {
        valid: false,
        reason: "Hiç yerleştirme yok",
      };
    }

    if (placements.length !== expectedSize) {
      return {
        valid: false,
        reason: `Eksik: ${placements.length}/${expectedSize}`,
      };
    }

    for (let i = 1; i < placements.length; i++) {
      const prev = placements[i - 1];
      const curr = placements[i];

      if (curr.day !== prev.day || curr.period !== prev.period + 1) {
        return {
          valid: false,
          reason: `${this.DAYS[prev.day]} ${prev.period + 1} → ${
            this.DAYS[curr.day]
          } ${curr.period + 1}`,
        };
      }
    }

    return { valid: true };
  }

  checkSameDay(placements) {
    if (placements.length === 0) {
      return { valid: true };
    }

    const days = [...new Set(placements.map((p) => p.day))];

    if (days.length > 1) {
      return {
        valid: false,
        reason: `Farklı günler: ${days.map((d) => this.DAYS[d]).join(", ")}`,
      };
    }

    return { valid: true };
  }

  // ============================================
  // TOPLU VALIDASYON
  // ============================================

  validateAll(schedule, lessons) {
    console.log("\n" + "=".repeat(70));
    console.log("📅 TOPLU BLOK VALIDASYONU");
    console.log("=".repeat(70) + "\n");

    const results = [];
    let totalViolations = 0;
    let totalPenalty = 0;

    const blockLessons = lessons.filter(
      (l) => window.BlockStructure && window.BlockStructure.isBlockLesson(l)
    );

    console.log(`📊 Toplam bloklu ders: ${blockLessons.length}\n`);

    for (const lesson of blockLessons) {
      const result = this.validate(schedule, lesson);
      results.push(result);

      if (!result.valid) {
        totalViolations += result.violations.length;
        totalPenalty += result.penalty;
      }
    }

    console.log("=".repeat(70));
    console.log("📊 TOPLU VALIDASYON SONUÇLARI:");
    console.log("=".repeat(70));
    console.log(`   ✅ Başarılı: ${this.stats.passed}`);
    console.log(`   ❌ Başarısız: ${this.stats.failed}`);
    console.log(`   📊 Toplam ihlal: ${totalViolations}`);
    console.log(`   💰 Toplam ceza: ${totalPenalty}`);
    console.log(`   📐 Matematik ihlali: ${this.stats.matematikViolations}`);
    console.log("=".repeat(70) + "\n");

    return {
      results,
      totalViolations,
      totalPenalty,
      passed: this.stats.passed,
      failed: this.stats.failed,
      valid: totalViolations === 0,
    };
  }

  // ============================================
  // İSTATİSTİKLER
  // ============================================

  getStats() {
    return { ...this.stats };
  }

  clear() {
    this.violations.clear();
    this.validatedBlocks.clear();
    this.stats = {
      totalValidations: 0,
      passed: 0,
      failed: 0,
      matematikViolations: 0,
      consecutiveViolations: 0,
      sameDayViolations: 0,
      minDayGapViolations: 0,
      totalPenalty: 0,
    };
  }

  printReport() {
    console.log("\n📅 BLOCK DAY VALIDATOR RAPORU");
    console.log("=".repeat(60));
    console.log(`  • Toplam Validasyon: ${this.stats.totalValidations}`);
    console.log(`  • Başarılı: ${this.stats.passed}`);
    console.log(`  • Başarısız: ${this.stats.failed}`);
    console.log(`  • Matematik İhlali: ${this.stats.matematikViolations}`);
    console.log(`  • Toplam Ceza: ${this.stats.totalPenalty}`);
    console.log("=".repeat(60) + "\n");
  }
}

// ============================================
// GLOBAL EXPORT
// ============================================

if (typeof window !== "undefined") {
  window.BlockDayValidator = BlockDayValidator;
  console.log("✅ BlockDayValidator V3.0 (Algoritma Entegre) yüklendi");
}
