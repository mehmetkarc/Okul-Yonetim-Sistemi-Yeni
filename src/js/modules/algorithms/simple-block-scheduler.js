/**
 * ================================================================================
 * YAPAY ZEKÂ DESTEKLİ DERS DAĞITIM SİSTEMİ
 * ================================================================================
 *
 * V3.5 - GÜNLÜK MİNİMUM DERS KISITLAMASI ENTEGRASYONU (POST-VALIDATION)
 *
 * 🔥 KRİTİK DÜZELTMELER/EKLER:
 * 1. Global ve Öğretmen Bazlı Günlük Minimum Ders Kısıtlaması (Min 2 ders) eklendi.
 * 2. Bu kural, yerleştirmeden sonra kontrol edilip raporlanmaktadır.
 *
 * ================================================================================
 */

class SimpleBlockScheduler {
  constructor(data, lockedLessons = new Set()) {
    console.log(
      "\n🚀 YAPAY ZEKÂ DESTEKLİ DERS DAĞITIM V3.5 (GÜNLÜK MİN. 2 DERS ENTEGRE)"
    );
    console.log("=".repeat(80));

    // Veri
    this.lessons = data.lessons || [];
    this.classes = data.classes || [];
    this.teachers = data.teachers || [];
    this.isRandomOffDayEnabled = data.isRandomOffDayEnabled || false;

    // ✅ YENİ: Manuel yerleştirmeler
    this.manualPlacements = data.manualPlacements || {};

    // Sabitler
    this.DAYS = [1, 2, 3, 4, 5];
    this.DAY_NAMES = {
      1: "Pazartesi",
      2: "Salı",
      3: "Çarşamba",
      4: "Perşembe",
      5: "Cuma",
    };
    this.HOURS_PER_DAY = 8;

    // ✅ GÜNCEL GENEL KISIT AYARLARI
    this.globalDailyLimitEnabled = data.globalDailyLimitEnabled || false;
    this.globalMinDaily = data.globalMinDaily || 0; // 🎯 KRİTİK: Günlük Min. Ders Saati
    this.globalMaxDaily = data.globalMaxDaily || this.HOURS_PER_DAY;
    this.globalGapLimitEnabled = data.globalGapLimitEnabled || false;
    this.globalMaxGaps = data.globalMaxGaps || 999;

    // Kısıtlar ve tercihler
    this.constraints = this.loadConstraints();
    this.preferences = this.loadPreferences(this.isRandomOffDayEnabled);

    // Manuel kilitli dersler
    this.lockedLessons = new Set(lockedLessons);

    // Manuel yerleştirilmiş ders ID'lerini tutar
    this.manualLessonIds = new Set();

    // Program
    this.schedule = {};
    this.placementHistory = [];

    // Backtracking ayarları
    this.maxBacktrackDepth = 500;
    this.backtrackCount = 0;
    this.maxSwapAttempts = 50;

    // İhlal kayıtları
    this.violationReports = {};

    console.log(`   ✅ ${this.lessons.length} ders yüklendi`);
    console.log(
      `   📊 Günlük Limitler (Gnl): ${this.globalMinDaily}-${this.globalMaxDaily} (Aktif: ${this.globalDailyLimitEnabled})`
    );
    if (this.globalDailyLimitEnabled && this.globalMinDaily > 1) {
      console.log(
        `   ⚠️ KRİTİK: Günlük Min. Ders Kısıtı: ${this.globalMinDaily} Saat`
      );
    }
  }

  /**
   * KISITLARI YÜKLE
   */
  loadConstraints() {
    try {
      const saved = localStorage.getItem("teacherConstraints");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn("   ⚠️ Kısıt yükleme hatası:", error);
    }
    return {};
  }

