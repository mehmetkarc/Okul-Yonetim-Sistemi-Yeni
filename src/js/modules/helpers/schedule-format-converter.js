/**
 * ================================================================================
 * SCHEDULE FORMAT CONVERTER V1.1 - ÇOKLU ÖĞRETMEN DESTEKLİ
 * ================================================================================
 */

class ScheduleFormatConverter {
  /**
   * SimpleBlockScheduler formatından Algorithm formatına dönüştür
   */
  static simpleBlockToAlgo(simpleSchedule, lessons = []) {
    console.log("\n🔄 FORMAT DÖNÜŞÜMÜ: SimpleBlock → Algorithm");
    console.log("=".repeat(80));

    if (!simpleSchedule || typeof simpleSchedule !== "object") {
      console.error("❌ Geçersiz simpleSchedule objesi!");
      return {};
    }

    const algoSchedule = {};
    let convertedSlots = 0;
    let multiTeacherCount = 0;

    // Ders ID'den blockStructure bulmak için lookup map
    const lessonMap = new Map();
    if (lessons && lessons.length > 0) {
      lessons.forEach((lesson) => {
        const lessonId = lesson.id ? lesson.id.toString() : null;
        if (lessonId) {
          lessonMap.set(lessonId, {
            blockSize: lesson.blockSize || 1,
            blockStructure: lesson.blockStructure || [lesson.weeklyHours || 1],
            weeklyHours: lesson.weeklyHours || 1,
          });
        }
      });
    }

    // Her sınıf için
    for (const classId in simpleSchedule) {
      const isNumericId =
        !isNaN(parseInt(classId)) &&
        classId.toString() === parseInt(classId).toString();

      if (!isNumericId) {
        console.log(`   ⏭️ Atlandı: ${classId} (numeric değil)`);
        continue;
      }

      algoSchedule[classId] = {};

      // Her gün için (1-5 → 0-4)
      for (let simpleDay = 1; simpleDay <= 5; simpleDay++) {
        const algoDay = simpleDay - 1;
        algoSchedule[classId][algoDay] = {};

        if (!simpleSchedule[classId][simpleDay]) {
          continue;
        }

        // Her saat için (1-8 → 0-7)
        for (let simpleHour = 1; simpleHour <= 8; simpleHour++) {
          const algoHour = simpleHour - 1;

          const lesson = simpleSchedule[classId][simpleDay][simpleHour];

          if (!lesson) {
            continue;
          }

          // ✅ YENİ: teacherId formatını düzenle (ÇOKLU ÖĞRETMEN DESTEKLİ!)
          let teacherId = lesson.teacherId;
          let teacherIds = [];

          if (Array.isArray(teacherId)) {
            // Array ise olduğu gibi kullan
            teacherIds = teacherId.filter((id) => id != null && id !== "");
            // Algoritma için primary teacher (ilk öğretmen)
            teacherId = teacherIds.length > 0 ? teacherIds[0] : null;
          } else if (teacherId != null && teacherId !== "") {
            // Tek öğretmen ise array yap
            teacherIds = [teacherId];
          } else {
            teacherId = null;
            teacherIds = [];
          }

          // Çoklu öğretmen kontrolü
          if (teacherIds.length > 1) {
            multiTeacherCount++;
          }

          // Lesson bilgilerini al
          const lessonId = lesson.id ? lesson.id.toString() : null;
          const lessonInfo = lessonId ? lessonMap.get(lessonId) : null;

          // Algorithm formatına dönüştür
          algoSchedule[classId][algoDay][algoHour] = {
            lessonId: lessonId || lesson.id,
            subjectName: lesson.subjectName || "Bilinmeyen",
            subjectId: lesson.subjectId || null,
            subjectCode: lesson.subjectCode || null,
            // ✅ YENİ: Hem primary hem tüm öğretmenler
            teacherId: teacherId, // Primary (ilk öğretmen)
            teacherIds: teacherIds, // Tüm öğretmenler
            isMultiTeacher: teacherIds.length > 1, // Çoklu öğretmen bayrağı
            teacherName: lesson.teacherName || "",
            teacherCode: lesson.teacherCode || "",
            className: lesson.className || "",
            classId: parseInt(classId),
            // Block bilgileri
            blockSize: lessonInfo?.blockSize || 1,
            blockStructure: lessonInfo?.blockStructure || [1],
            weeklyHours: lessonInfo?.weeklyHours || 1,
            // Meta
            isManual: lesson.isManual || false,
          };

          convertedSlots++;
        }
      }
    }

    console.log(`   ✅ Dönüştürülen slot: ${convertedSlots}`);
    console.log(`   👥 Çoklu öğretmenli slot: ${multiTeacherCount}`);
    console.log(`   ✅ Sınıf sayısı: ${Object.keys(algoSchedule).length}`);

    return algoSchedule;
  }

