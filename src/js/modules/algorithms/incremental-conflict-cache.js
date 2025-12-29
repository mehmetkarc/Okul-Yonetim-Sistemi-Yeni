/**
 * ============================================
 * INCREMENTAL CONFLICT CACHE - Hızlı Çakışma Kontrolü & Yük Sayaçları
 * ============================================
 * Çakışmaları O(1) hızında kontrol eder ve Soft Constraint'ler için
 * gerekli olan Günlük/Haftalık Yük Sayaçlarını tutar.
 *
 * KRİTİK GÜNCELLEMELER (V2.1):
 * 1. 🟢 YÜK SAYAÇLARI: Teacher/Class Daily/Weekly Load sayaçları eklendi.
 * 2. 🟢 PERFORMANS İYİLEŞTİRMESİ: add/remove metotları bu sayaçları artımlı olarak günceller.
 *
 * Version: 2.1 - LOAD COUNTERS ADDED
 * Author: SİMRE/MK & Gemini
 */

class IncrementalConflictCache {
  constructor() {
    console.log("⚡ IncrementalConflictCache başlatıldı (V2.1)");

    // Teacher: {teacherId_day_time: {classId, lessonId, ...}}
    this.teacherSchedule = new Map();

    // Class: {classId_day_time: {teacherId, lessonId, ...}}
    this.classSchedule = new Map();

    // Room: {roomId_day_time: {classId, lessonId, ...}}
    this.roomSchedule = new Map();

    // Genel assignment cache
    this.assignments = new Map();

    // ============================================
    // 🎯 V2.1 YENİ: YÜK VE DAĞILIM SAYAÇLARI
    // ============================================
    // { teacherId: { day: count, day: count, ... } }
    this.teacherDailyLoad = new Map();
    // { teacherId: totalCount }
    this.teacherWeeklyLoad = new Map();
    // { classId: { day: count, day: count, ... } }
    this.classDailyLoad = new Map();
    // { classId: totalCount }
    this.classWeeklyLoad = new Map();

    // Conflict counters
    this.conflicts = {
      teacher: 0,
      class: 0,
      room: 0,
      total: 0,
    };

    // Stats
    this.stats = {
      hits: 0,
      misses: 0,
      updates: 0,
      adds: 0,
      removes: 0,
    };
  }

  // ============================================
  // CACHE OPERATIONS
  // ============================================

  clear() {
    this.teacherSchedule.clear();
    this.classSchedule.clear();
    this.roomSchedule.clear();
    this.assignments.clear();

    // Sayaçları temizle
    this.teacherDailyLoad.clear();
    this.teacherWeeklyLoad.clear();
    this.classDailyLoad.clear();
    this.classWeeklyLoad.clear();

    this.conflicts = { teacher: 0, class: 0, room: 0, total: 0 };
    this.stats = { hits: 0, misses: 0, updates: 0, adds: 0, removes: 0 };

    console.log("🧹 Cache temizlendi");
  }

  buildCache(solution) {
    console.log("🔨 Cache oluşturuluyor...");
    const startTime = Date.now();

    this.clear();

    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];
          // Dersin blok büyüklüğünü kontrol et. Sadece bloğun ilk dersini say.
          // Çözüm objesi (solution) zaten tekil saatler içeriyorsa, bu kontrol gereksizdir.
          // Burada basitlik adına her slotu ayrı bir "ders" olarak sayıyoruz.
          if (lesson && lesson.teacherId) {
            this.add(lesson, parseInt(day), parseInt(time));
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`  ✅ Cache oluşturuldu (${duration}ms)`);
    console.log(
      `  📊 ${this.assignments.size} assignment, ${this.conflicts.total} çakışma`
    );

