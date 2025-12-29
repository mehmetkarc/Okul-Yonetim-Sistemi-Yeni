/**
 * ============================================
 * BLOCK STRUCTURE V3.0 - KOMPLE ENTEGRE (HATA DÜZELTME)
 * ============================================
 *
 * 🔥 CRITICAL FIX: isBlockLesson metodu, gelen ders objesi formatına göre düzeltildi.
 * 🔥 CRITICAL FIX: getBlockType metodu, doğru pattern kaynağını kullanacak şekilde düzeltildi.
 *
 * ✅ GA, SA, ACO, Tabu, RL, Fuzzy entegrasyonu
 */

class BlockStructure {
  constructor() {
    this.blocks = new Map(); // blockId -> block info
    this.lessonBlocks = new Map(); // lessonId -> [blockIds]
    this.blockTypes = this.initializeBlockTypes();

    this.stats = {
      totalBlocks: 0,
      validBlocks: 0,
      invalidBlocks: 0,
      splitBlocks: 0,
      mergedBlocks: 0,
      consecutiveBlocks: 0,
      distributedBlocks: 0,
    };

    console.log("📦 BlockStructure V3.0 başlatıldı");
  }

  // ============================================
  // BLOK TÜRLERİ TANIMI
  // ============================================

  initializeBlockTypes() {
    return {
      // TEK SAATLIK BLOKLAR
      SINGLE: {
        pattern: [1],
        type: "CONSECUTIVE",
        rule: "Tek saatlik ders, tek slot",
        mustBeSameDay: false,
        canSplit: false,
        examples: ["Rehberlik (1)", "Seçmeli Ders (1)"],
      },

      // İKİ SAATLIK TEK BLOK
      DOUBLE_CONSECUTIVE: {
        pattern: [2],
        type: "CONSECUTIVE",
        rule: "İki saatlik ders, arka arkaya, aynı gün",
        mustBeSameDay: true,
        mustBeConsecutive: true,
        canSplit: false,
        examples: ["Tarih (2)", "Fizik (2)", "Kimya (2)"],
      },

      // İKİ BLOK (2-1)
      TWO_PLUS_ONE: {
        pattern: [2, 1],
        type: "DISTRIBUTED",
        rule: "İlk blok 2 saat arka arkaya, ikinci blok 1 saat, farklı günler",
        mustBeSameDay: false,
        mustBeConsecutive: true, // Her blok kendi içinde arka arkaya
        blockCount: 2,
        blockSizes: [2, 1],
        canSplit: false,
        examples: ["Türk Dili ve Edebiyatı (2-1)"],
      },

      // İKİ BLOK (2-2)
      TWO_PLUS_TWO: {
        pattern: [2, 2],
        type: "DISTRIBUTED",
        rule: "İki blok, her biri 2 saat arka arkaya, farklı günler",
        mustBeSameDay: false,
        mustBeConsecutive: true,
        blockCount: 2,
        blockSizes: [2, 2],
        canSplit: false,
        examples: ["İngilizce (2-2)"],
      },

      // ÜÇ BLOK (2-2-1)
      TWO_TWO_ONE: {
        pattern: [2, 2, 1],
        type: "DISTRIBUTED",
        rule: "Üç blok, ilk iki blok 2 saat, son blok 1 saat, farklı günler",
        mustBeSameDay: false,
        mustBeConsecutive: true,
        blockCount: 3,
        blockSizes: [2, 2, 1],
        canSplit: false,
        examples: ["Türk Dili ve Edebiyatı (2-2-1)"],
      },

      // ÜÇ BLOK (2-2-2) - MATEMATİK ÖZEL
      TWO_TWO_TWO: {
        pattern: [2, 2, 2],
        type: "DISTRIBUTED",
        rule: "ÜÇ BLOK, her biri 2 saat arka arkaya, FARKLI GÜNLER, ASLA ARKA ARKAYA DEĞİL",
        mustBeSameDay: false,
        mustBeConsecutive: true,
        blockCount: 3,
        blockSizes: [2, 2, 2],
        canSplit: false,
        minDaysBetween: 1, // En az 1 gün ara olmalı
        specialRule: "MATEMATIK",
        examples: ["Matematik (2-2-2)"],
      },

      // İKİ BLOK (2-3)
      TWO_PLUS_THREE: {
        pattern: [2, 3],
        type: "DISTRIBUTED",
        rule: "İki blok, ilk blok 2 saat, ikinci blok 3 saat, farklı günler",
        mustBeSameDay: false,
        mustBeConsecutive: true,
        blockCount: 2,
        blockSizes: [2, 3],
        canSplit: false,
        examples: ["Edebiyat (2-3)"],
      },

      // ÜÇ BLOK (4-4-2)
      FOUR_FOUR_TWO: {
        pattern: [4, 4, 2],
        type: "DISTRIBUTED",
        rule: "Üç blok, ilk iki blok 4 saat, son blok 2 saat, farklı günler",
        mustBeSameDay: false,
        mustBeConsecutive: true,
        blockCount: 3,
        blockSizes: [4, 4, 2],
        canSplit: false,
        examples: ["Meslek Dersi (4-4-2)"],
      },

      // ÜÇ BLOK (3-3-4)
      THREE_THREE_FOUR: {
        pattern: [3, 3, 4],
        type: "DISTRIBUTED",
        rule: "Üç blok, ilk iki blok 3 saat, son blok 4 saat, farklı günler",
        mustBeSameDay: false,
        mustBeConsecutive: true,
        blockCount: 3,
        blockSizes: [3, 3, 4],
        canSplit: false,
        examples: ["Teknik Ders (3-3-4)"],
      },

      // ÜÇ BLOK (4-4-4)
      FOUR_FOUR_FOUR: {
        pattern: [4, 4, 4],
        type: "DISTRIBUTED",
        rule: "Üç blok, her biri 4 saat, farklı günler",
        mustBeSameDay: false,
        mustBeConsecutive: true,
        blockCount: 3,
        blockSizes: [4, 4, 4],
        canSplit: false,
        examples: ["Meslek Dersi (4-4-4)"],
      },
    };
  }