  /**
   * Algorithm formatından SimpleBlockScheduler formatına dönüştür
   */
  static algoToSimpleBlock(algoSchedule, classes = []) {
    console.log("\n🔄 FORMAT DÖNÜŞÜMÜ: Algorithm → SimpleBlock");
    console.log("=".repeat(80));

    if (!algoSchedule || typeof algoSchedule !== "object") {
      console.error("❌ Geçersiz algoSchedule objesi!");
      return {};
    }

    const simpleSchedule = {};
    let convertedSlots = 0;
    let multiTeacherCount = 0;

    // Her sınıf için
    for (const classId in algoSchedule) {
      const classIdStr = classId.toString();

      // SADECE numeric ID için schedule oluştur
      simpleSchedule[classIdStr] = {};

      // Her gün için (0-4 → 1-5)
      for (let algoDay = 0; algoDay <= 4; algoDay++) {
        const simpleDay = algoDay + 1;

        simpleSchedule[classIdStr][simpleDay] = {};

        if (!algoSchedule[classId][algoDay]) {
          continue;
        }

        // Her saat için (0-7 → 1-8)
        for (let algoHour = 0; algoHour <= 7; algoHour++) {
          const simpleHour = algoHour + 1;

          const lesson = algoSchedule[classId][algoDay][algoHour];

          if (!lesson) {
            continue;
          }

          // ✅ teacherId formatını düzenle (ÇOKLU ÖĞRETMEN DESTEKLİ!)
          let teacherId = [];

          // Önce teacherIds array'ine bak
          if (lesson.teacherIds && Array.isArray(lesson.teacherIds)) {
            teacherId = lesson.teacherIds.filter(
              (id) => id != null && id !== ""
            );
          }
          // Yoksa teacherId'den array oluştur
          else if (lesson.teacherId != null && lesson.teacherId !== "") {
            if (Array.isArray(lesson.teacherId)) {
              teacherId = lesson.teacherId.filter(
                (id) => id != null && id !== ""
              );
            } else {
              teacherId = [lesson.teacherId];
            }
          }

          // Çoklu öğretmen kontrolü
          if (teacherId.length > 1) {
            multiTeacherCount++;
          }

          // SimpleBlock formatına dönüştür
          const simpleLesson = {
            id: lesson.lessonId || lesson.id,
            subjectName: lesson.subjectName || "Bilinmeyen",
            subjectId: lesson.subjectId || null,
            teacherId: teacherId, // ✅ Array olarak koru
            teacherName: lesson.teacherName || "",
            className: lesson.className || "",
            classId: parseInt(classIdStr),
            isManual: lesson.isManual || false,
          };

          // SADECE numeric ID'ye ekle
          simpleSchedule[classIdStr][simpleDay][simpleHour] = simpleLesson;

          convertedSlots++;
        }
      }
    }

    console.log(`   ✅ Dönüştürülen slot: ${convertedSlots}`);
    console.log(`   👥 Çoklu öğretmenli slot: ${multiTeacherCount}`);
    console.log(`   ✅ Sınıf sayısı: ${Object.keys(simpleSchedule).length}`);

    return simpleSchedule;
  }

