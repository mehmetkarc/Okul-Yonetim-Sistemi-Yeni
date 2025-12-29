/**
 * ============================================
 * BLOCK PLACEMENT CONTROLLER V3.1 - ALGORİTMA ENTEGRE (Düzeltilmiş)
 * ============================================
 *
 * ✅ GA/SA/ACO/TABU/RL/FUZZY tam entegrasyonu (Dinamik parametreler)
 * ✅ BlockStructure V3.0 API kullanımı (Uyumluluk Kontrolü)
 * ✅ Matematik özel kuralı: (2-2-2) → 3 blok, farklı günler, min 1 gün ara
 * ✅ Tarih özel kuralı: (2) → tek blok, arka arkaya, asla bölünmez (Blok yapısı tarafından yönetiliyor)
 * ✅ Öğretmen kısıtları (kapalı saatler, boş gün, tercihler)
 * ✅ Manuel yerleştirme kilitleme (Geliştirilmiş yönetim)
 * ✅ Çoklu öğretmen desteği (Constraint/Preference Manager ile entegre)
 * ✅ Algoritma skorlama ve optimizasyon desteği
 */

class BlockPlacementController {
  constructor(config = {}) {
    this.config = {
      preferMorning: true,
      avoidLastHour: true,
      allowSplit: false, // Blok derslerde genellikle false olmalı
      maxBlockSize: 4,
      respectConstraints: true,
      respectPreferences: true,
      enableAlgorithmOptimization: true,
      ...config,
    };

    // Harita ve Kümeler, yerleştirme takibi için daha güvenilir
    this.placements = new Map();
    this.conflictCache = new Map();
    this.lockedSlots = new Set();
    this.placementHistory = [];

    this.stats = {
      attempted: 0,
      successful: 0,
      failed: 0,
      split: 0,
      blocked: 0,
      matematikPlaced: 0,
      tarihPlaced: 0,
      optimizations: 0,
      algorithmCalls: 0,
    };

    this.DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    this.MAX_PERIODS = 8; // Bir gündeki maksimum ders saati

    // ALGORİTMA SKORLAMA AĞIRLIKLARI
    this.WEIGHTS = {
      MORNING_BONUS: 40,
      DAY_BALANCE: 30,
      GAP_PENALTY: 15,
      TEACHER_PREFERENCE: 20,
      TEACHER_LOAD: 10,
      WEEK_DISTRIBUTION: 15,
      SPECIAL_RULE_BONUS: 50, // Özel kuralı başarılı uygulama bonusu
    };

    // ALGORİTMA ÖZGÜ PARAMETRELER
    this.ALGORITHM_PARAMS = {
      GA: {
        mutationWeight: 0.15,
        crossoverWeight: 0.8,
      },
      SA: {
        temperatureFactor: 0.95,
        coolingRate: 0.98,
      },
      ACO: {
        pheromoneFactor: 0.7,
        evaporationRate: 0.1,
      },
      TABU: {
        tenureBase: 5,
        tenureMultiplier: 1.5,
      },
      RL: {
        learningRate: 0.1,
        discountFactor: 0.9,
      },
      FUZZY: {
        complexityThreshold: 80,
        uncertaintyFactor: 0.3,
      },
    };

    console.log(
      "🎯 BlockPlacementController V3.1 (Algoritma Entegre) başlatıldı"
    );
  }

  // ============================================
  // TÜM BLOKLARI YERLEŞTİR (ANA FONKSİYON)
  // ============================================

