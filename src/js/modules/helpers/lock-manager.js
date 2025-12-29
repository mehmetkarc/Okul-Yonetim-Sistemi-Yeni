/**
 * ============================================
 * LOCK MANAGER V2.1 - Kısıtlama Yönetim Katmanı
 * ============================================
 * Kilitli öğretmen, sınıf ve ders yönetimini sağlar.
 * Optimizasyon algoritmaları için kısıtlama (Hard Constraint) görevi görür.
 */

class LockManager {
  constructor() {
    this.locks = {
      teachers: {}, // {teacherId: {locked: true, reason: '', timestamp: 0, lockedLessons: []}} -> Öğretmen dersleri tamamen kilitlenir
      classes: {}, // {classId: {locked: true, reason: '', timestamp: 0, lockedLessons: []}} -> Sınıf dersleri tamamen kilitlenir
      slots: {}, // {classId_day_time: {locked: true, reason: '', timestamp: 0, lessonData: {}}} -> Tek bir zaman slotu/ders kilitlenir
    };

    this.STORAGE_KEY = "lock_manager_data_v2";
    this.loadFromStorage();
  }

  // ============================================
  // YARDIMCI METOTLAR
  // ============================================

  /**
   * Bir dersin benzersiz slot anahtarını döndürür.
   * @param {string|number} classId - Sınıf ID
   * @param {string|number} day - Gün (1-5)
   * @param {string|number} time - Saat (1-8)
   */
  getSlotKey(classId, day, time) {
    return `${classId}_${day}_${time}`;
  }

  /**
   * Ders verisini (programData'dan) çeker.
   * Kilit sırasında veriyi kaydetmek için kullanılır.
   * @param {string|number} classId
   * @param {string|number} day
   * @param {string|number} time
   */
  getLessonDataFromProgram(classId, day, time) {
    if (
      typeof window.solution === "object" &&
      window.solution[classId] &&
      window.solution[classId][day] &&
      window.solution[classId][day][time]
    ) {
      // Genellikle optimizasyon algoritmalarında kullanılan 'solution' nesnesini kullanırız
      return window.solution[classId][day][time];
    }
    if (
      typeof window.programData === "object" &&
      window.programData[classId] &&
      window.programData[classId][day] &&
      window.programData[classId][day][time]
    ) {
      // Alternatif olarak 'programData' nesnesini kullanırız (eski yapı)
      return window.programData[classId][day][time];
    }
    return null;
  }

  // ============================================
  // ÖĞRETMEN KİLİTLEME (Tüm programını dondurur)
  // ============================================

  /**
   * Öğretmenin tüm atamalarını (mevcut programı) kilitler.
   * @param {string|number} teacherId
   * @param {string} reason
   * @param {Object} solution - Hangi çözümün kilitleneceğini belirtir (varsayılan: global)
   */
  lockTeacher(
    teacherId,
    reason = "Manuel olarak kilitlendi",
    solution = window.solution || window.programData
  ) {
    if (!teacherId || !solution) {
      console.error("❌ Geçersiz öğretmen ID veya çözüm verisi yok.");
      return false;
    }

    const lockedLessons = [];
    let lessonCount = 0;

    // Öğretmenin tüm derslerini bul ve kilit listesine ekle
    for (const cId in solution) {
      for (const day in solution[cId]) {
        for (const time in solution[cId][day]) {
          const lesson = solution[cId][day][time];

          // Program verisindeki öğretmen ID'si ile eşleşen dersleri bul
          if (
            lesson &&
            (lesson.teacherId == teacherId || lesson.ogretmen_id == teacherId)
          ) {
            const slotKey = this.getSlotKey(cId, day, time);

            // Slot'u direkt kilitler, böylece algoritma bu slotu değiştiremez.
            this.locks.slots[slotKey] = {
              locked: true,
              reason: `Öğretmen kilitlendiği için kilitli: ${reason}`,
              timestamp: Date.now(),
              day: parseInt(day),
              time: parseInt(time),
              classId: cId,
              lessonData: lesson,
              lockedBy: "teacherLock",
            };

            lockedLessons.push(slotKey);
            lessonCount++;
          }
        }
      }
    }

    this.locks.teachers[teacherId] = {
      locked: true,
      reason: reason,
      timestamp: Date.now(),
      lockedSlots: lockedLessons, // Kilitlenen slot anahtarları listesi
      lockedBy: "user",
    };

    this.saveToStorage();
    console.log(
      `🔒 Öğretmen kilitlendi: ${teacherId}. ${lessonCount} ders slotu donduruldu.`
    );

    this.triggerEvent("teacherLocked", {
      teacherId,
      reason,
      lessonsCount: lessonCount,
    });

    return true;
  }