  /**
   * TERCİHLERİ YÜKLE VE RASTGELE BOŞ GÜN ATA
   */
  loadPreferences(isRandomOffDayEnabled = false) {
    let preferences = {};
    try {
      const saved = localStorage.getItem("teacherPreferences");
      if (saved) {
        preferences = JSON.parse(saved);
      }
    } catch (error) {
      console.warn("   ⚠️ Tercih yükleme hatası:", error);
    }

    if (isRandomOffDayEnabled) {
      const days = [1, 2, 3, 4, 5];

      const activeTeacherIds = new Set(
        this.teachers.map((t) => t.id.toString())
      );

      for (const tid of activeTeacherIds) {
        if (!preferences[tid] || !preferences[tid].offDay) {
          const randomIndex = Math.floor(Math.random() * days.length);
          const randomDay = days[randomIndex];

          if (!preferences[tid]) {
            preferences[tid] = {};
          }

          preferences[tid].offDay = randomDay;
        }
      }
    }

    return preferences;
  }

  /**
   * ✅ TÜM HARD CONSTRAINT KONTROLÜ (Yerleştirme Öncesi)
   */
  checkAllHardConstraints(lesson, day, hour, blockSize) {
    const teacherIds = Array.isArray(lesson.teacherId)
      ? lesson.teacherId
      : [lesson.teacherId];
    const primaryTeacherId = teacherIds[0];

    // 1. KISIT KONTROLÜ (blockedSlots)
    for (let h = hour; h < hour + blockSize; h++) {
      if (!this.checkConstraints(lesson.teacherId, day, h)) {
        return { valid: false, reason: "Öğretmen kısıtı (blockedSlots)" };
      }
    }

    // 2. BOŞ GÜN KONTROLÜ (HARD!)
    const prefs = this.preferences[primaryTeacherId];
    const offDay = prefs?.offDay;

    if (offDay && day === offDay) {
      return {
        valid: false,
        reason: `Boş gün tercihi (${this.DAY_NAMES[day]})`,
      };
    }

    // 3. SINIF DOLULUĞU (SCHEDULE KONTROLÜ)
    const classIdStr = lesson.classId.toString();
    for (let h = hour; h < hour + blockSize; h++) {
      if (
        this.schedule[classIdStr] &&
        this.schedule[classIdStr][day] &&
        this.schedule[classIdStr][day][h]
      ) {
        return {
          valid: false,
          reason: "Sınıf dolu (Manuel veya Otomatik ders var)",
        };
      }
    }

    // 4. ÖĞRETMEN DOLULUĞU
    for (let h = hour; h < hour + blockSize; h++) {
      if (this.isTeacherBusy(lesson.teacherId, day, h)) {
        return { valid: false, reason: "Öğretmen dolu" };
      }
    }

    // 5. GÜNLÜK MAKSİMUM DERS LİMİTİ KONTROLÜ (HARD!)
    if (this.globalDailyLimitEnabled) {
      const isSpecificLimitEnabled = prefs?.dailyLimit?.enabled === true;
      const maxLimit = isSpecificLimitEnabled
        ? prefs.dailyLimit.max || this.globalMaxDaily
        : this.globalMaxDaily;

      const currentDailyCount = this.getTeacherDailyLessonCount(
        primaryTeacherId,
        day
      );
      const projectedCount = currentDailyCount + blockSize;

      if (projectedCount > maxLimit) {
        return {
          valid: false,
          reason: `Günlük Max. Ders Limiti aşıldı (${projectedCount} > ${maxLimit} for T:${primaryTeacherId})`,
        };
      }
      // Günlük minimum kontrolü burada YAPILMAZ (Post-Validation için bırakıldı).
    }

    return { valid: true };
  }