  // ============================================
  // GLOBAL API - ALGORİTMALAR İÇİN
  // ============================================

  /**
   * Dersin blok yapısını tespit et
   * @param {Object} lesson - data-adapter.js'ten gelen lesson objesi
   * @returns {Object} Blok bilgisi
   */
  static isBlockLesson(lesson) {
    if (!lesson) return false;

    // 🔥 KRİTİK DÜZELTME: lesson.blockStructure'ın kendisinin dizi olup
    // ve birden fazla parçaya sahip olup olmadığını kontrol et (2+2+2, 2+2 gibi)
    return (
      lesson.blockStructure &&
      Array.isArray(lesson.blockStructure) &&
      lesson.blockStructure.length > 1
    );
  }

  /**
   * Blok türünü belirle
   * @param {Object} lesson
   * @returns {Object} Blok türü detayları
   */
  static getBlockType(lesson) {
    const bsInstance = new BlockStructure();

    // Tek parçalı bloklar için özel durum (isBlockLesson false döner)
    if (
      !this.isBlockLesson(lesson) &&
      lesson.blockStructure &&
      Array.isArray(lesson.blockStructure) &&
      lesson.blockStructure.length === 1
    ) {
      const singleBlockPattern = lesson.blockStructure.join("-");
      if (singleBlockPattern === "2") {
        return bsInstance.blockTypes.DOUBLE_CONSECUTIVE;
      }
      if (singleBlockPattern === "1") {
        return bsInstance.blockTypes.SINGLE;
      }
    }

    if (!this.isBlockLesson(lesson)) {
      return null; // Birden fazla parçaya ayrılmamış ve tek parçalı özel duruma uymuyor
    }

    // 🔥 KRİTİK DÜZELTME: pattern kaynağı sadece lesson.blockStructure olmalı
    const pattern = lesson.blockStructure;
    const patternStr = pattern.join("-");

    // Pattern'i blockTypes'da ara
    for (const [key, type] of Object.entries(bsInstance.blockTypes)) {
      if (type.pattern.join("-") === patternStr) {
        return {
          key,
          ...type,
          totalHours: pattern.reduce((sum, h) => sum + h, 0),
          patternString: patternStr,
        };
      }
    }

    // Bulunamadıysa generic döndür
    return {
      key: "CUSTOM",
      pattern,
      type: pattern.length === 1 ? "CONSECUTIVE" : "DISTRIBUTED",
      rule: "Özel blok yapısı",
      mustBeSameDay: pattern.length === 1,
      mustBeConsecutive: true,
      blockCount: pattern.length,
      blockSizes: pattern,
      canSplit: false,
      totalHours: pattern.reduce((sum, h) => sum + h, 0),
      patternString: patternStr,
    };
  }