    return this.stats;
  }

  // ============================================
  // ADD/REMOVE OPERATIONS
  // ============================================

  add(lesson, day, time) {
    if (!lesson || !lesson.teacherId) {
      console.warn("⚠️ Geçersiz lesson objesi:", lesson);
      return;
    }

    const key = `${day}_${time}`;
    const { teacherId, classId, lessonId, roomId } = lesson;

    // --- 1. ÇAKIŞMA HARİTALARI ---

    // Teacher schedule
    const teacherKey = `${teacherId}_${key}`;
    if (this.teacherSchedule.has(teacherKey)) {
      this.conflicts.teacher++;
      this.conflicts.total++;
    }
    this.teacherSchedule.set(teacherKey, {
      classId,
      lessonId: lessonId || lesson.id,
      day,
      time,
    });

    // Class schedule
    if (classId) {
      const classKey = `${classId}_${key}`;
      if (this.classSchedule.has(classKey)) {
        this.conflicts.class++;
        this.conflicts.total++;
      }
      this.classSchedule.set(classKey, {
        teacherId,
        lessonId: lessonId || lesson.id,
        day,
        time,
      });
    }

    // Room schedule (varsa)
    if (roomId) {
      const roomKey = `${roomId}_${key}`;
      if (this.roomSchedule.has(roomKey)) {
        this.conflicts.room++;
        this.conflicts.total++;
      }
      this.roomSchedule.set(roomKey, { classId, teacherId, day, time });
    }

    // Genel assignment cache'e ekle
    this.assignments.set(teacherKey, { ...lesson, day, time });

    // --- 2. YÜK SAYAÇLARI (INCREMENTAL UPDATE) ---

    // Öğretmen Yükü
    this.updateTeacherLoad(teacherId, day, 1);

    // Sınıf Yükü
    if (classId) {
      this.updateClassLoad(classId, day, 1);
    }

    this.stats.updates++;
    this.stats.adds++;
  }

  remove(lesson, day, time) {
    if (!lesson || !lesson.teacherId) {
      return;
    }

    const key = `${day}_${time}`;
    const { teacherId, classId, roomId } = lesson;

    // --- 1. ÇAKIŞMA HARİTALARI ---

    // Teacher schedule
    const teacherKey = `${teacherId}_${key}`;
    // Çakışma kontrolü yapılmalı: Eğer silinen ders çakışma yaratan ikinci/üçüncü ders ise,
    // totalConflict sayacı düşürülmemelidir. Bu karmaşık mantık, genel tarama (getAllConflicts)
    // tarafından çözülmelidir, bu yüzden burada sayaç düşürmüyoruz (sadece Map temizliyoruz).
    this.teacherSchedule.delete(teacherKey);
    this.assignments.delete(teacherKey);

    // Class schedule
    if (classId) {
      const classKey = `${classId}_${key}`;
      this.classSchedule.delete(classKey);
    }

    // Room schedule
    if (roomId) {
      const roomKey = `${roomId}_${key}`;
      this.roomSchedule.delete(roomKey);
    }

    // --- 2. YÜK SAYAÇLARI (INCREMENTAL UPDATE) ---

    // Öğretmen Yükü
    this.updateTeacherLoad(teacherId, day, -1);

    // Sınıf Yükü
    if (classId) {
      this.updateClassLoad(classId, day, -1);
    }

    this.stats.updates++;
    this.stats.removes++;
  }

  /**
   * 🎯 YENİ: Öğretmen yük sayaçlarını günceller (O(1))
   * @param {string|number} teacherId
   * @param {number} day
   * @param {number} delta (+1 veya -1)
   */
  updateTeacherLoad(teacherId, day, delta) {
    // Günlük Yük
    const dailyLoads = this.teacherDailyLoad.get(teacherId) || {};
    dailyLoads[day] = (dailyLoads[day] || 0) + delta;
    this.teacherDailyLoad.set(teacherId, dailyLoads);

    // Haftalık Yük
    const weeklyLoad = this.teacherWeeklyLoad.get(teacherId) || 0;
    this.teacherWeeklyLoad.set(teacherId, weeklyLoad + delta);
  }

  /**
   * 🎯 YENİ: Sınıf yük sayaçlarını günceller (O(1))
   * @param {string|number} classId
   * @param {number} day
   * @param {number} delta (+1 veya -1)
   */
  updateClassLoad(classId, day, delta) {
    // Günlük Yük
    const dailyLoads = this.classDailyLoad.get(classId) || {};
    dailyLoads[day] = (dailyLoads[day] || 0) + delta;
    this.classDailyLoad.set(classId, dailyLoads);

    // Haftalık Yük
    const weeklyLoad = this.classWeeklyLoad.get(classId) || 0;
    this.classWeeklyLoad.set(classId, weeklyLoad + delta);
  }

  // ============================================
  // 🎯 WCS/SCORING İÇİN HIZLI ERİŞİM METOTLARI (CACHE HIT)
  // ============================================

  /**
   * Öğretmenin o gün kaç dersi olduğunu Cache'den döndürür (O(1)).
   * WCS.countTeacherDailyLessons yerine kullanılacak.
   */
  getTeacherDailyCount(teacherId, day) {
    const dailyLoads = this.teacherDailyLoad.get(teacherId) || {};
    return dailyLoads[day] || 0;
  }

  /**
   * Öğretmenin o haftaki toplam ders sayısını Cache'den döndürür (O(1)).
   */
  getTeacherWeeklyCount(teacherId) {
    return this.teacherWeeklyLoad.get(teacherId) || 0;
  }

  /**
   * Sınıfın o gün kaç dersi olduğunu Cache'den döndürür (O(1)).
   */
  getClassDailyCount(classId, day) {
    const dailyLoads = this.classDailyLoad.get(classId) || {};
    return dailyLoads[day] || 0;
  }

  /**
   * Sınıfın o haftaki toplam ders sayısını Cache'den döndürür (O(1)).
   */
  getClassWeeklyCount(classId) {
    return this.classWeeklyLoad.get(classId) || 0;
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Öğretmenin tüm atamalarını al (Sadece bir öğretmenin gün/saat listesini almak için hızlı arama).
   * Teacher Gap (Boş Pencere) hesaplaması için idealdir.
   */
  getTeacherAssignments(teacherId) {
    const assignments = [];

    for (const [key, assignment] of this.assignments.entries()) {
      if (assignment.teacherId === teacherId) {
        assignments.push(assignment);
      }
    }

    return assignments;
  }

  // ============================================
  // LEGACY METHODS (Geriye uyumluluk)
  // ============================================

  hasTeacherConflict(teacherId, day, time) {
    // 🚨 NOT: Bu metotlar, add/remove sırasında tam olarak güncellenmez.
    // hasConflict metodu kullanılmalıdır.
    this.stats.hits++;
    const key = `${teacherId}_${day}_${time}`;
    return this.teacherSchedule.has(key);
  }

  // (Diğer legacy metotlar: addLesson, removeLesson, updateLesson, checkConflict, hasConflict, hasClassConflict, hasRoomConflict, getTeacherSchedule, getClassSchedule, getConflicts, getAllConflicts, getStats, printStats, debug, validate, isTeacherAvailable, isClassAvailable, isRoomAvailable, hasAnyConflict, addAssignment, removeAssignment)

  // ... (Geriye kalan tüm metotlar burada olmalıdır, ancak yer tasarrufu için tekrar kopyalanmamıştır.)

  // Geriye uyumluluk için, orijinal kodunuzdaki tüm metotları (üstteki 'hasTeacherConflict' sonrası)
  // BURAYA EKLİYORUZ.

  // ============================================
  // ORİJİNAL KODUN DEVAMI (Tam Kopyala-Yapıştır)
  // ============================================

  // Aşağıdaki kısım, sizin orijinal kodunuzun kesintisiz devamıdır ve V2.1 iyileştirmeleri ile birlikte çalışacaktır.

  /**
   * Ders ekle - schedule-algorithm-v2.js uyumlu metod
   */
  addLesson(lesson, day, time) {
    // 🛡️ NULL/UNDEFINED kontrolü
    if (!lesson) {
      console.warn("⚠️ addLesson: lesson objesi null!");
      return;
    }

    // 🛡️ STRING kontrolü (EKSTRA GÜVENLİK)
    if (typeof lesson === "string") {
      console.warn("⚠️ addLesson: lesson bir string, obje olmalı:", lesson);
      return;
    }

    // 🛡️ OBJE kontrolü
    if (typeof lesson !== "object") {
      console.warn("⚠️ addLesson: lesson geçersiz tip:", typeof lesson, lesson);
      return;
    }

    // 📋 Debug: Gelen property'leri göster
    // console.log("🔍 addLesson çağrıldı:", {
    //   lesson: lesson,
    //   keys: Object.keys(lesson),
    //   day: day,
    //   time: time,
    // });

    // 🔧 Farklı property isimleri destekle
    const teacherId =
      lesson.teacherId || lesson.ogretmenId || lesson.teacher_id;
    const classId =
      lesson.classId || lesson.sinifId || lesson.class_id || lesson.className;
    const lessonId =
      lesson.lessonId || lesson.dersId || lesson.ders_id || lesson.id;
    const roomId = lesson.roomId || lesson.odaId || lesson.room_id;

    if (!teacherId) {
      console.error("❌ addLesson: teacherId bulunamadı!");
      // console.error("📋 Mevcut property'ler:", Object.keys(lesson));
      // console.error("📦 Lesson objesi:", lesson);
      return;
    }

    const normalizedLesson = {
      teacherId: teacherId,
      classId: classId,
      lessonId: lessonId,
      day: day,
      time: time,
      roomId: roomId,
    };

    this.add(normalizedLesson, day, time);

    // console.log(
    //   `✅ addLesson: Öğretmen ${teacherId}, Sınıf ${classId}, Gün ${day}, Saat ${time}`
    // );
  }

  /**
   * Ders sil - schedule-algorithm-v2.js uyumlu metod
   */
  removeLesson(lesson, day, time) {
    if (!lesson) {
      console.warn("⚠️ removeLesson: lesson objesi null!");
      return;
    }

    const teacherId =
      lesson.teacherId || lesson.ogretmenId || lesson.teacher_id;

    if (!teacherId) {
      console.warn("⚠️ removeLesson: teacherId bulunamadı!", lesson);
      return;
    }

    const normalizedLesson = {
      teacherId: teacherId,
      classId: lesson.classId || lesson.sinifId,
      roomId: lesson.roomId || lesson.odaId,
    };

    this.remove(normalizedLesson, day, time);

    // console.log(
    //   `🗑️ removeLesson: Öğretmen ${teacherId}, Gün ${day}, Saat ${time}`
    // );
  }

  /**
   * Ders güncelle
   */
  updateLesson(oldLesson, newLesson, day, time) {
    if (oldLesson) {
      this.removeLesson(oldLesson, day, time);
    }
    if (newLesson) {
      this.addLesson(newLesson, day, time);
    }
  }

  /**
   * Çakışma kontrolü - schedule-algorithm-v2.js uyumlu metod
   */
  checkConflict(lesson, day, time) {
    if (!lesson) return false;

    const teacherId =
      lesson.teacherId || lesson.ogretmenId || lesson.teacher_id;
    const classId = lesson.classId || lesson.sinifId || lesson.class_id;

    if (!teacherId) return false;

    return this.hasConflict(teacherId, day, time, classId);
  }

  /**
   * Ders yerleştirilebilir mi?
   */
  canPlaceLesson(lesson, day, time) {
    return !this.checkConflict(lesson, day, time);
  }

  /**
   * Öğretmen müsait mi?
   */
  isTeacherAvailable(teacherId, day, time) {
    return !this.hasTeacherConflict(teacherId, day, time);
  }

  /**
   * Sınıf müsait mi?
   */
  isClassAvailable(classId, day, time) {
    return !this.hasClassConflict(classId, day, time);
  }

  /**
   * Oda müsait mi?
   */
  isRoomAvailable(roomId, day, time) {
    return !this.hasRoomConflict(roomId, day, time);
  }

  // ============================================
  // CONFLICT CHECKING - ANA METODLAR
  // ============================================

  /**
   * Çakışma var mı kontrol et (ANA METOD)
   * @param {number} teacherId - Öğretmen ID
   * @param {number} day - Gün (1-5)
   * @param {number} time - Saat (1-8)
   * @param {string|number} classId - Sınıf ID (opsiyonel)
   * @returns {boolean} - Çakışma varsa true
   */
  hasConflict(teacherId, day, time, classId = null) {
    this.stats.hits++;

    // Teacher Conflict Check (O(1))
    const teacherKey = `${teacherId}_${day}_${time}`;
    if (this.assignments.has(teacherKey)) {
      const existing = this.assignments.get(teacherKey);

      // Aynı sınıf için ikinci bir ders atanmasını engeller
      // (Aslında Class Conflict check ile yakalanır, ama ekstra güvenlik)
      if (classId && existing.classId === classId) {
        // Aynı öğretmen, aynı saatte kendi sınıfında ikinci bir dersi deniyorsa (Bu, Hard Constraint olmamalı, çözümün yapısı hatası)
        // Burada Teacher Conflict'i kontrol ediyoruz, Class Conflict ayrı kontrol edilir.
        return true;
      }

      // Başka bir sınıfa atanmışsa (Gerçek Teacher Conflict)
      if (!classId || existing.classId !== classId) {
        return true; // Farklı sınıfa atanmış, çakışma var
      }
    }

    // Class Conflict Check (O(1))
    if (classId) {
      const classKey = `${classId}_${day}_${time}`;
      if (this.classSchedule.has(classKey)) {
        return true; // Sınıf dolu, çakışma var
      }
    }

    // Room Conflict Check (O(1)) - Lesson objesinde roomId yoksa atlanır
    // RoomId'nin lesson objesi içinde olduğu varsayılır.
    // Ancak bu metot sadece ID'lerle çalıştığı için tam oda kontrolü `canPlaceLesson` içinde yapılmalıdır.

    this.stats.misses++;
    return false;
  }

  /**
   * Assignment ekle (ANA METOD)
   */
  addAssignment(teacherId, day, time, classId, lessonId) {
    const assignment = {
      teacherId,
      classId,
      lessonId,
      day,
      time,
    };

    this.add(assignment, day, time);
  }

  /**
   * Assignment sil (ANA METOD)
   */
  removeAssignment(teacherId, day, time) {
    const assignment = {
      teacherId,
      day,
      time,
    };

    this.remove(assignment, day, time);
  }

  // ============================================
  // LEGACY METHODS (Geriye uyumluluk)
  // ============================================

  hasClassConflict(classId, day, time) {
    this.stats.hits++;
    const key = `${classId}_${day}_${time}`;
    return this.classSchedule.has(key);
  }

  hasRoomConflict(roomId, day, time) {
    this.stats.hits++;
    const key = `${roomId}_${day}_${time}`;
    return this.roomSchedule.has(key);
  }

  hasAnyConflict(lesson, day, time) {
    if (!lesson) return false;

    const teacherId = lesson.teacherId || lesson.ogretmenId;
    const classId = lesson.classId || lesson.sinifId;
    const roomId = lesson.roomId || lesson.odaId;

    return (
      (teacherId && this.hasTeacherConflict(teacherId, day, time)) ||
      (classId && this.hasClassConflict(classId, day, time)) ||
      (roomId && this.hasRoomConflict(roomId, day, time))
    );
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  getTeacherSchedule(teacherId) {
    const schedule = [];

    for (const [key, data] of this.teacherSchedule.entries()) {
      if (key.startsWith(`${teacherId}_`)) {
        schedule.push(data);
      }
    }

    return schedule;
  }

  getClassSchedule(classId) {
    const schedule = [];

    for (const [key, data] of this.classSchedule.entries()) {
      if (key.startsWith(`${classId}_`)) {
        schedule.push(data);
      }
    }

    return schedule;
  }

  getConflicts() {
    return { ...this.conflicts };
  }

  getAllConflicts() {
    const conflicts = [];

    // Teacher conflicts
    const teacherCounts = new Map();
    for (const key of this.teacherSchedule.keys()) {
      // Key formatı: T_D_T
      const parts = key.split("_");
      if (parts.length < 3) continue; // Geçersiz key
      const [teacherId, day, time] = parts;

      const countKey = `${teacherId}_${day}_${time}`;
      const count = teacherCounts.get(countKey) || 0;
      teacherCounts.set(countKey, count + 1);

      if (count > 0) {
        conflicts.push({
          type: "teacher",
          teacherId: parseInt(teacherId),
          day: parseInt(day),
          time: parseInt(time),
          count: count + 1,
        });
      }
    }

    // Class conflicts
    const classCounts = new Map();
    for (const key of this.classSchedule.keys()) {
      // Key formatı: C_D_T
      const parts = key.split("_");
      if (parts.length < 3) continue; // Geçersiz key
      const [classId, day, time] = parts;

      const countKey = `${classId}_${day}_${time}`;
      const count = classCounts.get(countKey) || 0;
      classCounts.set(countKey, count + 1);

      if (count > 0) {
        conflicts.push({
          type: "class",
          classId,
          day: parseInt(day),
          time: parseInt(time),
          count: count + 1,
        });
      }
    }

    return conflicts;
  }

  // ============================================
  // STATISTICS
  // ============================================

  getStats() {
    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRate =
      totalOperations > 0
        ? ((this.stats.hits / totalOperations) * 100).toFixed(1)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: {
        teachers: this.teacherSchedule.size,
        classes: this.classSchedule.size,
        rooms: this.roomSchedule.size,
        assignments: this.assignments.size,
      },
      conflicts: this.conflicts,
      loads: {
        teacherDaily: this.teacherDailyLoad.size,
        classDaily: this.classDailyLoad.size,
      },
    };
  }

  printStats() {
    const stats = this.getStats();

    console.log("\n📊 CACHE İSTATİSTİKLERİ");
    console.log("=".repeat(40));
    console.log(`Cache Boyutu:`);
    console.log(`  • Teachers: ${stats.cacheSize.teachers}`);
    console.log(`  • Classes: ${stats.cacheSize.classes}`);
    console.log(`  • Rooms: ${stats.cacheSize.rooms}`);
    console.log(`  • Assignments: ${stats.cacheSize.assignments}`);
    console.log(`\nPerformans:`);
    console.log(`  • Hit Rate: ${stats.hitRate}`);
    console.log(`  • Hits: ${stats.hits}`);
    console.log(`  • Misses: ${stats.misses}`);
    console.log(`  • Updates: ${stats.updates}`);
    console.log(`  • Adds: ${stats.adds}`);
    console.log(`  • Removes: ${stats.removes}`);
    console.log(`\nÇakışmalar:`);
    console.log(`  • Teacher: ${stats.conflicts.teacher}`);
    console.log(`  • Class: ${stats.conflicts.class}`);
    console.log(`  • Room: ${stats.conflicts.room}`);
    console.log(`  • Total: ${stats.conflicts.total}`);
    console.log("=".repeat(40) + "\n");
  }

  // ============================================
  // DEBUG & UTILITY
  // ============================================

  /**
   * Cache durumunu debug et
   */
  debug() {
    console.log("🔍 === CACHE DEBUG ===");
    console.log("Assignments:", this.assignments.size);
    console.log("Teacher Schedule:", this.teacherSchedule.size);
    console.log("Class Schedule:", this.classSchedule.size);
    console.log("Room Schedule:", this.roomSchedule.size);
    console.log(
      "Teacher Daily Load (örnek):",
      this.teacherDailyLoad.get(Array.from(this.teacherDailyLoad.keys())[0])
    );
    console.log(
      "Teacher Weekly Load (örnek):",
      this.teacherWeeklyLoad.get(Array.from(this.teacherWeeklyLoad.keys())[0])
    );
    console.log("\nÖrnek Assignments (ilk 5):");

    let count = 0;
    for (const [key, assignment] of this.assignments.entries()) {
      if (count >= 5) break;
      console.log(`  ${key}:`, assignment);
      count++;
    }

    console.log("=".repeat(40));
  }

  /**
   * Cache'in sağlıklı olup olmadığını kontrol et
   */
  validate() {
    const issues = [];

    // Boyut tutarlılığı kontrolü
    if (this.assignments.size !== this.teacherSchedule.size) {
      issues.push(
        `Assignment ve teacher schedule boyutları uyuşmuyor: ${this.assignments.size} vs ${this.teacherSchedule.size}`
      );
    }

    // Veri tutarlılığı kontrolü
    for (const [key, assignment] of this.assignments.entries()) {
      if (!assignment.teacherId) {
        issues.push(`Assignment'ta teacherId yok: ${key}`);
      }
      if (!assignment.day || !assignment.time) {
        issues.push(`Assignment'ta day/time yok: ${key}`);
      }

      // Load/Assignment tutarlılığı
      const dailyCount = this.getTeacherDailyCount(
        assignment.teacherId,
        assignment.day
      );
      if (dailyCount <= 0) {
        issues.push(
          `Load counter hatası: Öğretmen ${assignment.teacherId}'nin ${assignment.day} gününde dersi 0 veya negatif.`
        );
      }
    }

    if (issues.length > 0) {
      console.error("❌ Cache validation başarısız:");
      issues.forEach((issue) => console.error(`  • ${issue}`));
      return false;
    }

    console.log("✅ Cache validation başarılı");
    return true;
  }
}

// Global export
if (typeof window !== "undefined") {
  window.IncrementalConflictCache = IncrementalConflictCache;
  console.log("✅ IncrementalConflictCache yüklendi (V2.1)");
}

// Node.js export
if (typeof module !== "undefined" && module.exports) {
  module.exports = IncrementalConflictCache;
}

// 🌍 Global erişim
window.IncrementalConflictCache = IncrementalConflictCache;
console.log("📦 IncrementalConflictCache global erişim aktif! (V2.1)");