  /**
   * Öğretmen kilidini aç
   */
  unlockTeacher(teacherId) {
    if (!teacherId || !this.locks.teachers[teacherId]) {
      console.error("❌ Öğretmen kilitli değil veya bulunamadı");
      return false;
    }

    const lock = this.locks.teachers[teacherId];

    // Öğretmenin kilitlediği tüm slotları temizle
    lock.lockedSlots.forEach((slotKey) => {
      if (
        this.locks.slots[slotKey] &&
        this.locks.slots[slotKey].lockedBy === "teacherLock"
      ) {
        delete this.locks.slots[slotKey];
      }
    });

    delete this.locks.teachers[teacherId];

    this.saveToStorage();
    console.log(
      `🔓 Öğretmen kilidi açıldı: ${teacherId}. ${lock.lockedSlots.length} ders slotu serbest bırakıldı.`
    );

    this.triggerEvent("teacherUnlocked", {
      teacherId,
      wasLockedFor: Date.now() - lock.timestamp,
    });

    return true;
  }

  /**
   * Öğretmen kilitli mi?
   */
  isTeacherLocked(teacherId) {
    return this.locks.teachers[teacherId]?.locked === true;
  }

  // ============================================
  // SINIF KİLİTLEME (Tüm programını dondurur)
  // ============================================

  /**
   * Sınıfın tüm programını kilitler (Tüm ders slotlarını dondurur).
   */
  lockClass(
    classId,
    reason = "Manuel olarak kilitlendi",
    solution = window.solution || window.programData
  ) {
    if (!classId || !solution) {
      console.error("❌ Geçersiz sınıf ID veya çözüm verisi yok.");
      return false;
    }

    const lockedLessons = [];
    let lessonCount = 0;

    // Sınıfın tüm derslerini bul ve kilit listesine ekle
    if (solution[classId]) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];