  /**
   * Toplam blok sayısı
   */
  static getBlockCount(lesson) {
    if (!this.isBlockLesson(lesson)) return 0;
    // 🔥 DÜZELTME
    return lesson.blockStructure.length;
  }

  /**
   * Belirli bir blok indeksinin boyutu
   */
  static getBlockSize(lesson, blockIndex) {
    if (!this.isBlockLesson(lesson)) return 0;
    // 🔥 DÜZELTME
    return lesson.blockStructure[blockIndex] || 0;
  }

  /**
   * Toplam haftalık saat
   */
  static getTotalHours(lesson) {
    if (lesson.blockStructure && Array.isArray(lesson.blockStructure)) {
      return lesson.blockStructure.reduce((sum, h) => sum + h, 0);
    }
    return lesson.hoursPerWeek || 0;
  }

  /**
   * Blok yerleştirme validasyonu
   * @param {Object} schedule - Mevcut program
   * @param {Object} lesson - Ders
   * @param {Number} day - Gün (0-4)
   * @param {Number} startPeriod - Başlangıç saati (0-7)
   * @param {Number} blockIndex - Hangi blok yerleştirilecek
   * @returns {Object} Validasyon sonucu
   */
  static validateBlockPlacement(
    schedule,
    lesson,
    day,
    startPeriod,
    blockIndex
  ) {
    const blockType = this.getBlockType(lesson);
    if (!blockType) {
      return { valid: false, reason: "Blok yapısı bulunamadı" };
    }

    const blockSize = blockType.blockSizes[blockIndex];
    const errors = [];

    // 1. ARDIŞIK KONTROL (Her blok kendi içinde arka arkaya olmalı)
    if (blockType.mustBeConsecutive) {
      // Tüm slotlar boş mu?
      for (let i = 0; i < blockSize; i++) {
        const period = startPeriod + i;

        if (period > 7) {
          errors.push(
            `Saat aralığı geçersiz: ${startPeriod + 1}-${period + 1} (max 8)`
          );
          break;
        }

        if (schedule.isSlotOccupied(lesson.classId, day, period)) {
          errors.push(`Slot dolu: Gün ${day + 1}, Saat ${period + 1}`);
          break;
        }
      }
    }

    // 2. MATEMATİK ÖZEL KURAL (2-2-2)
    if (blockType.specialRule === "MATEMATIK") {
      // Aynı gün kontrolü
      const usedDays = this.getUsedDaysForLesson(schedule, lesson);
      if (usedDays.includes(day)) {
        errors.push(
          `Matematik kuralı ihlali: Bu gün zaten kullanılmış (Gün ${day + 1})`
        );
      }

      // Ardışık gün kontrolü (en az 1 gün ara)
      if (usedDays.length > 0) {
        // Bu kural, yerleştirilen yeni gün ile diğer tüm kullanılan günler arasındaki farkı kontrol etmeli
        const isConsecutiveDay = usedDays.some(
          (usedDay) => Math.abs(day - usedDay) <= blockType.minDaysBetween
        );

        if (isConsecutiveDay) {
          errors.push(
            `Matematik kuralı ihlali: Bloklar arasında en az ${
              blockType.minDaysBetween + 1
            } gün ara olmalı`
          );
        }
      }
    }

    // 3. ÖĞRETMEN MÜSAİTLİK
    for (let i = 0; i < blockSize; i++) {
      const period = startPeriod + i;

      if (schedule.isTeacherBusy) {
        if (schedule.isTeacherBusy(lesson.teacherId, day, period)) {
          errors.push(
            `Öğretmen meşgul: ${lesson.teacherName}, Gün ${day + 1}, Saat ${
              period + 1
            }`
          );
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      blockType,
      blockSize,
      blockIndex,
    };
  }

  /**
   * Ders için kullanılmış günleri bul
   */
  static getUsedDaysForLesson(schedule, lesson) {
    const usedDays = [];

    if (!schedule || !schedule.data) return usedDays;

    const classSchedule = schedule.data[lesson.classId];
    if (!classSchedule) return usedDays;

    for (let day = 0; day < 5; day++) {
      const daySchedule = classSchedule[day];
      if (!daySchedule) continue;

      for (let period = 0; period < 8; period++) {
        const slot = daySchedule[period];
        if (slot && slot.lessonId === lesson.id) {
          if (!usedDays.includes(day)) {
            usedDays.push(day);
          }
        }
      }
    }

    return usedDays;
  }

  /**
   * Blok için en uygun gün bul
   * @param {Object} schedule
   * @param {Object} lesson
   * @param {Number} blockIndex
   * @returns {Array} [day, startPeriod] veya null
   */
  static findBestSlotForBlock(schedule, lesson, blockIndex) {
    const blockType = this.getBlockType(lesson);
    if (!blockType) return null;

    const blockSize = blockType.blockSizes[blockIndex];
    const usedDays = this.getUsedDaysForLesson(schedule, lesson);

    // Tüm günleri ve saatleri dene
    for (let day = 0; day < 5; day++) {
      // Matematik kuralı: Kullanılmış günleri atla ve ardışık gün kontrolü
      if (blockType.specialRule === "MATEMATIK") {
        if (usedDays.includes(day)) {
          continue; // Aynı gün kullanılamaz
        }

        // Ardışık gün kontrolü
        const isConsecutiveDay = usedDays.some(
          (usedDay) => Math.abs(day - usedDay) <= blockType.minDaysBetween
        );
        if (isConsecutiveDay) {
          continue; // En az 1 gün ara olmalı kuralı ihlal ediliyor
        }
      }

      for (let startPeriod = 0; startPeriod <= 8 - blockSize; startPeriod++) {
        const validation = this.validateBlockPlacement(
          schedule,
          lesson,
          day,
          startPeriod,
          blockIndex
        );

        if (validation.valid) {
          return { day, startPeriod, blockSize };
        }
      }
    }

    return null; // Uygun slot yok
  }

  /**
   * Bloku schedule'a yerleştir
   */
  static placeBlock(schedule, lesson, day, startPeriod, blockSize) {
    for (let i = 0; i < blockSize; i++) {
      const period = startPeriod + i;
      // Düzgün bir placeLesson metodu varsa, tüm lesson objesini göndermek daha iyidir
      // Burada geriye dönük uyumluluk için eski form bırakıldı.
      schedule.placeLesson(
        lesson.classId,
        lesson.id,
        lesson.teacherId,
        day,
        period
      );
    }
  }

  // ============================================
  // GA/SA/ACO/TABU/RL/FUZZY ENTEGRASYONu
  // ============================================

  /**
   * Algoritmalara blok bilgisi sağla
   * @param {Object} lesson
   * @returns {Object} Algoritma için optimize edilmiş blok bilgisi
   */
  static getBlockInfoForAlgorithm(lesson) {
    const blockType = this.getBlockType(lesson);

    if (!blockType) {
      return {
        isBlock: false,
        type: "SINGLE",
        canSwap: true,
        canMove: true,
        mustKeepTogether: false,
      };
    }

    // Tek bloklu dersler (pattern: [2] gibi) algoritma için "basit" sayılabilir.
    // Ancak arka arkaya olma kuralı korunur.
    const isMultiBlock = this.isBlockLesson(lesson);

    return {
      isBlock: isMultiBlock,
      type: blockType.type,
      pattern: blockType.pattern,
      patternString: blockType.patternString,
      blockCount:
        blockType.blockCount ||
        (blockType.pattern ? blockType.pattern.length : 1),
      blockSizes: blockType.blockSizes || blockType.pattern,
      totalHours: blockType.totalHours,

      // Algoritma kuralları
      canSwap: isMultiBlock, // Çoklu bloklar (2-2-2) swap edilebilir
      canMove: true,
      mustKeepTogether: blockType.mustBeConsecutive,
      mustBeSameDay: blockType.mustBeSameDay,
      minDaysBetween: blockType.minDaysBetween || 0,

      // Özel kurallar
      specialRule: blockType.specialRule,

      // Mutasyon ağırlıkları (GA/SA için)
      mutationWeight: this.calculateMutationWeight(blockType),
      swapPenalty: this.calculateSwapPenalty(blockType),

      // Tabu Search için
      tabuTenure: (blockType.blockCount || 1) * 2,

      // ACO için
      pheromoneFactor: 1.0 / (blockType.blockCount || 1),

      // RL için
      stateDimension: (blockType.blockCount || 1) * 5 * 8,

      // Fuzzy Logic için
      complexityScore: this.calculateComplexityScore(blockType),
    };
  }

  /**
   * Mutasyon ağırlığı hesapla (GA için)
   */
  static calculateMutationWeight(blockType) {
    if (blockType.type === "CONSECUTIVE") {
      return 1.0; // Tek bloklar kolay mute edilir
    }

    // Distributed bloklar için blok sayısına göre
    const blockCount = blockType.blockCount || 1;
    return 1.0 / (blockCount * blockCount);
  }

  /**
   * Swap cezası hesapla (SA için)
   */
  static calculateSwapPenalty(blockType) {
    if (blockType.type === "CONSECUTIVE") {
      return 1; // Düşük ceza
    }

    // Özel kurallar varsa yüksek ceza
    if (blockType.specialRule === "MATEMATIK") {
      return 1000; // Matematik bloklarını swaplamak çok zor!
    }

    const blockCount = blockType.blockCount || 1;
    return blockCount * 10; // Blok sayısı arttıkça ceza artar
  }

  /**
   * Karmaşıklık skoru hesapla (Fuzzy Logic için)
   */
  static calculateComplexityScore(blockType) {
    let score = 0;
    const blockCount = blockType.blockCount || 1;

    // Blok sayısı
    score += blockCount * 10;

    // Toplam saat
    score += blockType.totalHours * 2;

    // Özel kurallar
    if (blockType.specialRule) {
      score += 50;
    }

    // Minimum gün ara kuralı
    if (blockType.minDaysBetween) {
      score += blockType.minDaysBetween * 20;
    }

    return score;
  }

  /**
   * Blok swap validasyonu (Tüm algoritmalar için)
   */
  static canSwapBlocks(
    schedule,
    lesson1,
    lesson2,
    day1,
    period1,
    day2,
    period2
  ) {
    // İki ders de blok mu?
    const block1 = this.isBlockLesson(lesson1);
    const block2 = this.isBlockLesson(lesson2);

    // İkisi de bloksuz → swap OK
    if (!block1 && !block2) {
      return { valid: true };
    }

    // Birisi bloklu, birisi bloksuz → ASLA swap etme
    if (block1 !== block2) {
      return {
        valid: false,
        reason: "Bloklu ve bloksuz dersler swap edilemez",
      };
    }

    // İkisi de bloklu → boyut kontrolü
    const type1 = this.getBlockType(lesson1);
    const type2 = this.getBlockType(lesson2);

    if (type1.totalHours !== type2.totalHours) {
      return {
        valid: false,
        reason: `Farklı boyutlu bloklar swap edilemez (${type1.totalHours} vs ${type2.totalHours})`,
      };
    }

    // Matematik özel kuralı
    if (
      type1.specialRule === "MATEMATIK" ||
      type2.specialRule === "MATEMATIK"
    ) {
      return {
        valid: false,
        reason: "Matematik blokları swap edilemez (özel kural)",
      };
    }

    return { valid: true };
  }

  // ============================================
  // ANALİZ VE RAPORLAMA
  // ============================================

  static analyzeBlockDistribution(lessons) {
    const distribution = {
      total: lessons.length,
      blockLessons: 0,
      nonBlockLessons: 0,
      byType: {},
      byPattern: {},
      totalHours: 0,
      blockHours: 0,
    };

    for (const lesson of lessons) {
      distribution.totalHours += lesson.hoursPerWeek || 0;

      if (this.isBlockLesson(lesson)) {
        distribution.blockLessons++;

        const blockType = this.getBlockType(lesson);
        if (blockType) {
          const key = blockType.key;
          const pattern = blockType.patternString;

          distribution.byType[key] = (distribution.byType[key] || 0) + 1;
          distribution.byPattern[pattern] =
            (distribution.byPattern[pattern] || 0) + 1;
          distribution.blockHours += blockType.totalHours;
        }
      } else {
        distribution.nonBlockLessons++;
      }
    }

    return distribution;
  }

  static printBlockReport(lessons) {
    const dist = this.analyzeBlockDistribution(lessons);

    console.log("\n📦 BLOK DAĞITIM RAPORU");
    console.log("=".repeat(60));
    console.log(`📊 Toplam Ders: ${dist.total}`);
    console.log(
      `📦 Bloklu Ders: ${dist.blockLessons} (${(
        (dist.blockLessons / dist.total) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`🔢 Bloksuz Ders: ${dist.nonBlockLessons}`);
    console.log(`⏰ Toplam Saat: ${dist.totalHours}`);
    console.log(`📦 Blok Saati: ${dist.blockHours}`);
    console.log("");
    console.log("📋 Blok Türleri:");

    for (const [type, count] of Object.entries(dist.byType)) {
      console.log(`   • ${type}: ${count} ders`);
    }

    console.log("");
    console.log("🔢 Blok Yapıları:");

    for (const [pattern, count] of Object.entries(dist.byPattern)) {
      console.log(`   • (${pattern}): ${count} ders`);
    }

    console.log("=".repeat(60) + "\n");
  }

  // ============================================
  // ESKİ METODLAR (Geriye Uyumluluk)
  // ============================================

  defineBlock(lesson, blockSize = 1, config = {}) {
    const blockId = this.generateBlockId();

    const block = {
      id: blockId,
      lessonId: lesson.id,
      size: blockSize,
      minSize: config.minSize || 1,
      maxSize: config.maxSize || blockSize,
      flexible: config.flexible || false,
      consecutive: config.consecutive !== false,
      sameDay: config.sameDay !== false,
      metadata: {
        subjectName: lesson.subjectName || lesson.name,
        className: lesson.className,
        teacherId: lesson.teacherId,
        ...config.metadata,
      },
      created: Date.now(),
    };

    this.blocks.set(blockId, block);

    if (!this.lessonBlocks.has(lesson.id)) {
      this.lessonBlocks.set(lesson.id, []);
    }
    this.lessonBlocks.get(lesson.id).push(blockId);

    this.stats.totalBlocks++;

    return block;
  }

  generateBlockId() {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getBlock(blockId) {
    return this.blocks.get(blockId);
  }

  getAllBlocks() {
    return Array.from(this.blocks.values());
  }

  clear() {
    this.blocks.clear();
    this.lessonBlocks.clear();
    this.stats = {
      totalBlocks: 0,
      validBlocks: 0,
      invalidBlocks: 0,
      splitBlocks: 0,
      mergedBlocks: 0,
      consecutiveBlocks: 0,
      distributedBlocks: 0,
    };

    console.log("🧹 Block structure cleared");
  }
}

// ============================================
// GLOBAL EXPORT
// ============================================

if (typeof window !== "undefined") {
  window.BlockStructure = BlockStructure;
  console.log("✅ BlockStructure V3.0 (FIXED) yüklendi");
  console.log("🏗️ BlockStructure global erişim aktif!");
  console.log("🔗 GA, SA, ACO, Tabu, RL, Fuzzy entegrasyonu hazır!");
}

// ESKİ VERSİYON UYUMLULUĞU
window.BlockStructure = BlockStructure;
