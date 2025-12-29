/**
 * ============================================
 * PDF RAPORLAMA MOTORU V23.0 - A4 DİKEY PERFECT
 * ============================================
 */

let programData = null;
let teachersMap = new Map();
let classesMap = new Map();
let teacherBranchData = new Map();
const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

document.addEventListener("DOMContentLoaded", () => {
  loadTeacherBranchesFromAPI().then(() => {
    loadProgramData();
    attachEventListeners();
  });
});

// ============================================
// ÖĞRETMEN BRANŞLARINI API'DEN YÜK
// ============================================

async function loadTeacherBranchesFromAPI() {
  console.log("🔍 Öğretmen branşları API'den yükleniyor...");

  try {
    const result = await window.electronAPI.getAllTeachers();

    let teachers = null;

    if (result && result.success && result.data) {
      teachers = result.data;
    } else if (Array.isArray(result)) {
      teachers = result;
    }

    if (teachers && Array.isArray(teachers) && teachers.length > 0) {
      teachers.forEach((teacher) => {
        if (teacher.ad_soyad && teacher.brans) {
          const nameKey = teacher.ad_soyad.trim().toUpperCase();
          teacherBranchData.set(nameKey, teacher.brans.trim());
        }
      });

      console.log(
        "✅ API'den",
        teacherBranchData.size,
        "öğretmen branşı yüklendi"
      );
    }
  } catch (error) {
    console.error("❌ API hatası:", error);
  }
}

function loadProgramData() {
  const savedProgram = localStorage.getItem("currentSolution");
  if (!savedProgram) {
    console.warn("⚠️ currentSolution localStorage'da yok!");
    return;
  }

  try {
    programData = JSON.parse(savedProgram);
    extractDataFromSchedule();
    console.log(
      "✅ Program yüklendi:",
      Object.keys(programData).length,
      "sınıf"
    );
  } catch (e) {
    console.error("❌ Program yükleme hatası:", e);
  }
}

function extractDataFromSchedule() {
  if (!programData) return;

  teachersMap.clear();
  classesMap.clear();

  const classNameToKeys = new Map();

  Object.entries(programData).forEach(([classKey, classValue]) => {
    let className = classKey;
    let hasLessons = false;

    for (let dayKey = 1; dayKey <= 5; dayKey++) {
      const dayData = classValue[dayKey];
      if (!dayData) continue;

      for (let hourKey = 1; hourKey <= 8; hourKey++) {
        const lesson = dayData[hourKey];

        if (lesson && lesson.teacherId) {
          hasLessons = true;

          const tId = String(lesson.teacherId);
          const tName = String(lesson.teacherName || "İsimsiz").trim();
          const tNameUpper = tName.toUpperCase();

          let tBranch = teacherBranchData.get(tNameUpper);

          if (!tBranch) {
            tBranch = String(
              lesson.subjectName || "Branş belirtilmemiş"
            ).trim();
          }

          if (!teachersMap.has(tId)) {
            teachersMap.set(tId, {
              id: tId,
              name: tName,
              branch: tBranch,
            });
          }

          if (lesson.className) className = String(lesson.className);
        }
      }
    }

    if (hasLessons) {
      const normalizedName = className.trim();

      if (!classNameToKeys.has(normalizedName)) {
        classNameToKeys.set(normalizedName, []);
      }
      classNameToKeys.get(normalizedName).push(classKey);
    }
  });

  classNameToKeys.forEach((keys, className) => {
    const selectedKey = keys.sort((a, b) => b.length - a.length)[0];
    classesMap.set(selectedKey, { id: selectedKey, name: className });
  });

  console.log(
    "✅ Çıkarıldı:",
    teachersMap.size,
    "öğretmen,",
    classesMap.size,
    "sınıf"
  );
}

// ============================================
// PDF OLUŞTURMA
// ============================================