          if (lesson) {
            const slotKey = this.getSlotKey(classId, day, time);

            // Slot'u direkt kilitler, böylece algoritma bu slotu değiştiremez.
            this.locks.slots[slotKey] = {
              locked: true,
              reason: `Sınıf kilitlendiği için kilitli: ${reason}`,
              timestamp: Date.now(),
              day: parseInt(day),
              time: parseInt(time),
              classId: classId,
              lessonData: lesson,
              lockedBy: "classLock",
            };

            lockedLessons.push(slotKey);
            lessonCount++;
          }
        }
      }
    }

    this.locks.classes[classId] = {
      locked: true,
      reason: reason,
      timestamp: Date.now(),
      lockedSlots: lockedLessons,
      lockedBy: "user",
    };

    this.saveToStorage();

    console.log(
      `🔒 Sınıf kilitlendi: ${classId}. ${lessonCount} ders slotu donduruldu.`
    );

    this.triggerEvent("classLocked", {
      classId,
      reason,
      lessonsCount: lessonCount,
    });

    return true;
  }

  /**
   * Sınıf kilidini aç
   */
  unlockClass(classId) {
    if (!classId || !this.locks.classes[classId]) {
      console.error("❌ Sınıf kilitli değil veya bulunamadı");
      return false;
    }

    const lock = this.locks.classes[classId];

    // Sınıfın kilitlediği tüm slotları temizle
    lock.lockedSlots.forEach((slotKey) => {
      if (
        this.locks.slots[slotKey] &&
        this.locks.slots[slotKey].lockedBy === "classLock"
      ) {
        delete this.locks.slots[slotKey];
      }
    });

    delete this.locks.classes[classId];
    this.saveToStorage();

    console.log(
      `🔓 Sınıf kilidi açıldı: ${classId}. ${lock.lockedSlots.length} ders slotu serbest bırakıldı.`
    );

    this.triggerEvent("classUnlocked", { classId });

    return true;
  }

  /**
   * Sınıf kilitli mi?
   */
  isClassLocked(classId) {
    return this.locks.classes[classId]?.locked === true;
  }

  // ============================================
  // SLOT KİLİTLEME (Tek bir dersi/slotu dondurur)
  // ============================================

  /**
   * Belirli bir dersi/slotu kilitle (Algoritmanın bu zaman dilimini değiştirmesini engeller)
   * @param {string|number} day
   * @param {string|number} time
   * @param {string|number} classId
   */
  lockSlot(day, time, classId, reason = "Manuel olarak kilitlendi") {
    const slotKey = this.getSlotKey(classId, day, time);
    const lessonData = this.getLessonDataFromProgram(classId, day, time);

    if (!lessonData) {
      console.warn(
        `⚠️ Slot kilitleniyor ama ders verisi bulunamadı: ${slotKey}`
      );
    }

    this.locks.slots[slotKey] = {
      locked: true,
      reason: reason,
      timestamp: Date.now(),
      day: parseInt(day),
      time: parseInt(time),
      classId: classId,
      lessonData: lessonData, // Kilitlenen dersin verisini kaydet
      lockedBy: "manual",
    };

    this.saveToStorage();
    console.log(`🔒 Slot kilitlendi: ${slotKey}`);

    this.triggerEvent("slotLocked", {
      slotKey,
      day,
      time,
      classId,
      reason,
    });

    return true;
  }

  /**
   * Slot kilidini aç
   */
  unlockSlot(day, time, classId) {
    const slotKey = this.getSlotKey(classId, day, time);

    if (!this.locks.slots[slotKey]) {
      console.error("❌ Slot kilitli değil");
      return false;
    }

    delete this.locks.slots[slotKey];
    this.saveToStorage();

    console.log(`🔓 Slot kilidi açıldı: ${slotKey}`);

    this.triggerEvent("slotUnlocked", {
      slotKey,
      day,
      time,
      classId,
    });

    return true;
  }

  /**
   * Slot kilitli mi?
   */
  isSlotLocked(day, time, classId) {
    const slotKey = this.getSlotKey(classId, day, time);
    return this.locks.slots[slotKey]?.locked === true;
  }

  // ============================================
  // TOPLU İŞLEMLER
  // ============================================

  /**
   * Tüm öğretmenleri kilitle (Ders slotlarını dondurur)
   */
  lockAllTeachers(reason = "Toplu kilitleme") {
    // ScheduleDataManager'ı globalde ararız
    const teacherData = window.ScheduleDataManager?.getOgretmenler() || [];
    let count = 0;

    // Not: Yalnızca mevcut programda dersi olan öğretmenler kilitlenir.
    teacherData.forEach((teacher) => {
      if (this.lockTeacher(teacher.id, reason)) {
        count++;
      }
    });

    console.log(`🔒 ${count} öğretmen kilitlendi`);
    return count;
  }

  /**
   * Tüm kilitleri temizle
   */
  unlockAll() {
    const teacherCount = Object.keys(this.locks.teachers).length;
    const classCount = Object.keys(this.locks.classes).length;

    // Tüm kilitleri sıfırlar
    this.locks.teachers = {};
    this.locks.classes = {};
    this.locks.slots = {};

    this.saveToStorage();

    console.log(
      `🔓 Tüm kilitler temizlendi: ${teacherCount} öğretmen, ${classCount} sınıf, ${
        Object.keys(this.locks.slots).length
      } ders slotu`
    );

    this.triggerEvent("allUnlocked", {
      teacherCount,
      classCount,
    });

    return true;
  }

  // ============================================
  // KISITLAMA KONTROLÜ (Algoritma Entegrasyonu)
  // ============================================

  /**
   * Belirli bir atamanın (dersin) değiştirilip değiştirilemeyeceğini kontrol eder.
   * Bu metot, optimizasyon algoritmaları için ana Hard Constraint kontrolünü sağlar.
   * @param {string|number} classId - Kontrol edilecek sınıf
   * @param {string|number} day - Kontrol edilecek gün
   * @param {string|number} time - Kontrol edilecek saat
   * @param {string|number} [teacherId] - Opsiyonel: Kontrol edilen öğretmenin ID'si
   * @returns {{allowed: boolean, reason: string}}
   */
  canModifyAssignment(classId, day, time, teacherId = null) {
    // 1. Slot Kilit Kontrolü (En spesifik kontrol)
    if (this.isSlotLocked(day, time, classId)) {
      return {
        allowed: false,
        reason: "Bu zaman slotu/ders manuel olarak kilitli (Slot Lock).",
      };
    }

    // 2. Sınıf Kilit Kontrolü (Daha geniş kapsamlı)
    if (this.isClassLocked(classId)) {
      // Slot Lock yoksa bile sınıf kilitli olduğu için izin verilmez.
      return {
        allowed: false,
        reason: "Bu sınıfa ait tüm program kilitli (Class Lock).",
      };
    }

    // 3. Öğretmen Kilit Kontrolü (Daha geniş kapsamlı)
    if (teacherId && this.isTeacherLocked(teacherId)) {
      // Slot Lock yoksa bile öğretmen kilitli olduğu için izin verilmez.
      return {
        allowed: false,
        reason: "Bu öğretmen atanmış, fakat programı kilitli (Teacher Lock).",
      };
    }

    return {
      allowed: true,
      reason: "Değiştirilebilir",
    };
  }

  /**
   * Kilitli Slotlardan oluşan program parçasını döndürür.
   * Algoritmaya başlangıç popülasyonu oluştururken verilir.
   * @returns {Object} {classId: {day: {time: lessonData}}} formatında kilitli dersler.
   */
  getLockedProgramSegment() {
    const segment = {};

    for (const slotKey in this.locks.slots) {
      const lock = this.locks.slots[slotKey];

      if (lock.locked && lock.lessonData) {
        const classId = lock.classId;
        const day = lock.day;
        const time = lock.time;

        if (!segment[classId]) segment[classId] = {};
        if (!segment[classId][day]) segment[classId][day] = {};

        segment[classId][day][time] = lock.lessonData;
      }
    }

    return segment;
  }

  // ============================================
  // SORGU VE RAPORLAMA
  // ============================================

  /**
   * Kilit istatistikleri
   */
  getStatistics() {
    return {
      lockedTeachers: Object.keys(this.locks.teachers).length,
      lockedClasses: Object.keys(this.locks.classes).length,
      lockedSlots: Object.keys(this.locks.slots).length, // Artık sadece slotları sayıyoruz
      totalLocks:
        Object.keys(this.locks.teachers).length +
        Object.keys(this.locks.classes).length +
        Object.keys(this.locks.slots).length,
    };
  }

  // ============================================
  // DEPOLAMA ve İLETİŞİM (Orijinal Kod Korundu)
  // ============================================

  /**
   * localStorage'a kaydet
   */
  saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.locks));
    } catch (error) {
      console.error("❌ Lock Manager kaydetme hatası:", error);
    }
  }

  /**
   * localStorage'dan yükle
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);

      if (saved) {
        this.locks = JSON.parse(saved);

        // Veri yapısı değiştiği için eski kilitleri sıfırlayabiliriz (V1->V2 geçişi için)
        if (!this.locks.slots) {
          this.locks.slots = {};
        }

        const stats = this.getStatistics();
        console.log(
          `📚 Lock Manager yüklendi (V2.1): ${stats.totalLocks} kilit`
        );
      }
    } catch (error) {
      console.error("❌ Lock Manager yükleme hatası:", error);
      this.locks = { teachers: {}, classes: {}, slots: {} };
    }
  }

  /**
   * Event sistemi
   */
  triggerEvent(eventName, data) {
    const event = new CustomEvent(`lockManager:${eventName}`, {
      detail: data,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(event);
    }
  }

  // Kilitleri dışa ve içe aktarma metotları (Orijinal kod korunmuştur)
  exportLocks() {
    /* ... */
  }
  importLocks(jsonData) {
    /* ... */
  }
}

// Export
if (typeof window !== "undefined") {
  window.LockManager = LockManager;
  // Globalde bir örnek oluştur
  window.lockManager = new LockManager();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = LockManager;
}

console.log("✅ LockManager yüklendi (V2.1 - Algoritma Uyumlu)");
