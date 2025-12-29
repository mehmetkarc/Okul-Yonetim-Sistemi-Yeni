/**
 * ============================================
 * BLOCK CONSECUTIVE CHECK V3.0 - ALGORİTMA ENTEGRE (FIXED QUICK VALIDATE)
 * ============================================
 *
 * 🔥 CRITICAL FIX: quickValidate metodu ardışıklık ihlallerini doğru ceza puanıyla hesaplayacak şekilde güncellendi.
 *
 * ✅ GA/SA/ACO/TABU/RL/FUZZY tam entegrasyonu
 * ✅ BlockStructure V3.0 API kullanımı
 * ✅ Blok bütünlüğü kontrolü (Hard Constraint)
 * ✅ Otomatik tamir sistemi
 * ✅ Fragmentation analizi
 * ✅ Algoritma skorlama desteği
 */

class BlockConsecutiveCheck {
  constructor(config = {}) {
    this.config = {
      strictMode: true,
      maxGap: 0,
      autoRepair: true,
      returnPenalty: true, // Algoritmalara ceza skoru döndür
      ...config,
    };

    this.issues = [];
    this.repairs = [];

    this.stats = {
      checked: 0,
      broken: 0,
      repaired: 0,
      irreparable: 0,
      totalPenalty: 0,
    };

    this.DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    // ALGORİTMA CEZA AĞIRLIKLARI
    this.PENALTIES = {
      SIZE_MISMATCH: 10000, // GA/SA için kritik
      NON_CONSECUTIVE: 5000, // GA/SA için yüksek
      INDEX_MISMATCH: 3000, // GA/SA için orta
      FRAGMENTATION: 1000, // GA/SA için düşük
      MISSING_SLOT: 15000, // Tüm algoritmalar için kritik
    };

    console.log("🔗 BlockConsecutiveCheck V3.0 (Algoritma Entegre) başlatıldı");
  }

  // ============================================
  // ANA KONTROL FONKSİYONU (ALGORİTMA UYUMLU)
  // ============================================