async function generatePDFReport() {
  const raporTuru = document.getElementById("raporTuru")?.value;

  if (!raporTuru) {
    return alert("Lütfen bir rapor türü seçin!");
  }

  if (teachersMap.size === 0) extractDataFromSchedule();

  const content = [];
  let fileName = "Rapor.pdf";

  if (raporTuru.includes("ogretmenler")) {
    const allTeachers = Array.from(teachersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "tr")
    );

    let selectedTeachers =
      raporTuru === "tum-ogretmenler-pdf"
        ? allTeachers
        : allTeachers.filter((t) =>
            Array.from(
              document.getElementById("ogretmenFiltre").selectedOptions
            )
              .map((o) => o.value)
              .includes(t.id)
          );

    if (selectedTeachers.length === 0) return alert("Öğretmen seçiniz.");

    selectedTeachers.forEach((teacher, index) => {
      addTeacherPage(content, teacher);
      if (index < selectedTeachers.length - 1)
        content.push({ text: "", pageBreak: "after" });
    });

    fileName = "Ogretmen_El_Programlari.pdf";
  } else if (raporTuru.includes("siniflar")) {
    const allClasses = Array.from(classesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "tr")
    );

    let selectedClasses =
      raporTuru === "tum-siniflar-pdf"
        ? allClasses
        : allClasses.filter((c) =>
            Array.from(document.getElementById("sinifFiltre").selectedOptions)
              .map((o) => o.value)
              .includes(c.id)
          );

    if (selectedClasses.length === 0) return alert("Sınıf seçiniz.");

    selectedClasses.forEach((cls, index) => {
      addClassPage(content, cls);
      if (index < selectedClasses.length - 1)
        content.push({ text: "", pageBreak: "after" });
    });

    fileName = "Sinif_Ders_Programlari.pdf";
  }

  const docDefinition = {
    pageSize: "A4",
    pageOrientation: "portrait", // ✅ DİKEY
    pageMargins: [30, 20, 30, 20],
    content: content,
    defaultStyle: { font: "Roboto", fontSize: 9, color: "black" },
  };

  pdfMake.createPdf(docDefinition).download(fileName);
  console.log("✅ PDF indirildi:", fileName);
}

async function previewPDF() {
  const raporTuru = document.getElementById("raporTuru")?.value;

  if (!raporTuru) {
    return alert("Lütfen bir rapor türü seçin!");
  }

  if (teachersMap.size === 0) extractDataFromSchedule();

  const content = [];

  if (raporTuru.includes("ogretmenler")) {
    const allTeachers = Array.from(teachersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "tr")
    );

    let selectedTeachers =
      raporTuru === "tum-ogretmenler-pdf"
        ? allTeachers
        : allTeachers.filter((t) =>
            Array.from(
              document.getElementById("ogretmenFiltre").selectedOptions
            )
              .map((o) => o.value)
              .includes(t.id)
          );

    if (selectedTeachers.length === 0) return alert("Öğretmen seçiniz.");

    selectedTeachers.forEach((teacher, index) => {
      addTeacherPage(content, teacher);
      if (index < selectedTeachers.length - 1)
        content.push({ text: "", pageBreak: "after" });
    });
  } else if (raporTuru.includes("siniflar")) {
    const allClasses = Array.from(classesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "tr")
    );

    let selectedClasses =
      raporTuru === "tum-siniflar-pdf"
        ? allClasses
        : allClasses.filter((c) =>
            Array.from(document.getElementById("sinifFiltre").selectedOptions)
              .map((o) => o.value)
              .includes(c.id)
          );

    if (selectedClasses.length === 0) return alert("Sınıf seçiniz.");

    selectedClasses.forEach((cls, index) => {
      addClassPage(content, cls);
      if (index < selectedClasses.length - 1)
        content.push({ text: "", pageBreak: "after" });
    });
  }

  const docDefinition = {
    pageSize: "A4",
    pageOrientation: "portrait", // ✅ DİKEY
    pageMargins: [30, 20, 30, 20],
    content: content,
    defaultStyle: { font: "Roboto", fontSize: 9, color: "black" },
  };

  const pdfDocGenerator = pdfMake.createPdf(docDefinition);

  pdfDocGenerator.getDataUrl((dataUrl) => {
    const onizlemeKart = document.getElementById("onizlemeKart");
    const onizlemeAlani = document.getElementById("onizlemeAlani");

    if (!onizlemeKart || !onizlemeAlani) {
      console.error("❌ Önizleme elementleri bulunamadı!");
      return;
    }

    onizlemeKart.style.display = "block";

    onizlemeAlani.innerHTML = `
      <iframe 
        src="${dataUrl}" 
        style="width: 100%; height: 800px; border: none; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);"
        title="PDF Önizleme"
      ></iframe>
    `;

    onizlemeKart.scrollIntoView({ behavior: "smooth", block: "start" });
    console.log("✅ PDF önizleme gösterildi");
  });
}