  async placeAllBlocks(lessons, schedule, data) {
    console.log("\n" + "=".repeat(70));
    console.log("📦 TÜM BLOK DERSLERİ YERLEŞTİRİLİYOR");
    console.log("=".repeat(70));

    // BlockStructure'ın varlığını kontrol et
    if (typeof window.BlockStructure === "undefined") {
      console.error(
        "❌ HATA: BlockStructure V3.0 API yüklenmemiş! Yerleştirme iptal edildi."
      );
      return { placed: 0, failed: lessons.length, hours: 0, success: false };
    }

    let totalPlaced = 0;
    let totalFailed = 0;
    let totalHours = 0;

    const blockLessons = lessons.filter((l) =>
      window.BlockStructure.isBlockLesson(l)
    );

    console.log(`\n📊 Toplam bloklu ders sayısı: ${blockLessons.length}`);

    // Dersleri zorluk skoruna göre sırala (önce zor olanlar)
    const sortedLessons = this.sortLessonsByComplexity(blockLessons);

    for (const lesson of sortedLessons) {
      this.stats.attempted++;

      const blockType = window.BlockStructure.getBlockType(lesson);

      console.log("\n" + "-".repeat(70));
      console.log(`🔷 DERS: ${lesson.name} (${lesson.className})`);
      console.log(`   📦 Blok yapısı: (${blockType.patternString})`);
      console.log(`   🔢 Blok sayısı: ${blockType.blockCount}`);
      console.log(`   ⏱️  Haftalık saat: ${lesson.hoursPerWeek}`);
      console.log(`   🎲 Kompleksite: ${this.getComplexityScore(lesson)}`);

      if (blockType.specialRule) {
        console.log(`   ⭐ Özel kural: ${blockType.specialRule}`);
      }

      const usedDays = new Set();
      let lessonFailed = false;

      // Her bloku yerleştir
      for (
        let blockIndex = 0;
        blockIndex < blockType.blockCount;
        blockIndex++
      ) {
        if (lessonFailed) break; // Önceki blok başarısızsa devam etme

        const blockSize = blockType.blockSizes[blockIndex];

        console.log(
          `\n   📍 Blok ${blockIndex + 1}/${
            blockType.blockCount
          } (${blockSize} saat):`
        );

        // En uygun slotu bul (algoritma-aware)
        const bestSlot = this.findBestSlotForBlock(
          schedule,
          lesson,
          blockIndex,
          blockType,
          usedDays
        );

        if (bestSlot) {
          const placed = this.placeBlockToSchedule(
            schedule,
            lesson,
            bestSlot.day,
            bestSlot.startPeriod,
            blockSize,
            blockIndex
          );

          if (placed) {
            usedDays.add(bestSlot.day);
            totalPlaced++;
            totalHours += blockSize;
            this.stats.successful++;

            // İstatistik güncelle
            if (blockType.specialRule === "MATEMATIK") {
              this.stats.matematikPlaced++;
            } else if (blockType.specialRule === "TARIH") {
              this.stats.tarihPlaced++;
            } else if (lesson.name.toLowerCase().includes("tarih")) {
              // Geriye dönük uyumluluk için, kural yoksa isimden yakala
              this.stats.tarihPlaced++;
            }

            // Placement history kaydet (algoritma için)
            this.recordPlacement(lesson, blockIndex, bestSlot, blockSize);

            console.log(
              `      ✅ YERLEŞTİ: ${this.DAYS[bestSlot.day]} ${
                bestSlot.startPeriod + 1
              }-${bestSlot.startPeriod + blockSize}`
            );
            console.log(`      📊 Skor: ${bestSlot.score.toFixed(1)}`);
            console.log(
              `      🎯 Kalite: ${this.getPlacementQuality(bestSlot.score)}`
            );
          } else {
            totalFailed++;
            this.stats.failed++;
            lessonFailed = true;
            console.log(`      ❌ YERLEŞTİRİLEMEDİ (placement hatası)`);
          }
        } else {
          totalFailed++;
          this.stats.failed++;
          lessonFailed = true;
          console.log(`      ❌ UYGUN SLOT BULUNAMADI`);
        }
      }
    }

    // Genel istatistik güncellemesi: attempted, successful, failed, totalHours
    // Bu istatistikler döngü içinde güncellendi.

    console.log("\n" + "=".repeat(70));
    console.log("📊 YERLEŞTİRME SONUÇLARI:");
    console.log("=".repeat(70));
    console.log(`   ✅ Başarılı blok: ${totalPlaced}`);
    console.log(`   ❌ Başarısız blok: ${totalFailed}`);
    console.log(`   ⏱️  Toplam saat: ${totalHours}`);
    console.log(`   📐 Matematik blok: ${this.stats.matematikPlaced}`);
    console.log(`   📚 Tarih blok: ${this.stats.tarihPlaced}`);
    console.log(
      `   🎲 Başarı oranı: ${
        totalPlaced > 0
          ? ((totalPlaced / (totalPlaced + totalFailed)) * 100).toFixed(1)
          : 0
      }%`
    );
    console.log("=".repeat(70) + "\n");

    return {
      placed: totalPlaced,
      failed: totalFailed,
      total: totalPlaced + totalFailed,
      hours: totalHours,
      success: totalFailed === 0,
      quality: this.calculateOverallQuality(totalPlaced, totalFailed),
    };
  }