  check(schedule, lessons = null) {
    console.log("\n" + "=".repeat(70));
    console.log("🔗 BLOCK CONSECUTIVE CHECK");
    console.log("=".repeat(70));

    this.issues = [];
    this.repairs = [];
    this.stats.totalPenalty = 0;

    // Lesson listesi verilmemişse schedule'dan çıkar
    if (!lessons) {
      lessons = this.extractLessonsFromSchedule(schedule);
    }

    // Sadece bloklu dersleri kontrol et
    const blockLessons = lessons.filter(
      (l) => window.BlockStructure && window.BlockStructure.isBlockLesson(l)
    );

    console.log(`📊 Kontrol edilecek bloklu ders: ${blockLessons.length}\n`);

    for (const lesson of blockLessons) {
      const blockType = window.BlockStructure.getBlockType(lesson);
      const placements = this.getLessonPlacements(schedule, lesson);

      if (placements.length === 0) continue;

      console.log(`🔷 ${lesson.name} (${lesson.className})`);
      console.log(`   Blok: (${blockType.patternString})\n`);

      // Her bloku kontrol et
      for (
        let blockIndex = 0;
        blockIndex < blockType.blockCount;
        blockIndex++
      ) {
        const blockSize = blockType.blockSizes[blockIndex];
        const blockPlacements = placements.filter(
          (p) => p.blockIndex === blockIndex
        );

        this.stats.checked++;

        console.log(`   📍 Blok ${blockIndex + 1}/${blockType.blockCount}:`);

        const integrity = this.checkBlockIntegrity(
          lesson,
          blockPlacements,
          blockSize,
          blockIndex
        );

        if (!integrity.valid) {
          this.issues.push({
            ...integrity,
            lessonId: lesson.id,
            lessonName: lesson.name,
            className: lesson.className,
            blockIndex,
          });
          this.stats.broken++;
          this.stats.totalPenalty += integrity.penalty;

          console.log(`      ❌ Bozuk (ceza: ${integrity.penalty})`);
        } else {
          console.log(`      ✅ TAMAM`);
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 CHECK SONUÇLARI:");
    console.log("=".repeat(70));
    console.log(`   • Kontrol edilen: ${this.stats.checked}`);
    console.log(`   • Bozuk: ${this.stats.broken}`);
    console.log(`   • Toplam ceza: ${this.stats.totalPenalty}`);
    console.log("=".repeat(70) + "\n");

    return {
      valid: this.issues.length === 0,
      issues: this.issues,
      penalty: this.stats.totalPenalty,
      stats: this.stats,
    };
  }

  // ============================================
  // BLOK BÜTÜNLÜK KONTROLÜ (DETAYLI)
  // ============================================

  checkBlockIntegrity(lesson, blockPlacements, expectedSize, blockIndex) {
    const errors = [];
    let totalPenalty = 0;

    // 1. SIZE KONTROLÜ
    if (blockPlacements.length !== expectedSize) {
      const error = {
        type: "SIZE_MISMATCH",
        severity: "CRITICAL",
        expected: expectedSize,
        actual: blockPlacements.length,
        message: `Blok boyutu uyumsuz: beklenen ${expectedSize}, bulunan ${blockPlacements.length}`,
      };
      errors.push(error);
      totalPenalty += this.PENALTIES.SIZE_MISMATCH;

      console.log(
        `      ⚠️ Boyut: ${blockPlacements.length}/${expectedSize} (-${this.PENALTIES.SIZE_MISMATCH})`
      );
    }

    if (blockPlacements.length === 0) {
      const error = {
        type: "MISSING_SLOT",
        severity: "CRITICAL",
        message: "Blok hiç yerleştirilmemiş",
      };
      errors.push(error);
      totalPenalty += this.PENALTIES.MISSING_SLOT;

      return {
        valid: false,
        errors,
        penalty: totalPenalty,
      };
    }

    // 2. ARDIŞIKLIK KONTROLÜ
    const times = blockPlacements.map((p) => p.period).sort((a, b) => a - b);
    const days = blockPlacements.map((p) => p.day);
    const uniqueDays = [...new Set(days)];

    // Farklı günlere dağılmış mı?
    if (uniqueDays.length > 1) {
      const error = {
        type: "NON_CONSECUTIVE",
        severity: "CRITICAL",
        days: uniqueDays,
        message: `Blok farklı günlere dağılmış: ${uniqueDays
          .map((d) => this.DAYS[d])
          .join(", ")}`,
      };
      errors.push(error);
      totalPenalty += this.PENALTIES.NON_CONSECUTIVE;

      console.log(
        `      ⚠️ Farklı günler: ${uniqueDays.map((d) => d + 1).join(", ")} (-${
          this.PENALTIES.NON_CONSECUTIVE
        })`
      );
    } else {
      // Aynı gün içinde ardışık mı?
      for (let i = 1; i < times.length; i++) {
        const gap = times[i] - times[i - 1];

        if (gap !== 1) {
          const error = {
            type: "NON_CONSECUTIVE",
            severity: "HIGH",
            gap: gap - 1,
            between: [times[i - 1], times[i]],
            message: `Ardışık değil: Saat ${times[i - 1] + 1} ile ${
              times[i] + 1
            } arası ${gap - 1} boşluk`,
          };
          errors.push(error);
          totalPenalty += this.PENALTIES.NON_CONSECUTIVE * (gap - 1);

          console.log(
            `      ⚠️ Boşluk: ${times[i - 1] + 1}-${times[i] + 1} (-${
              this.PENALTIES.NON_CONSECUTIVE * (gap - 1)
            })`
          );
        }
      }
    }

    // 3. INDEX SIRASI KONTROLÜ
    const indices = blockPlacements
      .map((p) => p.blockPosition || 0)
      .sort((a, b) => a - b);
    const expectedIndices = Array.from({ length: expectedSize }, (_, i) => i);

    if (JSON.stringify(indices) !== JSON.stringify(expectedIndices)) {
      const error = {
        type: "INDEX_MISMATCH",
        severity: "MEDIUM",
        expected: expectedIndices,
        actual: indices,
        message: "Blok index sırası bozuk",
      };
      errors.push(error);
      totalPenalty += this.PENALTIES.INDEX_MISMATCH;

      console.log(
        `      ⚠️ Index sırası bozuk (-${this.PENALTIES.INDEX_MISMATCH})`
      );
    }

    // 4. FRAGMENTATION ANALİZİ
    if (times.length > 1) {
      const span = times[times.length - 1] - times[0] + 1;
      const fragmentation = (span - times.length) / span;

      if (fragmentation > 0.2) {
        const error = {
          type: "FRAGMENTATION",
          severity: "MEDIUM",
          fragmentation: (fragmentation * 100).toFixed(1) + "%",
          span: span,
          slots: times.length,
          message: `Blok parçalanmış: ${(fragmentation * 100).toFixed(
            1
          )}% boşluk`,
        };
        errors.push(error);
        totalPenalty += Math.floor(
          this.PENALTIES.FRAGMENTATION * fragmentation
        );

        console.log(
          `      ⚠️ Fragmentation: ${(fragmentation * 100).toFixed(
            1
          )}% (-${Math.floor(this.PENALTIES.FRAGMENTATION * fragmentation)})`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      penalty: totalPenalty,
      blockPlacements,
    };
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

    for (const lesson of blockLessons) {
      const blockType = window.BlockStructure.getBlockType(lesson);
      const placements = this.getLessonPlacements(schedule, lesson);

      if (placements.length === 0) continue;

      for (
        let blockIndex = 0;
        blockIndex < blockType.blockCount;
        blockIndex++
      ) {
        const blockSize = blockType.blockSizes[blockIndex];
        const blockPlacements = placements.filter(
          (p) => p.blockIndex === blockIndex
        );

        let blockPenalty = 0;
        let isBroken = false;

        // 1. Hızlı SIZE KONTROLÜ
        if (blockPlacements.length !== blockSize) {
          blockPenalty += this.PENALTIES.SIZE_MISMATCH;
          isBroken = true;
        }

        if (blockPlacements.length === 0) {
          blockPenalty += this.PENALTIES.MISSING_SLOT;
          isBroken = true;
        }

        // 2. Ardışıklık ve Farklı Günler kontrolü
        if (!isBroken) {
          const times = blockPlacements
            .map((p) => p.period)
            .sort((a, b) => a - b);
          const days = blockPlacements.map((p) => p.day);
          const uniqueDays = [...new Set(days)];

          if (uniqueDays.length > 1) {
            // Farklı günlere dağılmış
            blockPenalty += this.PENALTIES.NON_CONSECUTIVE;
            isBroken = true;
          } else {
            // Aynı gün içinde boşluk var mı?
            for (let i = 1; i < times.length; i++) {
              const gap = times[i] - times[i - 1];
              if (gap !== 1) {
                // Gap (boşluk) sayısına göre ceza ekle
                blockPenalty += this.PENALTIES.NON_CONSECUTIVE * (gap - 1);
                isBroken = true;
              }
            }
          }
        }

        // Index sırası bozuk olsa bile bu hard constraint'ler kadar büyük bir ceza değildir.
        // quickValidate'i hız ve en büyük cezalara odaklanmak için sade tutuyoruz.

        if (blockPenalty > 0) {
          totalPenalty += blockPenalty;
          violationCount++;
        }
      }
    }

    return {
      penalty: totalPenalty,
      violationCount,
      valid: violationCount === 0,
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
      const maxPenalty = this.PENALTIES.SIZE_MISMATCH * 10;
      return Math.max(0.1, 1.0 - result.penalty / maxPenalty);
    }
  }

  /**
   * TABU için tabu tenure katkısı
   */
  getTabuTenure(lesson) {
    if (
      !window.BlockStructure ||
      !window.BlockStructure.isBlockLesson(lesson)
    ) {
      return 3; // Normal ders
    }

    const blockType = window.BlockStructure.getBlockType(lesson);

    // Matematik özel kuralı
    if (blockType.specialRule === "MATEMATIK") {
      return 8; // Uzun tenure
    }

    // Blok sayısına göre
    return 3 + blockType.blockCount;
  }

  /**
   * RL için state dimension katkısı
   */
  getStateDimension(lesson) {
    if (
      !window.BlockStructure ||
      !window.BlockStructure.isBlockLesson(lesson)
    ) {
      return 1; // Normal ders
    }

    const blockType = window.BlockStructure.getBlockType(lesson);
    return (
      blockType.blockCount * blockType.blockSizes.reduce((a, b) => a + b, 0)
    );
  }

  /**
   * FUZZY için kompleksite skoru
   */
  getComplexityScore(lesson) {
    if (
      !window.BlockStructure ||
      !window.BlockStructure.isBlockLesson(lesson)
    ) {
      return 10; // Düşük kompleksite
    }

    const blockType = window.BlockStructure.getBlockType(lesson);

    let score = 50; // Orta base

    // Blok sayısı
    score += blockType.blockCount * 15;

    // Özel kural
    if (blockType.specialRule === "MATEMATIK") {
      score += 40; // Çok yüksek
    }

    // Toplam saat
    const totalHours = blockType.blockSizes.reduce((a, b) => a + b, 0);
    score += totalHours * 5;

    return Math.min(score, 150); // Max 150
  }

  // ============================================
  // OTOMATİK TAMİR SİSTEMİ
  // ============================================

  repair(schedule, lessons) {
    if (!this.config.autoRepair) {
      console.log("⚠️ Auto-repair devre dışı");
      return { success: false, message: "Auto-repair disabled" };
    }

    console.log("\n" + "=".repeat(70));
    console.log("🔧 BLOCK CONSECUTIVE REPAIR");
    console.log("=".repeat(70));

    let repairsMade = 0;
    let irreparable = 0;

    for (const issue of this.issues) {
      console.log(
        `\n🔧 Tamir: ${issue.lessonName} - Blok ${issue.blockIndex + 1}`
      );

      const result = this.repairBlock(schedule, issue);

      if (result.success) {
        repairsMade++;
        this.stats.repaired++;
        this.repairs.push(result);
        console.log(`   ✅ Tamir edildi`);
      } else {
        irreparable++;
        this.stats.irreparable++;
        console.log(`   ❌ Tamir edilemedi: ${result.error}`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log(`✅ ${repairsMade} blok tamir edildi`);
    console.log(`❌ ${irreparable} blok tamir edilemedi`);
    console.log("=".repeat(70) + "\n");

    return {
      success: repairsMade > 0,
      repairs: repairsMade,
      irreparable: irreparable,
    };
  }

  repairBlock(schedule, issue) {
    const { lessonId, blockPlacements, blockIndex } = issue;

    if (!blockPlacements || blockPlacements.length === 0) {
      return { success: false, error: "No placements to repair" };
    }

    const classId = blockPlacements[0].classId;
    const day = blockPlacements[0].day;

    // Mevcut slotları temizle
    for (const placement of blockPlacements) {
      // Varsayım: schedule.removeLesson metodu, classId, day ve period'u alıyor
      schedule.removeLesson(classId, placement.day, placement.period);
    }

    // Yeni ardışık yer bul
    const blockSize = blockPlacements.length;
    const newStart = this.findConsecutiveSpace(
      schedule,
      classId,
      day,
      blockSize
    );

    if (newStart === null) {
      // Başka gün dene
      for (let d = 0; d < 5; d++) {
        if (d === day) continue;

        const newStart2 = this.findConsecutiveSpace(
          schedule,
          classId,
          d,
          blockSize
        );
        if (newStart2 !== null) {
          // Yerleştir
          for (let i = 0; i < blockSize; i++) {
            const placement = blockPlacements[i];
            // Varsayım: schedule.placeLesson metodu, classId, lessonId, teacherId, day, period ve metadata alıyor
            schedule.placeLesson(
              classId,
              lessonId,
              placement.teacherId,
              d,
              newStart2 + i,
              {
                blockIndex: blockIndex,
                blockSize: blockSize,
                blockPosition: i,
              }
            );
          }

          return {
            success: true,
            from: { day, slots: blockPlacements.map((p) => p.period) },
            to: { day: d, startPeriod: newStart2 },
          };
        }
      }

      // Geri koy (başarısız)
      for (const placement of blockPlacements) {
        schedule.placeLesson(
          classId,
          lessonId,
          placement.teacherId,
          placement.day,
          placement.period,
          {
            blockIndex: blockIndex,
            blockSize: blockSize,
            blockPosition: placement.blockPosition || 0,
          }
        );
      }

      return { success: false, error: "No consecutive space found" };
    }

    // Yeni yere yerleştir (Aynı gün)
    for (let i = 0; i < blockSize; i++) {
      const placement = blockPlacements[i];
      schedule.placeLesson(
        classId,
        lessonId,
        placement.teacherId,
        day,
        newStart + i,
        {
          blockIndex: blockIndex,
          blockSize: blockSize,
          blockPosition: i,
        }
      );
    }

    return {
      success: true,
      from: { day, slots: blockPlacements.map((p) => p.period) },
      to: { day, startPeriod: newStart },
    };
  }

  findConsecutiveSpace(schedule, classId, day, size) {
    // Toplam 8 ders saati varsayımıyla (0'dan 7'ye)
    for (let startPeriod = 0; startPeriod <= 8 - size; startPeriod++) {
      let allEmpty = true;

      for (let i = 0; i < size; i++) {
        // Varsayım: schedule.isSlotOccupied metodu, classId, day ve period'u alıyor
        if (schedule.isSlotOccupied(classId, day, startPeriod + i)) {
          allEmpty = false;
          break;
        }
      }

      if (allEmpty) {
        return startPeriod;
      }
    }

    return null;
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

      // Toplam 8 ders saati varsayımıyla (0'dan 7'ye)
      for (let period = 0; period < 8; period++) {
        const slot = daySchedule[period];

        if (slot && slot.lessonId === lesson.id) {
          placements.push({
            classId: lesson.classId,
            day,
            period,
            blockIndex: slot.metadata?.blockIndex ?? 0,
            blockSize: slot.metadata?.blockSize ?? 1,
            blockPosition: slot.metadata?.blockPosition ?? 0,
            teacherId: slot.teacherId,
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

  extractLessonsFromSchedule(schedule) {
    const lessonsMap = new Map();

    if (!schedule.data) return [];

    for (const classId in schedule.data) {
      for (let day = 0; day < 5; day++) {
        const daySchedule = schedule.data[classId][day];
        if (!daySchedule) continue;

        for (let period = 0; period < 8; period++) {
          const slot = daySchedule[period];

          if (slot && slot.lessonId) {
            if (!lessonsMap.has(slot.lessonId)) {
              lessonsMap.set(slot.lessonId, {
                id: slot.lessonId,
                classId: classId,
                teacherId: slot.teacherId,
                name: slot.lessonName || "Unknown",
                // Bu metotta subjectName alınamıyor, ancak validate'te lesson.name kullanılıyor.
                // Eğer lesson objelerinde subjectName varsa, buraya subjectName: slot.subjectName || "Unknown" eklenmelidir.
                hoursPerWeek: 0,
              });
            }
            lessonsMap.get(slot.lessonId).hoursPerWeek++;
          }
        }
      }
    }

    return Array.from(lessonsMap.values());
  }

  // ============================================
  // İSTATİSTİKLER
  // ============================================

  getStats() {
    return { ...this.stats };
  }

  clear() {
    this.issues = [];
    this.repairs = [];
    this.stats = {
      checked: 0,
      broken: 0,
      repaired: 0,
      irreparable: 0,
      totalPenalty: 0,
    };
  }

  printReport() {
    console.log("\n🔗 BLOCK CONSECUTIVE CHECK RAPORU");
    console.log("=".repeat(60));
    console.log(`  • Kontrol edilen: ${this.stats.checked}`);
    console.log(`  • Bozuk: ${this.stats.broken}`);
    console.log(`  • Tamir edilen: ${this.stats.repaired}`);
    console.log(`  • Tamir edilemeyen: ${this.stats.irreparable}`);
    console.log(`  • Toplam ceza: ${this.stats.totalPenalty}`);
    console.log("=".repeat(60) + "\n");
  }
}

// ============================================
// GLOBAL EXPORT
// ============================================

if (typeof window !== "undefined") {
  window.BlockConsecutiveCheck = BlockConsecutiveCheck;
  console.log("✅ BlockConsecutiveCheck V3.0 (Algoritma Entegre) yüklendi");
}