// ============================================
// ÖĞRETMEN SAYFASI (A4 DİKEY OPTİMİZE)
// ============================================

function addTeacherPage(content, teacher) {
  const okulAdi =
    localStorage.getItem("currentSchoolName") ||
    "Bahçelievler Cumhuriyet Anadolu Lisesi";
  const mudur = (
    localStorage.getItem("mudurAdi") || "CÜNEYT ÇALIŞIR"
  ).toUpperCase();
  const mudurYrd = (
    localStorage.getItem("mudurYardimcisiAdi") || "MEHMET KARCI"
  ).toUpperCase();

  content.push(
    {
      stack: [
        { text: "T.C.", alignment: "center", bold: true },
        { text: "BAHÇELİEVLER KAYMAKAMLIĞI", alignment: "center", bold: true },
        { text: okulAdi.toUpperCase(), alignment: "center", bold: true },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        {
          stack: [
            { text: `Sayı: 125/........` },
            { text: `Tarih: ${new Date().toLocaleDateString("tr-TR")}` },
          ],
          width: "*",
        },
      ],
      margin: [0, 0, 0, 5],
    },
    {
      columns: [
        {
          text: [
            { text: "Adı Soyadı: ", bold: true },
            teacher.name.toUpperCase(),
          ],
          width: "*",
        },
        {
          text: [{ text: "Branşı: ", bold: true }, teacher.branch],
          width: "*",
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 10],
    }
  );

  const tableBody = [];
  const headerRow = [
    {
      text: "Dersler\nGünler",
      bold: true,
      alignment: "center",
      fillColor: "#ecf0f1",
    },
  ];
  for (let i = 1; i <= 8; i++)
    headerRow.push({
      text: `${i}.Ders`,
      bold: true,
      alignment: "center",
      fillColor: "#ecf0f1",
    });
  tableBody.push(headerRow);

  let lessonTotals = {};

  for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
    const row = [
      {
        text: DAYS[dayIdx - 1],
        bold: true,
        alignment: "center",
        margin: [0, 8, 0, 8],
        fillColor: "#ecf0f1",
      },
    ];

    for (let hourIdx = 1; hourIdx <= 8; hourIdx++) {
      const lesson = getLessonData(teacher.id, dayIdx, hourIdx);

      const subjectText = (lesson.subject || "").toUpperCase().trim();
      const isRehberlik =
        subjectText.includes("REHBERLİK") ||
        subjectText.includes("REHBERLIK") ||
        subjectText.includes("YÖNLENDİRME") ||
        subjectText.includes("YONLENDIRME");

      if (lesson.className) {
        const key = `${lesson.className}|${lesson.subject}`;
        lessonTotals[key] = (lessonTotals[key] || 0) + 1;
      }

      row.push({
        stack: [
          {
            text: lesson.className || "",
            bold: true,
            color: isRehberlik ? "red" : "black",
          },
          {
            text: lesson.subject || "",
            fontSize: 7,
            color: isRehberlik ? "red" : "black",
            bold: isRehberlik,
          },
        ],
        alignment: "center",
      });
    }
    tableBody.push(row);
  }

  content.push({
    table: {
      headerRows: 1,
      widths: [50, "*", "*", "*", "*", "*", "*", "*", "*"], // ✅ DİKEY İÇİN OPTİMİZE
      body: tableBody,
    },
    margin: [0, 0, 0, 10],
  });

  content.push({ text: "DERS TOPLAMLARI", bold: true, margin: [0, 5, 0, 2] });
  const summaryBody = [
    [
      { text: "Sınıf", bold: true, fillColor: "#ecf0f1" },
      { text: "Ders Adı", bold: true, fillColor: "#ecf0f1" },
      { text: "Saat", bold: true, fillColor: "#ecf0f1" },
    ],
  ];
  let grandTotal = 0;
  Object.entries(lessonTotals).forEach(([key, count]) => {
    const [cName, sName] = key.split("|");
    summaryBody.push([cName, sName, count]);
    grandTotal += count;
  });
  summaryBody.push([
    { text: "TOPLAM", bold: true, colSpan: 2, fillColor: "#ecf0f1" },
    {},
    { text: grandTotal, bold: true, fillColor: "#ecf0f1" },
  ]);

  content.push({
    table: { widths: [80, "*", 40], body: summaryBody }, // ✅ DİKEY İÇİN OPTİMİZE
    margin: [0, 0, 0, 20],
  });

  // İMZALAR
  content.push({
    columns: [
      {
        stack: [
          { text: "", margin: [0, 0, 0, 5] },
          { text: mudurYrd, bold: true, fontSize: 9, alignment: "center" },
          { text: "Müdür Yardımcısı", fontSize: 8, alignment: "center" },
        ],
        width: "*",
      },
      {
        stack: [
          {
            text: "Aslını Aldım",
            fontSize: 9,
            alignment: "center",
            margin: [0, 0, 0, 5],
          },
          {
            text: teacher.name.toUpperCase(),
            bold: true,
            fontSize: 9,
            alignment: "center",
          },
          { text: teacher.branch, fontSize: 8, alignment: "center" },
        ],
        width: "*",
      },
      {
        stack: [
          {
            text: "UYGUNDUR",
            fontSize: 9,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 5],
          },
          { text: mudur, bold: true, fontSize: 9, alignment: "center" },
          { text: "Okul Müdürü", fontSize: 8, alignment: "center" },
        ],
        width: "*",
      },
    ],
    margin: [0, 20, 0, 0],
  });
}