  // ============================================
  // DİĞER METODLAR (AYNI KALIYOR)
  // ============================================

  static isSimpleBlockFormat(schedule) {
    if (!schedule || typeof schedule !== "object") {
      return false;
    }

    for (const classId in schedule) {
      for (const day in schedule[classId]) {
        const dayNum = parseInt(day);
        if (dayNum >= 1 && dayNum <= 5) {
          return true;
        }
        if (dayNum >= 0 && dayNum <= 4) {
          return false;
        }
      }
      break;
    }

    return false;
  }

  static isAlgorithmFormat(schedule) {
    return !this.isSimpleBlockFormat(schedule);
  }

  static autoConvert(schedule, targetFormat, metadata = {}) {
    const isSimple = this.isSimpleBlockFormat(schedule);

    console.log(
      `\n🔍 Format Algılama: ${isSimple ? "SimpleBlock" : "Algorithm"}`
    );
    console.log(`🎯 Hedef Format: ${targetFormat}`);

    if (targetFormat === "algorithm" && isSimple) {
      return this.simpleBlockToAlgo(schedule, metadata.lessons);
    } else if (targetFormat === "simpleblock" && !isSimple) {
      return this.algoToSimpleBlock(schedule, metadata.classes);
    } else {
      console.log("   ℹ️ Dönüşüm gerekmiyor, format zaten uygun");
      return schedule;
    }
  }

  static validateConversion(original, converted) {
    let originalCount = 0;
    let convertedCount = 0;

    for (const classId in original) {
      for (const day in original[classId]) {
        for (const hour in original[classId][day]) {
          if (original[classId][day][hour]) {
            originalCount++;
          }
        }
      }
    }

    for (const classId in converted) {
      for (const day in converted[classId]) {
        for (const hour in converted[classId][day]) {
          if (converted[classId][day][hour]) {
            convertedCount++;
          }
        }
      }
    }

    const isValid = originalCount === convertedCount;

    console.log("\n✅ DÖNÜŞÜM DOĞRULAMA:");
    console.log(`   Orijinal slot: ${originalCount}`);
    console.log(`   Dönüştürülmüş slot: ${convertedCount}`);
    console.log(`   Sonuç: ${isValid ? "✅ BAŞARILI" : "❌ HATA!"}`);

    return isValid;
  }

  static getFormatInfo(schedule) {
    const info = {
      format: this.isSimpleBlockFormat(schedule) ? "SimpleBlock" : "Algorithm",
      classes: Object.keys(schedule).length,
      totalSlots: 0,
      multiTeacherSlots: 0,
      dayRange: { min: Infinity, max: -Infinity },
      hourRange: { min: Infinity, max: -Infinity },
    };

    for (const classId in schedule) {
      for (const day in schedule[classId]) {
        const dayNum = parseInt(day);
        info.dayRange.min = Math.min(info.dayRange.min, dayNum);
        info.dayRange.max = Math.max(info.dayRange.max, dayNum);

        for (const hour in schedule[classId][day]) {
          const hourNum = parseInt(hour);
          info.hourRange.min = Math.min(info.hourRange.min, hourNum);
          info.hourRange.max = Math.max(info.hourRange.max, hourNum);

          const lesson = schedule[classId][day][hour];
          if (lesson) {
            info.totalSlots++;

            // Çoklu öğretmen kontrolü
            const teacherIds = lesson.teacherIds || lesson.teacherId;
            if (Array.isArray(teacherIds) && teacherIds.length > 1) {
              info.multiTeacherSlots++;
            }
          }
        }
      }
    }

    return info;
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.ScheduleFormatConverter = ScheduleFormatConverter;
  console.log(
    "✅ ScheduleFormatConverter V1.1 yüklendi (Çoklu Öğretmen Destekli)"
  );
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ScheduleFormatConverter;
}

console.log("📦 ScheduleFormatConverter global erişim aktif!");