  /**
   * KISIT KONTROLÜ (blockedSlots)
   */
  checkConstraints(teacherId, day, hour) {
    if (!this.constraints || Object.keys(this.constraints).length === 0) {
      return true;
    }

    const teacherIds = Array.isArray(teacherId) ? teacherId : [teacherId];

    for (const tid of teacherIds) {
      const teacherConstraintList = this.constraints[tid];

      if (!teacherConstraintList || teacherConstraintList.length === 0) {
        continue;
      }

      for (const constraint of teacherConstraintList) {
        if (constraint.blockedSlots) {
          const key = `${day}-${hour}`;
          if (constraint.blockedSlots[key] === true) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * ÖĞRETMENİN O GÜN ALDIĞI DERS SAYISINI BUL
   */
  getTeacherDailyLessonCount(teacherId, day) {
    const primaryTeacherId = Array.isArray(teacherId)
      ? teacherId[0]
      : teacherId;
    let count = 0;

    for (const classId in this.schedule) {
      const isNumericId =
        !isNaN(parseInt(classId)) &&
        classId.toString() === parseInt(classId).toString();
      if (!isNumericId) continue;

      if (this.schedule[classId][day]) {
        for (const hour in this.schedule[classId][day]) {
          const lesson = this.schedule[classId][day][hour];
          if (lesson) {
            const lessonTeacherIds = Array.isArray(lesson.teacherId)
              ? lesson.teacherId
              : [lesson.teacherId];

            if (lessonTeacherIds.includes(primaryTeacherId)) {
              count++;
            }
          }
        }
      }
    }
    return count;
  }

  /**
   * ÖĞRETMENİN HAFTALIK TOPLAM PENCERE (GAP) SAYISINI HESAPLA
   */
  calculateTeacherGaps(teacherId) {
    const primaryTeacherId = Array.isArray(teacherId)
      ? teacherId[0]
      : teacherId;
    let totalGaps = 0;

    for (const day of this.DAYS) {
      let firstLessonHour = this.HOURS_PER_DAY + 1;
      let lastLessonHour = 0;

      for (let hour = 1; hour <= this.HOURS_PER_DAY; hour++) {
        if (this.isTeacherBusy(primaryTeacherId, day, hour)) {
          if (hour < firstLessonHour) firstLessonHour = hour;
          if (hour > lastLessonHour) lastLessonHour = hour;
        }
      }

      if (lastLessonHour > 0) {
        for (let hour = firstLessonHour + 1; hour < lastLessonHour; hour++) {
          if (!this.isTeacherBusy(primaryTeacherId, day, hour)) {
            totalGaps++;
          }
        }
      }
    }
    return totalGaps;
  }

  /**
   * GÜNLER TERCİHE GÖRE SIRALA (BOŞ GÜN HARİÇ!)
   */
  sortDaysByPreference(teacherId, classId) {
    const teacherIds = Array.isArray(teacherId) ? teacherId : [teacherId];
    const primaryTeacherId = teacherIds[0];
    const classIdStr = classId.toString();

    const prefs = this.preferences[primaryTeacherId];
    const offDay = prefs?.offDay;

    const teacherDaysInClass = new Set();

    if (this.schedule[classIdStr]) {
      for (const day of this.DAYS) {
        // Not: checkSameTeacherSameDay dışarıda tanımlı değil, ancak mantığı burada kullanılıyor:
        // Sadece programda o sınıfta o öğretmenin dersi varsa
        let isUsed = false;
        if (this.schedule[classIdStr][day]) {
          for (const hour in this.schedule[classIdStr][day]) {
            const lesson = this.schedule[classIdStr][day][hour];
            if (
              lesson &&
              (Array.isArray(lesson.teacherId)
                ? lesson.teacherId
                : [lesson.teacherId]
              ).some((tid) => teacherIds.includes(tid))
            ) {
              isUsed = true;
              break;
            }
          }
        }
        if (isUsed) {
          teacherDaysInClass.add(day);
        }
      }
    }

    const freshDays = this.DAYS.filter(
      (d) => !teacherDaysInClass.has(d) && d !== offDay
    );
    const occupiedDays = this.DAYS.filter(
      (d) => teacherDaysInClass.has(d) && d !== offDay
    );

    const shuffledFreshDays = freshDays.sort(() => Math.random() - 0.5);
    const shuffledOccupiedDays = occupiedDays.sort(() => Math.random() - 0.5);

    return [...shuffledFreshDays, ...shuffledOccupiedDays];
  }

  /**
   * DERSİ YERLEŞTİR
   */
  placeLesson(lesson, day, startHour, endHour) {
    const classIdStr = lesson.classId.toString();
    const lessonData = {
      id: lesson.id,
      subjectName: lesson.subjectName,
      teacherId: lesson.teacherId,
      teacherName: lesson.teacherName,
      className: lesson.className,
      classId: lesson.classId,
      isManual: lesson.isManual || false,
    };

    for (let hour = startHour; hour <= endHour; hour++) {
      if (this.schedule[classIdStr]) {
        this.schedule[classIdStr][day][hour] = { ...lessonData };
      }

      const classObj = this.classes.find((c) => c.id.toString() === classIdStr);
      const classKey = classObj?.name ? classObj.name.replace(/-/g, "_") : null;

      if (classKey && this.schedule[classKey]) {
        this.schedule[classKey][day][hour] = { ...lessonData };
      }
    }

    if (!lesson.isManual) {
      this.placementHistory.push({
        lesson: { ...lesson },
        day: day,
        startHour: startHour,
        endHour: endHour,
      });
    }
  }

  /**
   * SON YERLEŞTİRMEYİ GERİ AL
   */
  undoLastPlacement() {
    if (this.placementHistory.length === 0) {
      return null;
    }

    const lastPlacement = this.placementHistory.pop();
    const { lesson, day, startHour, endHour } = lastPlacement;
    const classIdStr = lesson.classId.toString();

    if (lesson.isManual) return null;

    for (let hour = startHour; hour <= endHour; hour++) {
      if (this.schedule[classIdStr] && this.schedule[classIdStr][day]) {
        delete this.schedule[classIdStr][day][hour];
      }

      const classObj = this.classes.find((c) => c.id.toString() === classIdStr);
      const classKey = classObj?.name ? classObj.name.replace(/-/g, "_") : null;

      if (classKey && this.schedule[classKey] && this.schedule[classKey][day]) {
        delete this.schedule[classKey][day][hour];
      }
    }

    return lastPlacement;
  }

  /**
   * ANA ÇÖZÜM METODU
   */
  solve() {
    console.log("\n📚 ÇÖZÜM BAŞLIYOR (AKILLI BACKTRACKING)");
    console.log("=".repeat(80));

    this.initializeSchedule();

    const sortedLessons = this.analyzeLessons();

    const allLessons = [];

    sortedLessons.blockLessons.forEach((lesson) => {
      lesson.blockStructure.forEach((blockSize, blockIndex) => {
        allLessons.push({
          lesson: lesson,
          blockSize: blockSize,
          blockIndex: blockIndex,
          isBlock: true,
        });
      });
    });

    sortedLessons.singleLessons.forEach((lesson) => {
      allLessons.push({
        lesson: lesson,
        blockSize: 1,
        blockIndex: 0,
        isBlock: false,
      });
    });

    console.log(`\n📦 TOPLAM YERLEŞTİRİLECEK: ${allLessons.length} blok/ders`);

    const success = this.placeWithBacktracking(allLessons, 0);

    if (!success) {
      console.error("\n❌ BACKTRACKING BAŞARISIZ!");
    }

    // ✅ ÇÖZÜM SONRASI KRİTİK KONTROLÜ YAP (Min. 2 Ders/Gün)
    this.checkDailyMinimumConstraint();

    return this.generateReport(
      sortedLessons.blockLessons,
      sortedLessons.singleLessons
    );
  }

  /**
   * BACKTRACKING İLE YERLEŞTİRME
   */
  placeWithBacktracking(allLessons, currentIndex) {
    if (currentIndex >= allLessons.length) {
      console.log("\n✅ TÜM DERSLER YERLEŞTİRİLDİ!");
      return true;
    }

    if (this.backtrackCount >= this.maxBacktrackDepth) {
      console.error(
        `\n❌ MAX BACKTRACK LİMİTİ AŞILDI! (${this.maxBacktrackDepth})`
      );
      return false;
    }

    const current = allLessons[currentIndex];
    const { lesson, blockSize } = current;
    const primaryTeacherId = Array.isArray(lesson.teacherId)
      ? lesson.teacherId[0]
      : lesson.teacherId;

    const usedDays = new Set();
    const classIdStr = lesson.classId.toString();
    // Aynı dersin bloklarının farklı günlere yerleştirilmesi
    if (this.schedule[classIdStr]) {
      for (const day of this.DAYS) {
        let isUsed = false;
        for (let hour = 1; hour <= this.HOURS_PER_DAY; hour++) {
          const placedLesson = this.schedule[classIdStr][day][hour];
          if (
            placedLesson &&
            placedLesson.id.toString() === lesson.id.toString()
          ) {
            isUsed = true;
            break;
          }
        }
        if (isUsed) {
          usedDays.add(day);
        }
      }
    }

    const sortedDays = this.sortDaysByPreference(
      lesson.teacherId,
      lesson.classId
    );

    for (const day of sortedDays) {
      if (usedDays.has(day)) {
        continue;
      }

      for (let hour = 1; hour <= this.HOURS_PER_DAY - blockSize + 1; hour++) {
        const constraintCheck = this.checkAllHardConstraints(
          lesson,
          day,
          hour,
          blockSize
        );

        if (!constraintCheck.valid) {
          continue;
        }

        this.placeLesson(lesson, day, hour, hour + blockSize - 1);

        // HAFTALIK MAKSİMUM PENCERE KONTROLÜ (HARD!)
        if (this.globalGapLimitEnabled) {
          const prefs = this.preferences[primaryTeacherId];
          const isSpecificLimitEnabled = prefs?.gapLimit?.enabled === true;
          const maxGaps = isSpecificLimitEnabled
            ? prefs.gapLimit.max || this.globalMaxGaps
            : this.globalMaxGaps;

          if (maxGaps < 999) {
            const currentGaps = this.calculateTeacherGaps(primaryTeacherId);

            if (currentGaps > maxGaps) {
              this.undoLastPlacement();
              this.backtrackCount++;
              continue;
            }
          }
        }

        const nextSuccess = this.placeWithBacktracking(
          allLessons,
          currentIndex + 1
        );

        if (nextSuccess) {
          return true;
        }

        // Başarısız, geri al
        this.undoLastPlacement();
        this.backtrackCount++;
      }
    }

    return false;
  }

  /**
   * ✅ KRİTİK METOT: GÜNLÜK MİNİMUM DERS KISITLAMASINI KONTROL ET (POST-VALIDATION)
   */
  checkDailyMinimumConstraint() {
    if (!this.globalDailyLimitEnabled || this.globalMinDaily < 2) {
      return;
    }

    const minLessons = this.globalMinDaily;
    const violations = {};
    const teacherDailyCounts = {};

    // 1. Öğretmenin her gün kaç ders saati olduğunu say
    for (const classId in this.schedule) {
      const isNumericId =
        !isNaN(parseInt(classId)) &&
        classId.toString() === parseInt(classId).toString();
      if (!isNumericId) continue;

      for (const day of this.DAYS) {
        for (const hour in this.schedule[classId][day]) {
          const lesson = this.schedule[classId][day][hour];
          if (lesson) {
            const teacherIds = Array.isArray(lesson.teacherId)
              ? lesson.teacherId
              : [lesson.teacherId];
            const primaryTeacherId = teacherIds[0];

            if (!teacherDailyCounts[primaryTeacherId]) {
              teacherDailyCounts[primaryTeacherId] = {};
            }
            if (!teacherDailyCounts[primaryTeacherId][day]) {
              // Set kullanarak mükerrer sayımı engelle (blok dersler tek bir lesson objesi ile birden fazla saati kaplar)
              teacherDailyCounts[primaryTeacherId][day] = new Set();
            }

            teacherDailyCounts[primaryTeacherId][day].add(hour);
          }
        }
      }
    }

    // 2. İhlalleri kontrol et
    for (const teacherId in teacherDailyCounts) {
      for (const day in teacherDailyCounts[teacherId]) {
        const dayLessonCount = teacherDailyCounts[teacherId][day].size;

        // Ders saati sayısı minimum limitten küçük ve o gün ders varsa (count > 0)
        if (dayLessonCount > 0 && dayLessonCount < minLessons) {
          if (!violations[teacherId]) {
            violations[teacherId] = [];
          }
          violations[teacherId].push({
            day: parseInt(day),
            dayName: this.DAY_NAMES[day],
            count: dayLessonCount,
            required: minLessons,
          });
        }
      }
    }

    this.violationReports.dailyMinLimit = violations;
    console.log(
      `\n🚨 Günlük Min. Ders İhlalleri (Min ${minLessons} Saat): ${
        Object.keys(violations).length
      } öğretmen ihlal ediyor.`
    );
  }

  /**
   * SCHEDULE'I BAŞLAT + MANUEL YERLEŞTİRMELERİ EKLE
   */
  initializeSchedule() {
    this.schedule = {};
    this.placementHistory = [];
    this.backtrackCount = 0;
    this.manualLessonIds = new Set();
    this.lockedLessons.clear();

    // Sınıflar için boş schedule oluştur
    for (const cls of this.classes) {
      const numericId = cls.id.toString();
      const classKey = cls.name
        ? cls.name.replace(/-/g, "_")
        : `class_${cls.id}`;

      this.schedule[numericId] = {};
      if (classKey !== numericId) {
        this.schedule[classKey] = {};
      }

      for (const day of this.DAYS) {
        this.schedule[numericId][day] = {};
        if (classKey !== numericId && this.schedule[classKey]) {
          this.schedule[classKey][day] = {};
        }
      }
    }

    // MANUEL YERLEŞTİRMELERİ SCHEDULE'A EKLE
    if (
      this.manualPlacements &&
      Object.keys(this.manualPlacements).length > 0
    ) {
      console.log("\n📍 MANUEL YERLEŞTİRMELER SCHEDULE'A EKLENİYOR:");
      let manualCount = 0;

      for (const key in this.manualPlacements) {
        const manualLesson = this.manualPlacements[key];
        const parts = key.split("_");
        if (parts.length !== 3) continue;

        const classIdStr = parts[0];
        const dayInt = parseInt(parts[1]);
        const hourInt = parseInt(parts[2]);

        if (
          manualLesson &&
          this.schedule[classIdStr] &&
          this.schedule[classIdStr][dayInt]
        ) {
          // 1. Schedule'a yerleştir (Numeric ID)
          this.schedule[classIdStr][dayInt][hourInt] = {
            ...manualLesson,
            isManual: true,
          };

          // Class name key'ine de ekle (Kopya)
          const classObj = this.classes.find(
            (c) => c.id.toString() === classIdStr
          );
          if (classObj && classObj.name) {
            const classKey = classObj.name.replace(/-/g, "_");
            if (this.schedule[classKey] && this.schedule[classKey][dayInt]) {
              this.schedule[classKey][dayInt][hourInt] = {
                ...manualLesson,
                isManual: true,
              };
            }
          }

          const lessonId = (
            manualLesson.lessonId || manualLesson.id
          ).toString();
          this.manualLessonIds.add(lessonId);
          manualCount++;
        }
      }

      console.log(
        `   ✅ ${manualCount} manuel slot yerleştirildi. ⏭️ ${this.manualLessonIds.size} ders çıkarılacak.`
      );
    }
  }

  /**
   * DERSLERİ ANALİZ ET
   */
  analyzeLessons() {
    console.log("\n📊 DERSLER ANALİZ EDİLİYOR");
    const blockLessons = [];
    const singleLessons = [];
    let skippedLessons = 0;

    for (const lesson of this.lessons) {
      if (this.manualLessonIds.has(lesson.id.toString())) {
        skippedLessons++;
        continue;
      }

      if (
        !lesson.teacherId ||
        (Array.isArray(lesson.teacherId) && lesson.teacherId.length === 0) ||
        (Array.isArray(lesson.teacherId) && lesson.teacherId.every((id) => !id))
      ) {
        skippedLessons++;
        continue;
      }

      let blockStructure = lesson.blockStructure || [lesson.weeklyHours];

      if (!lesson.blockStructure || lesson.blockStructure.length === 0) {
        blockStructure = this.calculateBlockStructure(lesson.weeklyHours);
      }

      const lessonInfo = {
        ...lesson,
        blockStructure: blockStructure,
        blockCount: blockStructure.length,
        priority: this.calculatePriority(lesson, blockStructure),
      };

      if (lesson.weeklyHours === 1) {
        singleLessons.push(lessonInfo);
      } else {
        blockLessons.push(lessonInfo);
      }
    }

    blockLessons.sort((a, b) => b.priority - a.priority);
    singleLessons.sort((a, b) => b.priority - a.priority);

    console.log(
      `   ✅ Blok ders: ${blockLessons.length} | Tek saatlik ders: ${singleLessons.length} | Atlandı: ${skippedLessons}`
    );

    return { blockLessons, singleLessons };
  }

  calculateBlockStructure(weeklyHours) {
    const structures = {
      1: [1],
      2: [2],
      3: [2, 1],
      4: [2, 2],
      5: [2, 2, 1],
      6: [2, 2, 2],
      7: [2, 2, 3],
      8: [4, 4],
    };
    return structures[weeklyHours] || [weeklyHours];
  }

  calculatePriority(lesson, blockStructure) {
    return blockStructure.length > 1
      ? 1000 + lesson.weeklyHours * 100
      : 500 + lesson.weeklyHours * 50;
  }

  isTeacherBusy(teacherId, day, hour) {
    const teacherIds = Array.isArray(teacherId) ? teacherId : [teacherId];

    for (const classId in this.schedule) {
      const isNumericId =
        !isNaN(parseInt(classId)) &&
        classId.toString() === parseInt(classId).toString();

      if (!isNumericId) continue;

      const classIdStr = classId.toString();

      if (!this.schedule[classIdStr][day]) continue;

      const lesson = this.schedule[classIdStr][day][hour];
      if (lesson) {
        const lessonTeacherIds = Array.isArray(lesson.teacherId)
          ? lesson.teacherId
          : [lesson.teacherId];

        for (const tid of teacherIds) {
          if (lessonTeacherIds.includes(tid)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * RAPOR OLUŞTUR
   */
  generateReport(blockLessons, singleLessons) {
    const scheduledLessons = [...blockLessons, ...singleLessons].filter(
      (l) => !this.manualLessonIds.has(l.id.toString())
    );
    let totalHours = scheduledLessons.reduce(
      (sum, l) => sum + l.weeklyHours,
      0
    );

    let manualPlacedHours = 0;
    for (const lesson of this.lessons) {
      if (this.manualLessonIds.has(lesson.id.toString())) {
        manualPlacedHours += lesson.weeklyHours;
      }
    }
    totalHours += manualPlacedHours;

    let actualPlacedHours = 0;
    for (const cls of this.classes) {
      const classIdStr = cls.id.toString();
      if (this.schedule[classIdStr]) {
        for (const day in this.schedule[classIdStr]) {
          for (const hour in this.schedule[classIdStr][day]) {
            if (this.schedule[classIdStr][day][hour]) {
              actualPlacedHours++;
            }
          }
        }
      }
    }

    const autoPlacedHours = this.placementHistory.reduce((sum, p) => {
      return sum + (p.endHour - p.startHour + 1);
    }, 0);

    console.log("\n📊 RAPOR");
    console.log("=".repeat(80));
    console.log(`   Hedef Toplam Saat: ${totalHours}`);
    console.log(`   Yerleştirilen Toplam Saat: ${actualPlacedHours}`);
    console.log(`   Backtrack: ${this.backtrackCount}`);

    const minViolations = this.violationReports.dailyMinLimit || {};
    const totalMinViolations = Object.keys(minViolations).length;

    console.log(
      `   🚨 Günlük Min. Ders İhlali Yapan Öğretmen Sayısı: ${totalMinViolations}`
    );
    if (totalMinViolations > 0) {
      console.log(
        "     (Detaylar için violationReports objesini kontrol edin)"
      );
    }

    return {
      success: actualPlacedHours === totalHours,
      schedule: this.schedule,
      stats: {
        totalHours,
        placedHours: actualPlacedHours,
        manualPlacedHours: manualPlacedHours,
        autoPlacedHours: autoPlacedHours,
        backtrackCount: this.backtrackCount,
        dailyMinViolations: totalMinViolations,
      },
      violationReports: this.violationReports,
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SimpleBlockScheduler;
}