function getLessonData(tId, dayIdx, hourIdx) {
  let res = { className: "", subject: "" };
  if (!programData) return res;

  Object.keys(programData).forEach((classKey) => {
    const classData = programData[classKey];
    if (classData && classData[dayIdx] && classData[dayIdx][hourIdx]) {
      const lesson = classData[dayIdx][hourIdx];
      if (lesson && String(lesson.teacherId) === String(tId)) {
        res.className =
          classesMap.get(classKey)?.name || lesson.className || classKey;
        res.subject = lesson.subjectName || lesson.subjectCode || "";
      }
    }
  });

  return res;
}

// ============================================
// SINIF SAYFASI (A4 DİKEY - TAM HİZALI FİNAL)
// ============================================

function addClassPage(content, cls) {
  const okulAdi =
    localStorage.getItem("currentSchoolName") ||
    "Bahçelievler Cumhuriyet Anadolu Lisesi";
  const mudur = (
    localStorage.getItem("mudurAdi") || "CÜNEYT ÇALIŞIR"
  ).toUpperCase();
  const mudurYrd = (
    localStorage.getItem("mudurYardimcisiAdi") || "MEHMET KARCI"
  ).toUpperCase();

  const rehberOgretmen = findRehberOgretmenBySubject(cls.id);

  content.push(
    {
      stack: [
        { text: "T.C.", alignment: "center", bold: true },
        { text: "BAHÇELİEVLER KAYMAKAMLIĞI", alignment: "center", bold: true },
        {
          text: okulAdi.toUpperCase(),
          alignment: "center",
          bold: true,
          margin: [0, 0, 0, 15],
        },
      ],
    },
    {
      columns: [
        {
          text: [{ text: "Sınıf: ", bold: true }, cls.name],
          fontSize: 11,
          width: "*",
        },
        {
          text: [
            { text: "Rehberlik ve Yönlendirme Öğretmeni: ", bold: true },
            rehberOgretmen,
          ],
          width: "*",
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 10],
    }
  );

  // ✅ HAFTALIK DERS PROGRAMI TABLOSU
  const tableBody = [];
  const headerRow = [
    {
      text: "Dersler\nGünler",
      bold: true,
      alignment: "center",
      fillColor: "#ecf0f1",
    },
  ];
  for (let i = 1; i <= 8; i++)
    headerRow.push({
      text: `${i}.Ders`,
      bold: true,
      alignment: "center",
      fillColor: "#ecf0f1",
    });
  tableBody.push(headerRow);

  for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
    const row = [
      {
        text: DAYS[dayIdx - 1],
        bold: true,
        alignment: "center",
        margin: [0, 8, 0, 8],
        fillColor: "#ecf0f1",
      },
    ];

    for (let hourIdx = 1; hourIdx <= 8; hourIdx++) {
      const lesson = getLessonDetailsForClass(cls.id, dayIdx, hourIdx);

      const subjectText = (lesson.subject || "").toUpperCase().trim();
      const isRehberlik =
        subjectText.includes("REHBERLİK") ||
        subjectText.includes("REHBERLIK") ||
        subjectText.includes("YÖNLENDİRME") ||
        subjectText.includes("YONLENDIRME");

      const textColor = isRehberlik ? "red" : "black";

      row.push({
        stack: [
          { text: lesson.subject || "", bold: true, color: textColor },
          { text: lesson.teacherName || "", fontSize: 7, color: textColor },
        ],
        alignment: "center",
      });
    }
    tableBody.push(row);
  }

  content.push({
    table: {
      headerRows: 1,
      widths: [50, "*", "*", "*", "*", "*", "*", "*", "*"], // ✅ ÜST TABLO
      body: tableBody,
    },
    margin: [0, 0, 0, 10],
  });

  // ✅ DERS DETAYLARI TABLOSU - MANUEL GENİŞLİKLER
  const lessonDetails = getClassLessonDetails(cls.id);

  const detailsTableBody = [
    [
      { text: "Sıra No", bold: true, fillColor: "#ecf0f1" },
      { text: "Ders Adı", bold: true, fillColor: "#ecf0f1" },
      { text: "Ders Öğretmeni", bold: true, fillColor: "#ecf0f1" },
      { text: "Saat", bold: true, fillColor: "#ecf0f1" },
    ],
  ];

  lessonDetails.forEach((lesson, index) => {
    const isRehberlik =
      lesson.subject.toUpperCase().includes("REHBERLİK") ||
      lesson.subject.toUpperCase().includes("YÖNLENDİRME");
    const textColor = isRehberlik ? "red" : "black";

    detailsTableBody.push([
      { text: (index + 1).toString(), color: textColor },
      { text: lesson.subject, color: textColor, bold: isRehberlik },
      { text: lesson.teacher, color: textColor },
      { text: lesson.hours.toString(), color: textColor },
    ]);
  });

  content.push({
    table: {
      widths: [50, 179, 236, 52], // ✅ MANUEL SABİT GENİŞLİKLER
      body: detailsTableBody,
    },
    margin: [0, 0, 0, 20],
  });

  // ✅ İMZALAR
  content.push({
    columns: [
      {
        stack: [
          { text: "", margin: [0, 0, 0, 10] },
          { text: mudurYrd, bold: true, fontSize: 9, alignment: "center" },
          { text: "Müdür Yardımcısı", fontSize: 8, alignment: "center" },
        ],
        width: "*",
      },
      {
        stack: [
          {
            text: "UYGUNDUR",
            fontSize: 9,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 10],
          },
          { text: mudur, bold: true, fontSize: 9, alignment: "center" },
          { text: "Okul Müdürü", fontSize: 8, alignment: "center" },
        ],
        width: "*",
      },
    ],
    margin: [0, 0, 0, 0],
  });
}
function getClassLessonDetails(classId) {
  if (!programData || !programData[classId]) {
    return [];
  }

  const classData = programData[classId];
  const lessonCounts = new Map();

  for (let dayKey = 1; dayKey <= 5; dayKey++) {
    const dayData = classData[dayKey];
    if (!dayData) continue;

    for (let hourKey = 1; hourKey <= 8; hourKey++) {
      const lesson = dayData[hourKey];

      if (lesson && lesson.subjectName && lesson.teacherName) {
        const key = `${lesson.subjectName}|${lesson.teacherName}`;
        lessonCounts.set(key, (lessonCounts.get(key) || 0) + 1);
      }
    }
  }

  const lessonArray = [];
  lessonCounts.forEach((count, key) => {
    const [subject, teacher] = key.split("|");
    lessonArray.push({
      subject: subject,
      teacher: teacher,
      hours: count,
    });
  });

  lessonArray.sort((a, b) => a.subject.localeCompare(b.subject, "tr"));

  return lessonArray;
}

