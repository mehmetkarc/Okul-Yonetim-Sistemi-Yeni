/**
 * ============================================
 * EXPORT-IMPORT MANAGER (GÜNCELLENMİŞ V3.1 - PDF İYİLEŞTİRMELERİ)
 * ============================================
 * Excel, PDF ve JSON formatlarında program dışa/içe aktarma
 *
 * Gerekli Kütüphaneler: XLSX, jspdf, jspdf-autotable, (Türkçe Font Gerekli)
 */

class ExportImportManager {
  /**
   * @param {Object} data - Program meta verisi (Örn: { teachers: [{}], classes: [{}] })
   */
  constructor(data = {}) {
    this.formats = ["excel", "pdf", "json"];

    // Ders saatlerini statik olarak tanımlayalım (Okul bazlı değişebilir)
    // Eğer ders saatleri programData'da varsa, oradan çekilmelidir.
    this.DERS_SAATLERI = {
      1: "08:40-09:20",
      2: "09:30-10:10",
      3: "10:20-11:00",
      4: "11:10-11:50",
      5: "12:00-12:40",
      6: "12:50-13:30",
      7: "14:00-14:40",
      8: "14:50-15:30",
    };

    // Öğretmen ve Sınıf ID'lerinden isim bulmak için yardımcı mapler oluşturulur
    this.teacherMetadata = data.teachers
      ? data.teachers.reduce((acc, t) => {
          acc[t.id] = t;
          return acc;
        }, {})
      : {};
    this.classMetadata = data.classes
      ? data.classes.reduce((acc, c) => {
          acc[c.id] = c;
          return acc;
        }, {})
      : {};

    // Türkçe karakter desteği için font ayarı (ÖNEMLİ!)
    // jspdf kütüphanesine, Türkçe karakterleri destekleyen bir fontun eklenmesi gerekir.
    // Örneğin: 'NotoSans-Regular.js' veya 'times.js' gibi.
    // Eğer kütüphane yüklüyse, fontu ayarlayabiliriz.
    if (window.jspdf && window.jspdf.jsPDF) {
      this.initPDF();
    }

    console.log("✅ ExportImportManager yüklendi (V3.1 - PDF İyileştirmeleri)");
    console.log("✅ Öğretmen ve Sınıf meta verileri yüklendi.");
  }

  /**
   * Türkçe karakter desteği için font ayarı
   * Bu metot, projenizde 'jspdf' font eklentisi (örn: jspdf-turkish-font.js) yüklü ise çalışır.
   */
  initPDF() {
    const { jsPDF } = window.jspdf;
    if (typeof jsPDF.API.setTurkishFont === "function") {
      // setTurkishFont() metodu, custom olarak eklenmiş bir fontun
      // jsPDF'e varsayılan olarak ayarlanmasını sağlar.
      jsPDF.API.setTurkishFont();
      console.log("✅ jspdf Türkçe karakter fontu ayarlandı.");
    } else {
      console.warn(
        "⚠️ Türkçe font eklentisi (setTurkishFont) bulunamadı. Türkçe karakterler sorunlu olabilir."
      );
    }
  }

  // ============================================
  // EXCEL EXPORT (Basit Raporlar) - Metotlar aynı kalmıştır.
  // ============================================