  // ============================================
  // EN UYGUN SLOT BULMA (ALGORİTMA-AWARE)
  // ============================================

  findBestSlotForBlock(schedule, lesson, blockIndex, blockType, usedDays) {
    const blockSize = blockType.blockSizes[blockIndex];
    const candidates = [];

    // Tüm günleri ve saatleri tara
    for (let day = 0; day < this.DAYS.length; day++) {
      // 1. MATEMATİK ÖZEL KURALI: Aynı güne yerleştirme kısıtı ve min 1 gün ara
      if (blockType.specialRule === "MATEMATIK") {
        if (usedDays.has(day)) {
          // Zaten o gün Matematik yerleştirilmişse atla
          continue;
        }

        // Min 1 gün ara (minimumDaysBetween = 2, kurala göre)
        const minDaysBetween = blockType.minDaysBetween || 2;
        const tooClose = Array.from(usedDays).some(
          (usedDay) => Math.abs(day - usedDay) < minDaysBetween
        );

        if (tooClose) {
          continue;
        }
      }

      // 2. Öğretmen boş gün kontrolü
      if (
        this.config.respectConstraints &&
        this.isTeacherOffDay(lesson.teacherId, day)
      ) {
        continue;
      }

      // Her saati dene
      const maxStartPeriod = this.config.avoidLastHour
        ? Math.min(
            this.MAX_PERIODS - blockSize,
            this.MAX_PERIODS - 1 - blockSize
          )
        : this.MAX_PERIODS - blockSize;

      for (let startPeriod = 0; startPeriod <= maxStartPeriod; startPeriod++) {
        // Validasyon
        const validation = this.validateBlockPlacement(
          schedule,
          lesson,
          day,
          startPeriod,
          blockSize,
          blockIndex
        );

        if (validation.valid) {
          const score = this.scoreSlot(
            day,
            startPeriod,
            blockSize,
            lesson,
            schedule,
            blockType.specialRule
          );

          candidates.push({
            day,
            startPeriod,
            blockSize,
            score,
            validation,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // En yüksek skorlu slotu döndür
    candidates.sort((a, b) => b.score - a.score);

    // Algoritma Optimizasyonu etkinse, en iyi 3 aday arasından seçim yap (GA, SA)
    if (this.config.enableAlgorithmOptimization && candidates.length > 1) {
      this.stats.optimizations++;
      const topCandidates = candidates.slice(0, 3);

      // Basit bir olasılıklı seçim (RL'ye benzer)
      const totalScore = topCandidates.reduce((sum, c) => sum + c.score, 0);
      const rand = Math.random() * totalScore;
      let cumulativeScore = 0;

      for (const candidate of topCandidates) {
        cumulativeScore += candidate.score;
        if (rand < cumulativeScore) {
          return candidate;
        }
      }
    }

    return candidates[0];
  }

  // ============================================
  // BLOK YERLEŞTİRME VALIDASYONU
  // ============================================

  validateBlockPlacement(
    schedule,
    lesson,
    day,
    startPeriod,
    blockSize,
    blockIndex
  ) {
    const errors = [];

    // TARIH ÖZEL KURALI: (2) → tek blok, arka arkaya, asla bölünmez
    // Bu, zaten `blockSize`'ın 2 olmasıyla ve döngünün bölünmemesiyle sağlanır.

    for (let i = 0; i < blockSize; i++) {
      const period = startPeriod + i;

      // Güvenlik kontrolü
      if (period >= this.MAX_PERIODS) {
        errors.push(`Saat aralığı aşıldı: ${this.DAYS[day]} ${period + 1}`);
        break;
      }

      // 1. Sınıf slotu boş mu?
      if (schedule.isSlotOccupied(lesson.classId, day, period)) {
        errors.push(`Slot dolu: ${this.DAYS[day]} ${period + 1}`);
        break;
      }

      // 2. Manuel kilitli mi?
      const slotKey = `${lesson.classId}_${day}_${period}`;
      if (this.lockedSlots.has(slotKey)) {
        errors.push(`Slot kilitli: ${this.DAYS[day]} ${period + 1}`);
        break;
      }

      // 3. Öğretmen müsait mi?
      if (schedule.isTeacherBusy(lesson.teacherId, day, period)) {
        errors.push(`Öğretmen meşgul: ${this.DAYS[day]} ${period + 1}`);
        break;
      }

      // 4. Kapalı saat kontrolü (Kısıtlar)
      if (this.config.respectConstraints && window.ConstraintManager) {
        const teachers = Array.isArray(lesson.teacherId)
          ? lesson.teacherId
          : [lesson.teacherId];

        for (const teacherId of teachers) {
          const constraints = window.ConstraintManager.getKisitlar(teacherId);

          if (constraints && constraints.kapali_saatler) {
            const dayName = this.DAYS[day];
            const kapaliSaatler = constraints.kapali_saatler[dayName] || [];

            if (kapaliSaatler.includes(period + 1)) {
              errors.push(
                `Kapalı saat: ${teacherId} - ${dayName} ${period + 1}`
              );
              break;
            }
          }
        }
      }

      // 5. Min/Max ders kontrolü (Kısıtlar)
      if (this.config.respectConstraints && window.ConstraintManager) {
        const teachers = Array.isArray(lesson.teacherId)
          ? lesson.teacherId
          : [lesson.teacherId];

        for (const teacherId of teachers) {
          const constraints = window.ConstraintManager.getKisitlar(teacherId);

          if (constraints && constraints.max_ders_sayisi) {
            // Önemli: Bu, o gün yerleştirilecek yeni ders ile birlikte kontrol edilmeli.
            // Bu validasyon, bloğun ilk periyodu için yapılsa yeterli olabilir.
            if (i === 0) {
              const currentDayLoad = this.getTeacherDayLoad(
                schedule,
                teacherId,
                day
              );

              // Tek bir blok, max ders sayısını aşmamalı.
              if (currentDayLoad + blockSize > constraints.max_ders_sayisi) {
                errors.push(`Max ders aşıldı: ${teacherId} - Gün ${day + 1}`);
              }
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================
  // SLOT SKORLAMA (ALGORİTMA-OPTIMIZED)
  // ============================================

  scoreSlot(day, startPeriod, blockSize, lesson, schedule, specialRule = null) {
    let score = 100;
    const weights = this.WEIGHTS;

    // 1. SABAH TERCİHİ
    if (this.config.preferMorning) {
      if (startPeriod < 2) {
        score += weights.MORNING_BONUS; // 1-2. saatler
      } else if (startPeriod < 4) {
        score += weights.MORNING_BONUS * 0.5; // 3-4. saatler
      } else if (startPeriod > 5) {
        score -= weights.MORNING_BONUS * 0.75; // Son saatler
      }
    }

    // 2. GÜN DENGESİ (Sınıf için)
    const dayLoad = this.getClassDayLoad(schedule, lesson.classId, day);
    if (dayLoad > 6) {
      score -= weights.DAY_BALANCE * 1.5; // Çok yüklü gün
    } else if (dayLoad < 3) {
      score += weights.DAY_BALANCE * 0.5; // Az yüklü güne yerleştirme bonusu
    }

    // 3. BOŞLUK CEZASI (Öğrenci boşlukları)
    const gapBefore = this.getGapBefore(
      schedule,
      lesson.classId,
      day,
      startPeriod
    );
    const gapAfter = this.getGapAfter(
      schedule,
      lesson.classId,
      day,
      startPeriod + blockSize - 1
    );

    score -= gapBefore * weights.GAP_PENALTY;
    score -= gapAfter * weights.GAP_PENALTY;

    // 4. HAFTA İÇİ DAĞILIM
    if (day === 0) score += weights.WEEK_DISTRIBUTION * 1.3; // Pazartesi Bonus
    if (day === 1) score += weights.WEEK_DISTRIBUTION; // Salı
    if (day === 2) score += weights.WEEK_DISTRIBUTION * 0.7; // Çarşamba
    if (day === 4) score -= weights.WEEK_DISTRIBUTION * 1.5; // Cuma Cezası

    // 5. ÖĞRETMEN TERCİHİ BONUSU (Preferanslar)
    if (this.config.respectPreferences && window.PreferenceManager) {
      const teachers = Array.isArray(lesson.teacherId)
        ? lesson.teacherId
        : [lesson.teacherId];

      let prefScore = 0;

      for (const teacherId of teachers) {
        const prefs = window.PreferenceManager.getTercihler(teacherId);

        if (prefs && prefs.tercih_edilen_saatler) {
          const dayName = this.DAYS[day];
          const tercihSaatler = prefs.tercih_edilen_saatler[dayName] || [];

          for (let i = 0; i < blockSize; i++) {
            const period = startPeriod + i;
            if (tercihSaatler.includes(period + 1)) {
              prefScore += weights.TEACHER_PREFERENCE / blockSize;
            }
          }
        }
      }

      score += prefScore;
    }

    // 6. ÖĞRETMEN YÜKÜ DENGELEME
    const teacherLoad = this.getTeacherWeekLoad(schedule, lesson.teacherId);
    if (teacherLoad < 15) {
      score += weights.TEACHER_LOAD; // Haftalık yükü az olan öğretmene bonus
    } else if (teacherLoad > 25) {
      score -= weights.TEACHER_LOAD; // Haftalık yükü çok olan öğretmene ceza
    }

    // 7. BLOK YAPISI ÖZEL KURAL BONUSU
    if (specialRule === "MATEMATIK") {
      // Matematik için sabah saatleri ekstra bonus ve gün dağılımı bonusu
      if (startPeriod < 3) {
        score += 20;
      }
      score += weights.SPECIAL_RULE_BONUS * 0.5; // Kurala uyulduğu için ek puan
    }
    // Tarih kuralı zaten arka arkaya yerleştirme ile sağlandığı için ekstra bir skora gerek yok.

    // Skorun minimum değeri
    return Math.max(score, 1);
  }

  // ============================================
  // ALGORİTMA ENTEGRASYON METHODLARı
  // ============================================

  /**
   * GA için mutasyon ağırlığı
   */
  getMutationWeight(lesson) {
    this.stats.algorithmCalls++;

    const blockType = window.BlockStructure?.isBlockLesson(lesson)
      ? window.BlockStructure.getBlockType(lesson)
      : null;

    if (blockType?.specialRule === "MATEMATIK") {
      return this.ALGORITHM_PARAMS.GA.mutationWeight * 0.5; // Düşük mutasyon (Çünkü kuralı bozmak riskli)
    }

    if (blockType) {
      // Blok sayısı arttıkça mutasyon olasılığını artır
      return (
        this.ALGORITHM_PARAMS.GA.mutationWeight *
        (1 + blockType.blockCount * 0.1)
      );
    }

    return this.ALGORITHM_PARAMS.GA.mutationWeight;
  }

  /**
   * SA için sıcaklık faktörü
   */
  getTemperatureFactor(lesson) {
    this.stats.algorithmCalls++;

    const blockType = window.BlockStructure?.isBlockLesson(lesson)
      ? window.BlockStructure.getBlockType(lesson)
      : null;

    if (blockType?.specialRule === "MATEMATIK") {
      return this.ALGORITHM_PARAMS.SA.temperatureFactor * 0.9; // Yavaş soğutma (Daha geniş alanda arama)
    }

    return this.ALGORITHM_PARAMS.SA.temperatureFactor;
  }

  /**
   * ACO için feromon faktörü
   */
  getPheromoneFactor(lesson) {
    this.stats.algorithmCalls++;

    const complexity = this.getComplexityScore(lesson);

    // Kompleksite arttıkça feromonun etkisini azalt
    return this.ALGORITHM_PARAMS.ACO.pheromoneFactor * (1 - complexity / 200);
  }

  /**
   * TABU için tenure süresi
   */
  getTabuTenure(lesson) {
    this.stats.algorithmCalls++;

    const blockType = window.BlockStructure?.isBlockLesson(lesson)
      ? window.BlockStructure.getBlockType(lesson)
      : null;

    if (!blockType) {
      return this.ALGORITHM_PARAMS.TABU.tenureBase;
    }

    if (blockType.specialRule === "MATEMATIK") {
      return this.ALGORITHM_PARAMS.TABU.tenureBase * 2; // Uzun tenure (Kötü bir çözümü daha uzun süre yasakla)
    }

    return Math.floor(
      this.ALGORITHM_PARAMS.TABU.tenureBase *
        Math.pow(
          this.ALGORITHM_PARAMS.TABU.tenureMultiplier,
          blockType.blockCount
        )
    );
  }

  /**
   * RL için state dimension
   */
  getStateDimension(lesson) {
    this.stats.algorithmCalls++;

    const blockType = window.BlockStructure?.isBlockLesson(lesson)
      ? window.BlockStructure.getBlockType(lesson)
      : null;

    if (!blockType) {
      return 1;
    }

    // Durum boyutu = Blok sayısı * Haftalık ders saati (Tüm blokların toplamı)
    return (
      blockType.blockCount * blockType.blockSizes.reduce((a, b) => a + b, 0)
    );
  }

  /**
   * RL için reward hesaplama
   */
  getPlacementReward(oldQuality, newQuality) {
    const improvement = newQuality - oldQuality;

    if (improvement > 20) return 1.0; // Büyük iyileşme
    if (improvement > 10) return 0.5; // Orta iyileşme
    if (improvement > 0) return 0.2; // Küçük iyileşme
    if (improvement === 0) return -0.1; // Değişiklik yok (Döngüden kaçınma)
    return -1.0; // Kötüleşme
  }

  /**
   * FUZZY için kompleksite skoru
   */
  getComplexityScore(lesson) {
    let score = 10; // Base

    const blockType = window.BlockStructure?.isBlockLesson(lesson)
      ? window.BlockStructure.getBlockType(lesson)
      : null;

    if (!blockType) {
      return score;
    }

    // Blok sayısı
    score += blockType.blockCount * 20;

    // Özel kural
    if (
      blockType.specialRule === "MATEMATIK" ||
      blockType.specialRule === "TARIH"
    ) {
      score += 50;
    }

    // Toplam saat
    const totalHours = blockType.blockSizes.reduce((a, b) => a + b, 0);
    score += totalHours * 5;

    // Öğretmen sayısı
    const teacherCount = Array.isArray(lesson.teacherId)
      ? lesson.teacherId.length
      : 1;
    score += teacherCount * 15;

    return Math.min(score, 150); // Maksimum 150 ile sınırla
  }

  /**
   * Tüm algoritmalara genel skor
   */
  getAlgorithmScore(schedule, lesson, algorithmType = "GA") {
    this.stats.algorithmCalls++;

    switch (algorithmType) {
      case "GA":
        return this.getMutationWeight(lesson);
      case "SA":
        return this.getTemperatureFactor(lesson);
      case "ACO":
        return this.getPheromoneFactor(lesson);
      case "TABU":
        return this.getTabuTenure(lesson);
      case "RL":
        return this.getStateDimension(lesson);
      case "FUZZY":
        return this.getComplexityScore(lesson);
      default:
        return 0;
    }
  }

  /**
   * Placement kalite değerlendirmesi
   */
  evaluatePlacementQuality(schedule, lessons) {
    let totalScore = 0;
    let count = 0;

    for (const lesson of lessons) {
      const blockType = window.BlockStructure?.isBlockLesson(lesson)
        ? window.BlockStructure.getBlockType(lesson)
        : null;

      if (!blockType) {
        continue;
      }

      const placements = this.getLessonPlacements(schedule, lesson);

      for (const placement of placements) {
        const score = this.scoreSlot(
          placement.day,
          placement.period,
          1, // Tek bir periyot için skorla
          lesson,
          schedule,
          blockType.specialRule
        );
        totalScore += score;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0;
  }

  // ============================================
  // DERSLERI KOMPLEKSİTEYE GÖRE SIRALA
  // ============================================

  sortLessonsByComplexity(lessons) {
    return lessons.sort((a, b) => {
      const scoreA = this.getComplexityScore(a);
      const scoreB = this.getComplexityScore(b);
      return scoreB - scoreA; // Büyükten küçüğe (En zor dersler önce)
    });
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  isTeacherOffDay(teacherId, day) {
    if (!window.PreferenceManager) return false;

    const teachers = Array.isArray(teacherId) ? teacherId : [teacherId];

    for (const tId of teachers) {
      const prefs = window.PreferenceManager.getTercihler(tId);

      if (prefs && prefs.bos_gun) {
        const bosGunIndex = this.DAYS.indexOf(prefs.bos_gun);
        if (day === bosGunIndex) {
          return true;
        }
      }
    }

    return false;
  }

  getClassDayLoad(schedule, classId, day) {
    let count = 0;

    for (let period = 0; period < this.MAX_PERIODS; period++) {
      if (schedule.isSlotOccupied(classId, day, period)) {
        count++;
      }
    }

    return count;
  }

  getTeacherDayLoad(schedule, teacherId, day) {
    let count = 0;

    const teachers = Array.isArray(teacherId) ? teacherId : [teacherId];

    for (const tId of teachers) {
      for (let period = 0; period < this.MAX_PERIODS; period++) {
        if (schedule.isTeacherBusy(tId, day, period)) {
          count++;
        }
      }
    }

    return count;
  }

  getTeacherWeekLoad(schedule, teacherId) {
    let count = 0;
    const teachers = Array.isArray(teacherId) ? teacherId : [teacherId];

    for (const tId of teachers) {
      for (let day = 0; day < this.DAYS.length; day++) {
        for (let period = 0; period < this.MAX_PERIODS; period++) {
          if (schedule.isTeacherBusy(tId, day, period)) {
            count++;
          }
        }
      }
    }

    return count;
  }

  getGapBefore(schedule, classId, day, startPeriod) {
    if (startPeriod === 0) return 0;

    let gap = 0;
    for (let period = startPeriod - 1; period >= 0; period--) {
      if (schedule.isSlotOccupied(classId, day, period)) {
        break;
      }
      gap++;
    }

    return gap;
  }

  getGapAfter(schedule, classId, day, endPeriod) {
    if (endPeriod >= this.MAX_PERIODS - 1) return 0;

    let gap = 0;
    for (let period = endPeriod + 1; period < this.MAX_PERIODS; period++) {
      if (schedule.isSlotOccupied(classId, day, period)) {
        break;
      }
      gap++;
    }

    return gap;
  }

  placeBlockToSchedule(
    schedule,
    lesson,
    day,
    startPeriod,
    blockSize,
    blockIndex
  ) {
    try {
      for (let i = 0; i < blockSize; i++) {
        const period = startPeriod + i;

        // Varsayım: schedule.placeLesson metodu lesson.teacherId'nin array veya tek bir değer olmasını destekliyor.
        schedule.placeLesson(
          lesson.classId,
          lesson.id,
          lesson.teacherId,
          day,
          period,
          {
            blockIndex: blockIndex,
            blockSize: blockSize,
            blockPosition: i,
            totalBlocks: window.BlockStructure.getBlockType(lesson).blockCount,
          }
        );
      }

      return true;
    } catch (error) {
      console.error(
        `      ⚠️ Yerleştirme hatası (${lesson.name}): ${error.message}`
      );
      return false;
    }
  }

  getLessonPlacements(schedule, lesson) {
    const placements = [];

    // schedule.data'nın yapısını varsayarak
    if (!schedule.data || !schedule.data[lesson.classId]) {
      return placements;
    }

    const classSchedule = schedule.data[lesson.classId];

    for (let day = 0; day < this.DAYS.length; day++) {
      const daySchedule = classSchedule[day];
      if (!daySchedule) continue;

      for (let period = 0; period < this.MAX_PERIODS; period++) {
        const slot = daySchedule[period];

        // Sadece kendi dersini bul
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

    return placements;
  }

  recordPlacement(lesson, blockIndex, slot, blockSize) {
    this.placementHistory.push({
      lessonId: lesson.id,
      lessonName: lesson.name,
      blockIndex,
      day: slot.day,
      startPeriod: slot.startPeriod,
      blockSize,
      score: slot.score,
      timestamp: Date.now(),
    });
  }

  getPlacementQuality(score) {
    if (score >= 150) return "⭐⭐⭐ Mükemmel";
    if (score >= 120) return "⭐⭐ Çok İyi";
    if (score >= 100) return "⭐ İyi";
    return "⚠️ Orta";
  }

  calculateOverallQuality(placed, failed) {
    if (placed === 0 && failed === 0) return 100; // Boş program varsayımı
    if (placed === 0) return 0;
    return Math.round((placed / (placed + failed)) * 100);
  }

  // ============================================
  // MANUEL YERLEŞTİRME KİLİTLEME
  // ============================================

  lockSlot(classId, day, period) {
    const key = `${classId}_${day}_${period}`;
    this.lockedSlots.add(key);
    console.log(`🔒 Slot kilitlendi: ${key}`);
  }

  unlockSlot(classId, day, period) {
    const key = `${classId}_${day}_${period}`;
    this.lockedSlots.delete(key);
    console.log(`🔓 Slot kilidi açıldı: ${key}`);
  }

  clearLocks() {
    this.lockedSlots.clear();
    console.log("🔓 Tüm kilitler temizlendi");
  }

  // ============================================
  // İSTATİSTİKLER
  // ============================================

  getStats() {
    const totalAttemptedBlocks = this.stats.attempted; // Her bloklu ders için 1 deneme
    const totalBlocks = this.stats.successful + this.stats.failed;

    return {
      ...this.stats,
      successRate:
        totalBlocks > 0
          ? ((this.stats.successful / totalBlocks) * 100).toFixed(1) + "%"
          : "0%",
      totalPlacements: this.placementHistory.length, // Yerleştirilen toplam ders saati
    };
  }

  clear() {
    this.placements.clear();
    this.conflictCache.clear();
    this.lockedSlots.clear();
    this.placementHistory = [];
    this.stats = {
      attempted: 0,
      successful: 0,
      failed: 0,
      split: 0,
      blocked: 0,
      matematikPlaced: 0,
      tarihPlaced: 0,
      optimizations: 0,
      algorithmCalls: 0,
    };
  }

  printReport() {
    const stats = this.getStats();

    console.log("\n🎯 BLOCK PLACEMENT RAPORU");
    console.log("=".repeat(60));
    console.log(`  • Ders Denemesi (Toplam): ${stats.attempted}`);
    console.log(`  • Başarılı Blok: ${stats.successful}`);
    console.log(`  • Başarısız Blok: ${stats.failed}`);
    console.log(`  • Başarı Oranı: ${stats.successRate}`);
    console.log(`  • Matematik Blok: ${stats.matematikPlaced}`);
    console.log(`  • Tarih Blok: ${stats.tarihPlaced}`);
    console.log(`  • Algoritma Çağrı: ${stats.algorithmCalls}`);
    console.log(`  • Optimizasyon: ${stats.optimizations}`);
    console.log("=".repeat(60) + "\n");
  }
}

// ============================================
// GLOBAL EXPORT
// ============================================

if (typeof window !== "undefined") {
  window.BlockPlacementController = BlockPlacementController;
  console.log("✅ BlockPlacementController V3.1 (Algoritma Entegre) yüklendi");
}