function findRehberOgretmenBySubject(classId) {
  if (!programData || !programData[classId]) {
    return "Atanmamış";
  }

  const classData = programData[classId];

  for (let dayKey = 1; dayKey <= 5; dayKey++) {
    const dayData = classData[dayKey];
    if (!dayData) continue;

    for (let hourKey = 1; hourKey <= 8; hourKey++) {
      const lesson = dayData[hourKey];

      if (lesson && lesson.subjectName && lesson.teacherName) {
        const subjectLower = lesson.subjectName.toLowerCase();

        if (
          subjectLower.includes("rehberlik") ||
          subjectLower.includes("yönlendirme")
        ) {
          return lesson.teacherName;
        }
      }
    }
  }

  return "Atanmamış";
}

function getLessonDetailsForClass(classId, dayIdx, hourIdx) {
  let res = { subject: "", teacherName: "" };

  if (programData && programData[classId] && programData[classId][dayIdx]) {
    const lesson = programData[classId][dayIdx][hourIdx];
    if (lesson) {
      res.subject = lesson.subjectName || lesson.subjectCode || "";
      res.teacherName = lesson.teacherName || "";
    }
  }

  return res;
}

// ============================================
// EVENT LISTENERS
// ============================================

function attachEventListeners() {
  const pdfBtn = document.getElementById("onizleBtn");
  const previewBtn = document.getElementById("onizlemeBtn");

  if (pdfBtn) pdfBtn.onclick = generatePDFReport;
  if (previewBtn) previewBtn.onclick = previewPDF;

  document.getElementById("raporTuru")?.addEventListener("change", (e) => {
    const value = e.target.value;
    const isSelectedTeacher = value === "secili-ogretmenler-pdf";
    const isSelectedClass = value === "secili-siniflar-pdf";

    const filtrelerKart = document.getElementById("filtrelerKart");
    const butonlar = document.getElementById("butonlar");

    if (isSelectedTeacher || isSelectedClass) {
      filtrelerKart.style.display = "block";
    } else {
      filtrelerKart.style.display = "none";
    }

    if (value) {
      butonlar.style.display = "flex";
    } else {
      butonlar.style.display = "none";
    }

    const ogretmenBolum = document.getElementById("ogretmenFiltreBolumu");
    const sinifBolum = document.getElementById("sinifFiltreBolumu");

    if (ogretmenBolum)
      ogretmenBolum.style.display = isSelectedTeacher ? "block" : "none";
    if (sinifBolum)
      sinifBolum.style.display = isSelectedClass ? "block" : "none";

    if (isSelectedTeacher) {
      populateFilters("ogretmen");
    } else if (isSelectedClass) {
      populateFilters("sinif");
    }
  });
}

function populateFilters(type) {
  if (type === "ogretmen") {
    const filter = document.getElementById("ogretmenFiltre");
    if (!filter) return;
    filter.innerHTML = "";
    Array.from(teachersMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      .forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.branch})`;
        filter.appendChild(opt);
      });
  } else if (type === "sinif") {
    const filter = document.getElementById("sinifFiltre");
    if (!filter) return;
    filter.innerHTML = "";
    Array.from(classesMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      .forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        filter.appendChild(opt);
      });
  }
}

console.log("✅ PDF Raporlama V23.0 - A4 DİKEY PERFECT yüklendi");