  async exportToExcel(programData, options = {}) {
    console.log("📊 Excel'e aktarılıyor...");

    try {
      if (!programData || Object.keys(programData).length === 0) {
        throw new Error("Program verisi boş!");
      }

      const workbook = { SheetNames: [], Sheets: {} };

      // ... (Excel metotları aynı) ...
      const firstClassId = Object.keys(programData)[0];
      if (firstClassId) {
        const mainSheet = this.createProgramSheet(programData[firstClassId]);
        workbook.SheetNames.push(
          this.classMetadata[firstClassId]?.name || "Program Özeti"
        );
        workbook.Sheets[
          this.classMetadata[firstClassId]?.name || "Program Özeti"
        ] = mainSheet;
      }

      // 2. Öğretmenler Listesi
      if (options.includeTeachers) {
        const teacherSheet = this.createTeacherSheet(programData);
        workbook.SheetNames.push("Öğretmenler");
        workbook.Sheets["Öğretmenler"] = teacherSheet;
      }

      // 3. Sınıflar Listesi (Mevcut meta veriden)
      if (options.includeClasses) {
        const classSheet = this.createClassSheet();
        workbook.SheetNames.push("Sınıflar");
        workbook.Sheets["Sınıflar"] = classSheet;
      }

      // 4. İstatistik sayfası
      if (options.includeStats) {
        const statsSheet = this.createStatsSheet(programData);
        workbook.SheetNames.push("İstatistikler");
        workbook.Sheets["İstatistikler"] = statsSheet;
      }

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      this.downloadFile(blob, `ders-programi-${Date.now()}.xlsx`);

      if (window.ModernBildirim) {
        ModernBildirim.success(
          "Excel İndirildi",
          "Program Excel formatında indirildi"
        );
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Excel export hatası:", error);
      if (window.ModernBildirim) {
        ModernBildirim.error("Hata", error.message);
      }
      return { success: false, error: error.message };
    }
  }

  createProgramSheet(classSchedule) {
    // ProgramData'nın tek bir sınıfın programı olduğu varsayılmıştır (classSchedule)
    const data = [
      ["DERS PROGRAMI"],
      [],
      // Saatlerin üst satırına ders saatlerini de ekleyelim
      [
        "Saat Aralığı",
        "Ders Saati",
        "Ders Saati",
        "Ders Saati",
        "Ders Saati",
        "Ders Saati",
        "Ders Saati",
        "Ders Saati",
        "Ders Saati",
      ],
      ["Gün/Saat", 1, 2, 3, 4, 5, 6, 7, 8].map((s) =>
        typeof s === "number" ? this.DERS_SAATLERI[s] : s
      ), // Ders saat aralıklarını ekle
    ];

    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    gunler.forEach((gun, gunIndex) => {
      const row = [gun];
      const day = gunIndex + 1; // ProgramData'da günlerin 1'den başladığı varsayılır.

      for (let saat = 1; saat <= 8; saat++) {
        const ders = classSchedule[day]?.[saat];
        if (ders) {
          row.push(
            `${ders.ders_kodu || ders.ders_adi}\n${ders.ogretmen_kod || ""}`
          );
        } else {
          row.push("-");
        }
      }
      data.push(row);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  // (Orijinal Öğretmen Listesi metodu korundu)
  createTeacherSheet(fullSchedule) {
    const teachers = this.aggregateTeachers(fullSchedule);

    const data = [
      ["ÖĞRETMEN LİSTESİ"],
      [],
      ["Öğretmen Kodu", "Ad Soyad", "Toplam Ders"],
    ];

    Object.values(teachers).forEach((teacher) => {
      data.push([teacher.kod, teacher.ad, teacher.dersler]);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  // Sınıf listesini meta veriden oluşturur
  createClassSheet() {
    const data = [["SINIF LİSTESİ"], [], ["Sınıf Kodu", "Sınıf Adı"]];

    Object.values(this.classMetadata).forEach((cls) => {
      data.push([cls.id, cls.name]);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  createStatsSheet(programData) {
    const stats = this.calculateStats(programData);

    const data = [
      ["İSTATİSTİKLER"],
      [],
      ["Metrik", "Değer"],
      ["Toplam Ders", stats.totalLessons],
      ["Doluluk Oranı", `${stats.fillRate}%`],
      ["Öğretmen Sayısı", stats.teacherCount],
      ["Sınıf Sayısı", stats.classCount],
    ];

    return XLSX.utils.aoa_to_sheet(data);
  }

  // ============================================
  // PDF EXPORT (GÜNCELLENDİ - RAPOR SAYFALARI)
  // ============================================

  /**
   * Hem sınıf hem de öğretmen raporlarını tek bir PDF'te oluşturur.
   * @param {Object} programData - Tüm program verisi: { classId: { day: { hour: lesson } } }
   * @param {Object} options - reportType, onlyClassId, onlyTeacherId
   */
  async exportToPDF(programData, options = {}) {
    console.log("📄 PDF'e aktarılıyor (Çoklu Rapor)...");

    try {
      if (!programData || Object.keys(programData).length === 0) {
        throw new Error("Program verisi boş!");
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("l", "mm", "a4"); // Geniş (Landscape) olarak başlat
      let pageCount = 0;

      // 1. SINIF BAZLI RAPORLAR
      if (options.reportType === "class" || options.reportType === "all") {
        const classesToReport = options.onlyClassId
          ? [options.onlyClassId]
          : Object.keys(this.classMetadata);
        this.createClassPDFReports(
          doc,
          programData,
          classesToReport,
          pageCount
        );
        pageCount = doc.internal.pages.length - 1; // Yeni sayfa sayısını güncelle
      }

      // 2. ÖĞRETMEN BAZLI RAPORLAR
      if (options.reportType === "teacher" || options.reportType === "all") {
        const teachersToReport = options.onlyTeacherId
          ? [options.onlyTeacherId]
          : Object.keys(this.teacherMetadata);
        // Öğretmen raporlarını alfabetik sıraya göre alalım (İstenen bir rapor türüydü)
        const sortedTeacherIds = teachersToReport.sort((a, b) => {
          const nameA = (this.teacherMetadata[a]?.name || a).toUpperCase();
          const nameB = (this.teacherMetadata[b]?.name || b).toUpperCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        this.createTeacherPDFReports(
          doc,
          programData,
          sortedTeacherIds,
          pageCount
        );
        pageCount = doc.internal.pages.length - 1; // Yeni sayfa sayısını güncelle
      }

      // Başlangıçta eklenen boş ilk sayfayı sil (Eğer rapor eklendiyse)
      if (pageCount > 0) {
        doc.deletePage(1);
      } else {
        throw new Error(
          "Rapor oluşturma seçenekleri boş veya program verisi bulunamadı."
        );
      }

      // PDF'i indir
      doc.save(`ders-programi-rapor-${Date.now()}.pdf`);

      if (window.ModernBildirim) {
        ModernBildirim.success(
          "PDF İndirildi",
          "Program PDF raporları indirildi"
        );
      }

      return { success: true };
    } catch (error) {
      console.error("❌ PDF export hatası:", error);
      if (window.ModernBildirim) {
        ModernBildirim.error("Hata", "PDF oluşturulamadı: " + error.message);
      }
      return { success: false, error: error.message };
    }
  }

  // YENİ YARDIMCI METOTLAR: RAPOR BAŞLIĞI VE FORMATLAMA
  addHeader(doc, title, startY, ustBilgi = {}) {
    // Kaymakamlık, Okul Adı gibi üst bilgiler eklenebilir.
    const kaymakamlik = ustBilgi.kaymakamlik || "T.C.";
    const okulAdi =
      ustBilgi.okulAdi || "BAHÇELİEVLER CUMHURİYET ANADOLU LİSESİ"; // Varsayılan okul adı

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(kaymakamlik, 10, startY);
    doc.text(okulAdi, 10, startY + 5);

    // Rapor Başlığı
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(title, doc.internal.pageSize.getWidth() / 2, startY + 15, {
      align: "center",
    });

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(
      `Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}`,
      doc.internal.pageSize.getWidth() - 10,
      startY + 5,
      { align: "right" }
    );

    return startY + 20; // Yeni başlangıç Y koordinatı
  }

  // YENİ METOT: ÖĞRETMEN RAPORLARINI OLUŞTUR
  createTeacherPDFReports(doc, fullSchedule, teacherIds, initialPageCount) {
    const teacherSchedules = this.aggregateTeacherSchedules(fullSchedule);

    teacherIds.forEach((teacherId, index) => {
      // İlk rapor için sayfa ekleme kontrolü
      if (initialPageCount > 0 || index > 0) doc.addPage("l"); // Landscape (yatay)

      const teacherData = teacherSchedules[teacherId];
      const teacherInfo = this.teacherMetadata[teacherId] || {
        name: `Öğretmen ID: ${teacherId}`,
        code: "N/A",
      };
      const totalLessons = this.countTeacherLessons(teacherData);

      // Başlık ekle
      let currentY = this.addHeader(
        doc,
        `${teacherInfo.name} - HAFTALIK DERS PROGRAMI`,
        10
      );

      doc.setFontSize(10);
      doc.text(`Kodu: ${teacherInfo.code || teacherId}`, 10, currentY);
      doc.text(`Toplam Ders Saati: ${totalLessons}`, 10, currentY + 5);

      currentY += 10;

      const tableData = this.prepareTeacherTableData(teacherData);
      const head = [
        ["Saat", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
      ];

      doc.autoTable({
        startY: currentY,
        head: head,
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 1,
          halign: "center",
          valign: "middle",
          font: "TurkishFont", // Türkçe fontu kullan
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: 0,
          fontStyle: "bold",
        },
        margin: { top: 10, left: 10, right: 10, bottom: 10 },
      });

      // Öğretmen ders listesi (Öğretmen El Programındaki gibi)
      this.addTeacherLessonList(doc, teacherId, totalLessons);
    });
  }

  // Öğretmenin ders listesini tablo altına ekler
  addTeacherLessonList(doc, teacherId, totalLessons) {
    const teacherLessons = this.aggregateTeacherLessons(teacherId);
    const startY = doc.autoTable.previous.finalY + 10;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Ders ve Sınıf Dağılım Listesi", 10, startY);
    doc.setFontSize(8);
    doc.text(`Toplam Ders: ${totalLessons} Saat`, 10, startY + 5);

    const lessonBody = teacherLessons.map((l, index) => [
      index + 1,
      l.className,
      l.subjectCode,
      l.subjectName,
      l.duration,
    ]);

    doc.autoTable({
      startY: startY + 7,
      head: [["Sr", "Sınıf Kodu", "Ders Kodu", "Ders Adı", "Süre"]],
      body: lessonBody,
      theme: "striped",
      styles: {
        fontSize: 7,
        cellPadding: 1,
        font: "TurkishFont", // Türkçe fontu kullan
      },
      headStyles: {
        fillColor: [240, 240, 255],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { top: 10, left: 10, right: 10, bottom: 10 },
      columnStyles: {
        0: { cellWidth: 8 }, // Sr
        1: { cellWidth: 15 }, // Sınıf Kodu
        2: { cellWidth: 15 }, // Ders Kodu
        3: { cellWidth: 60, halign: "left" }, // Ders Adı
        4: { cellWidth: 15 }, // Süre
      },
    });
  }

  // Öğretmenin ders/sınıf eşleşmelerini toplar (Öğretmen El Programı tablosu için)
  aggregateTeacherLessons(teacherId) {
    const teacherSchedules = this.aggregateTeacherSchedules(
      this.fullProgramData || {}
    );
    const schedule = teacherSchedules[teacherId];
    if (!schedule) return [];

    const lessonsMap = {}; // { '9A_MAT101': { subjectName, duration: 2, className: '9/A' } }

    for (const day in schedule) {
      for (const hour in schedule[day]) {
        const lesson = schedule[day][hour];
        const key = `${lesson.classId}_${
          lesson.subjectCode || lesson.subjectName
        }`;

        if (!lessonsMap[key]) {
          lessonsMap[key] = {
            subjectCode: lesson.subjectCode || "N/A",
            subjectName: lesson.subjectName || "Ders Adı Bilinmiyor",
            className:
              this.classMetadata[lesson.classId]?.name || lesson.classId,
            duration: 0,
          };
        }
        lessonsMap[key].duration++;
      }
    }
    return Object.values(lessonsMap);
  }

  // YENİ METOT: SINIF RAPORLARINI OLUŞTUR
  createClassPDFReports(doc, fullSchedule, classIds, initialPageCount) {
    classIds.forEach((classId, index) => {
      // İlk rapor için sayfa ekleme kontrolü
      if (initialPageCount > 0 || index > 0) doc.addPage("l"); // Landscape (yatay)

      const classInfo = this.classMetadata[classId] || {
        name: `Sınıf ID: ${classId}`,
      };

      // Başlık ekle
      let currentY = this.addHeader(
        doc,
        `${classInfo.name} - HAFTALIK DERS PROGRAMI`,
        10
      );

      const classSchedule = fullSchedule[classId];
      const tableData = this.prepareClassTableData(classSchedule);

      const head = [
        ["Saat", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
      ];

      doc.autoTable({
        startY: currentY,
        head: head,
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: "center",
          valign: "middle",
          font: "TurkishFont", // Türkçe fontu kullan
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [240, 240, 255],
          textColor: 0,
          fontStyle: "bold",
        },
        margin: { top: 10, left: 10, right: 10, bottom: 10 },
      });

      // Sınıf Ders Listesi (Sınıf Programındaki gibi)
      this.addClassLessonList(doc, classId);
    });
  }

  // Sınıfın ders listesini tablo altına ekler
  addClassLessonList(doc, classId) {
    const classLessons = this.aggregateClassLessons(classId);
    const startY = doc.autoTable.previous.finalY + 10;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Sınıf Ders Dağılım Listesi", 10, startY);

    const lessonBody = classLessons.map((l, index) => [
      index + 1,
      l.subjectName,
      l.subjectCode,
      l.duration,
      l.teacherName,
    ]);

    doc.autoTable({
      startY: startY + 7,
      head: [["Sr", "Ders Adı", "Ders Kodu", "Süre", "Öğretmen"]],
      body: lessonBody,
      theme: "striped",
      styles: {
        fontSize: 7,
        cellPadding: 1,
        font: "TurkishFont", // Türkçe fontu kullan
      },
      headStyles: {
        fillColor: [240, 240, 255],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { top: 10, left: 10, right: 10, bottom: 10 },
      columnStyles: {
        0: { cellWidth: 8 }, // Sr
        1: { cellWidth: 60, halign: "left" }, // Ders Adı
        2: { cellWidth: 15 }, // Ders Kodu
        3: { cellWidth: 15 }, // Süre
        4: { cellWidth: 60, halign: "left" }, // Öğretmen
      },
    });
  }

  // Sınıfın ders/öğretmen eşleşmelerini toplar (Sınıf Programı tablosu için)
  aggregateClassLessons(classId) {
    const schedule = this.fullProgramData?.[classId];
    if (!schedule) return [];

    const lessonsMap = {}; // { 'MAT101_T.DEMIR': { subjectName, duration: 2, teacherName: 'Turan Demir' } }

    for (const day in schedule) {
      for (const hour in schedule[day]) {
        const lesson = schedule[day][hour];

        // Birden fazla öğretmen olabilir, bu durumu yönetmek gerekir.
        const teacherIds = Array.isArray(lesson.teacherId)
          ? lesson.teacherId
          : [lesson.teacherId];

        teacherIds.forEach((teacherId) => {
          const teacherName =
            this.teacherMetadata[teacherId]?.name || teacherId;
          const key = `${
            lesson.subjectCode || lesson.subjectName
          }_${teacherId}`;

          if (!lessonsMap[key]) {
            lessonsMap[key] = {
              subjectCode: lesson.subjectCode || "N/A",
              subjectName: lesson.subjectName || "Ders Adı Bilinmiyor",
              teacherName: teacherName,
              duration: 0,
            };
          }
          lessonsMap[key].duration++;
        });
      }
    }
    // Süreye göre büyükten küçüğe sıralayalım
    return Object.values(lessonsMap).sort((a, b) => b.duration - a.duration);
  }

  // YARDIMCI METOT: ÖĞRETMEN PROGRAM TABLOSU VERİSİNİ HAZIRLA
  prepareTeacherTableData(teacherSchedule) {
    const tableData = [];
    for (let saat = 1; saat <= 8; saat++) {
      // Saat Aralığını ekle
      const saatAraligi = this.DERS_SAATLERI[saat] || `${saat}. Saat`;
      const row = [`${saat}. Saat\n${saatAraligi}`];

      for (let gun = 1; gun <= 5; gun++) {
        const lesson = teacherSchedule[gun]?.[saat];
        if (lesson) {
          // Ders (Sınıf Adı) formatı
          const className =
            this.classMetadata[lesson.classId]?.name || lesson.classId;
          row.push(
            `${lesson.subjectCode || lesson.subjectName}\n(${className})`
          );
        } else {
          row.push("-");
        }
      }
      tableData.push(row);
    }
    return tableData;
  }

  // YARDIMCI METOT: SINIF PROGRAM TABLOSU VERİSİNİ HAZIRLA
  prepareClassTableData(classSchedule) {
    const tableData = [];
    for (let saat = 1; saat <= 8; saat++) {
      // Saat Aralığını ekle
      const saatAraligi = this.DERS_SAATLERI[saat] || `${saat}. Saat`;
      const row = [`${saat}. Saat\n${saatAraligi}`];

      for (let gun = 1; gun <= 5; gun++) {
        const lesson = classSchedule[gun]?.[saat];
        if (lesson) {
          // Ders (Öğretmen Adı/Kodu) formatı
          const teacherInfo =
            this.teacherMetadata[lesson.teacherId]?.name || lesson.teacherId;
          row.push(
            `${lesson.subjectCode || lesson.subjectName}\n(${teacherInfo})`
          );
        } else {
          row.push("-");
        }
      }
      tableData.push(row);
    }
    return tableData;
  }

  // YARDIMCI METOT: Tüm programı alıp öğretmenlere göre gruplandırır.
  aggregateTeacherSchedules(fullSchedule) {
    // V3.1: Bu metot çağrılmadan önce fullProgramData'yı kaydet
    this.fullProgramData = fullSchedule;

    const teacherSchedules = {};
    // ... (Metot içeriği aynı) ...
    for (const classId in fullSchedule) {
      const classSchedule = fullSchedule[classId];
      for (const day in classSchedule) {
        for (const hour in classSchedule[day]) {
          const lesson = classSchedule[day][hour];
          // Öğretmen ID'leri tekli veya dizide olabilir
          const teacherIds = Array.isArray(lesson.teacherId)
            ? lesson.teacherId
            : [lesson.teacherId];

          teacherIds.forEach((teacherId) => {
            if (!teacherSchedules[teacherId]) {
              teacherSchedules[teacherId] = {
                1: {},
                2: {},
                3: {},
                4: {},
                5: {},
              };
            }

            teacherSchedules[teacherId][day][hour] = {
              ...lesson,
              classId: classId, // Sınıf bilgisini derse ekle
            };
          });
        }
      }
    }
    return teacherSchedules;
  }

  countTeacherLessons(teacherSchedule) {
    let count = 0;
    for (const day in teacherSchedule) {
      count += Object.keys(teacherSchedule[day]).length;
    }
    return count;
  }

  // Öğretmen listesini toplar (Excel için)
  aggregateTeachers(fullSchedule) {
    // ... (Metot içeriği aynı) ...
    const teachers = {};

    for (const classId in fullSchedule) {
      const classSchedule = fullSchedule[classId];
      for (const day in classSchedule) {
        for (const hour in classSchedule[day]) {
          const ders = classSchedule[day][hour];

          const teacherIds = Array.isArray(ders.teacherId)
            ? ders.teacherId
            : [ders.teacherId];
          teacherIds.forEach((teacherId) => {
            const teacherInfo = this.teacherMetadata[teacherId] || {};

            if (!teachers[teacherId]) {
              teachers[teacherId] = {
                kod: teacherInfo.code || teacherId,
                ad: teacherInfo.name || `Bilinmeyen Öğretmen ${teacherId}`,
                dersler: 0,
              };
            }
            teachers[teacherId].dersler++;
          });
        }
      }
    }
    return teachers;
  }

  // ============================================
  // JSON EXPORT/IMPORT (Aynı kaldı)
  // ============================================

  exportToJSON(programData) {
    // ... (Orijinal JSON export metodu buraya gelir)
    console.log("💾 JSON'a aktarılıyor...");

    try {
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        program: programData,
        meta: {
          totalLessons: this.countLessons(programData),
          exportedBy: window.currentUser?.ad_soyad || "Bilinmiyor",
        },
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });

      this.downloadFile(blob, `ders-programi-${Date.now()}.json`);

      if (window.ModernBildirim) {
        ModernBildirim.success(
          "JSON İndirildi",
          "Program JSON formatında indirildi"
        );
      }

      return { success: true };
    } catch (error) {
      console.error("❌ JSON export hatası:", error);
      if (window.ModernBildirim) {
        ModernBildirim.error("Hata", error.message);
      }
      return { success: false, error: error.message };
    }
  }

  async importFromJSON(jsonData) {
    // ... (Orijinal JSON import metodu buraya gelir)
    console.log("📥 JSON'dan içe aktarılıyor...");

    try {
      const data = JSON.parse(jsonData);

      if (!data.version || !data.program) {
        throw new Error("Geçersiz JSON formatı!");
      }

      // Programı yükle
      window.programData = data.program;

      // localStorage'a kaydet
      localStorage.setItem("programData", JSON.stringify(data.program));

      if (window.ModernBildirim) {
        ModernBildirim.success("Başarılı", "Program içe aktarıldı");
      }

      return { success: true, data: data.program };
    } catch (error) {
      console.error("❌ JSON import hatası:", error);
      if (window.ModernBildirim) {
        ModernBildirim.error("Hata", error.message);
      }
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR (Aynı kaldı)
  // ============================================

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  countLessons(programData) {
    let count = 0;
    // programData'nın { classId: { day: { hour: lesson } } } formatında olduğu varsayılır.
    for (const classId in programData) {
      for (const day in programData[classId]) {
        count += Object.keys(programData[classId][day]).length;
      }
    }
    return count;
  }

  calculateStats(programData) {
    const stats = {
      totalLessons: 0,
      fillRate: 0,
      teacherCount: 0,
      classCount: 0,
    };

    const teachers = new Set();
    const classes = new Set();
    let totalSlots = 0; // Toplam saat (5 gün * 8 saat)

    for (const classId in programData) {
      classes.add(classId);

      for (const day in programData[classId]) {
        for (const saat in programData[classId][day]) {
          const ders = programData[classId][day][saat];
          stats.totalLessons++;

          // Öğretmen ID'leri tekli veya dizide olabilir
          const teacherIds = Array.isArray(ders.teacherId)
            ? ders.teacherId
            : [ders.teacherId];
          teacherIds.forEach((id) => {
            if (id) teachers.add(id);
          });
        }
      }
      totalSlots += 5 * 8; // Her sınıf için 5 gün * 8 saat
    }

    stats.teacherCount = teachers.size;
    stats.classCount = classes.size;

    // Doluluk oranı hesaplaması burada değişebilir, toplam ders / (sınıf sayısı * maxSlots)
    if (totalSlots > 0) {
      stats.fillRate = ((stats.totalLessons / totalSlots) * 100).toFixed(1);
    } else {
      stats.fillRate = "0.0";
    }

    return stats;
  }
}

// Global export (Meta verilerin başlangıçta beslendiği varsayılır)
if (typeof window !== "undefined") {
  // Örn: program çözücüden gelen meta verileri burada olmalıdır.
  const initialData = window.programMeta || { teachers: [], classes: [] };

  window.ExportImportManager = ExportImportManager;
  window.exportImportManager = new ExportImportManager(initialData);
}
