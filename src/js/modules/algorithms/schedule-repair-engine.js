/**
 * ============================================
 * SCHEDULE REPAIR ENGINE - Program Onarım Motoru
 * ============================================
 * Hatalı yerleşimleri (çakışmalar, sert kural ihlalleri) tespit edip
 * çözümü yeniden optimize etmek yerine lokal olarak düzeltmeye odaklanır.
 */
class ScheduleRepairEngine {
  /**
   * @param {object} scheduler - Scheduler objesine erişim için
   */
  constructor(scheduler) {
    this.scheduler = scheduler;
    console.log(
      "🩹 ScheduleRepairEngine başlatıldı: Otomatik onarım mekanizması aktif."
    );
  }

  /**
   * Hatalı bir dersi (slot) otomatik olarak düzeltmeye çalışır.
   * Onarım, dersi **silmek** yerine daha uygun bir yere **taşımayı** hedefler.
   *
   * @param {Object} solution Hatalı çözüm objesi (solution.schedule içerir).
   * @param {Array<Object>} conflicts Tespit edilen ihlallerin listesi (Örn: QualityAssurance'dan gelen).
   * @returns {Object} Onarılmış çözümü ve düzeltilen ihlal sayısını içeren obje.
   */
  repair(solution, conflicts = []) {
    // Çözümün derin bir kopyasını al (Mevcut schedule'ı bozmamak için)
    const currentSchedule = solution.schedule
      ? JSON.parse(JSON.stringify(solution.schedule))
      : {};

    let fixedViolations = 0;
    let repairedSchedule = currentSchedule;

    if (conflicts.length === 0) {
      console.log("[RepairEngine] INFO: Onarılacak aktif ihlal bulunamadı.");
      // İhlal yoksa, programı olduğu gibi döndür
      return { schedule: currentSchedule, fixedViolations: 0 };
    }

    console.log(
      `[RepairEngine] 🔄 Toplam ${conflicts.length} ihlal onarılmaya çalışılıyor.`
    );

    // --- Onarım Döngüsü ---
    for (const conflict of conflicts) {
      // Varsayım: Conflict objesi classId, day, hour, lessonId gibi bilgileri içerir.

      const { classId, day, hour, lessonId } = conflict;

      // KRİTİK MANTIK DEĞİŞİKLİĞİ: Dersi silme, yeniden yerleştir!

      // 1. İhlal olan dersi/slotu çıkar (Onarımı başlat)
      const lessonToRepair = repairedSchedule[classId]?.[day]?.[hour];

      if (!lessonToRepair || lessonToRepair.lessonId !== lessonId) continue;

      // Slotu boşalt
      repairedSchedule[classId][day][hour] = null;

      // 2. Yeni bir uygun slot bul (Taşıma mantığı)
      // Gerçek bir uygulamada burada bir Arama veya Gözlemci Algoritması (Heuristic) çalışır.
      const newSlot = this.findBestNewSlot(repairedSchedule, lessonToRepair);

      if (newSlot) {
        // 3. Dersi yeni, uygun slota yerleştir
        repairedSchedule[newSlot.classId][newSlot.day][newSlot.hour] =
          lessonToRepair;
        fixedViolations++;
        window.logger?.debug(
          `Lesson ${lessonId} moved to ${newSlot.day}-${newSlot.hour} in ${newSlot.classId}.`,
          conflict
        );
      } else {
        // Eğer uygun yeni slot bulunamazsa, ders çıkarılmış olarak kalır.
        // Bu, EKSİK DERS sayısını artırır, ancak sert çakışmayı çözer.
        window.logger?.warn(
          `Lesson ${lessonId} could not be relocated and was removed from the schedule.`,
          conflict
        );
      }
    }

    console.log(
      `[RepairEngine] ✅ Onarım tamamlandı. Başarıyla düzeltilen ihlal sayısı: ${fixedViolations}`
    );

    return {
      schedule: repairedSchedule, // Onarılmış program döndürülüyor
      fixedViolations: fixedViolations,
    };
  }

  /**
   * Bir ders için çatışma yaratmayacak en iyi yeni slotu bulur (Basit Simülasyon).
   * Gerçek uygulamada, en iyi fitness artışını sağlayan slot aranır.
   *
   * @param {Object} schedule - Mevcut program
   * @param {Object} lesson - Taşınacak ders objesi
   * @returns {Object|null} - {classId, day, hour} veya null
   */
  findBestNewSlot(schedule, lesson) {
    // Bu, basit bir boş slot bulucu simülasyonudur.
    // Gerçek bir onarım motoru, burada programın tüm kısıtlamalarını kontrol etmelidir.

    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"]; // Örnek gün listesi
    const hours = [1, 2, 3, 4, 5, 6, 7]; // Örnek saat listesi

    // Sadece dersin ait olduğu sınıfta boş slot ara
    const classId = lesson.classId;

    for (const day of days) {
      for (const hour of hours) {
        const hourStr = hour.toString();

        // 1. Slotun boş olup olmadığını kontrol et
        if (schedule[classId]?.[day]?.[hourStr] === null) {
          // 2. (Simülasyon) Başka sert çakışma yaratıp yaratmayacağını kontrol et
          // Örneğin: Öğretmen bu saatte başka bir sınıfta ders yapmıyor mu?

          // Eğer bu kontrolleri geçerse, bu bir adaydır.
          return { classId, day, hour: hourStr };
        }
      }
    }

    return null; // Uygun yer bulunamadı
  }
}
// Global erişime açma
if (typeof window !== "undefined")
  window.ScheduleRepairEngine = ScheduleRepairEngine;
