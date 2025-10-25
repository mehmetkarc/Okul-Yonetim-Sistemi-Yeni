const { BrowserWindow, BrowserView } = require("electron");
const path = require("path");

let mebbisWindow = null;
let mebbisView = null;

function openMebbisWindow() {
  if (mebbisWindow && !mebbisWindow.isDestroyed()) {
    mebbisWindow.focus();
    return mebbisWindow;
  }

  // Ana pencere
  mebbisWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    title: "MEBBİS Entegrasyonu",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Sol tarafta panel (300px genişlik)
  mebbisWindow.loadFile(path.join(__dirname, "mebbis-panel.html"));

  // Sağ tarafta BrowserView (MEBBİS/E-Okul)
  mebbisView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mebbisWindow.setBrowserView(mebbisView);

  // BrowserView boyutlandırma
  const updateBounds = () => {
    const { width, height } = mebbisWindow.getContentBounds();
    mebbisView.setBounds({
      x: 300, // Panel genişliği
      y: 0,
      width: width - 300,
      height: height,
    });
  };

  updateBounds();
  mebbisWindow.on("resize", updateBounds);

  // MEBBİS'i yükle
  mebbisView.webContents.loadURL("https://mebbis.meb.gov.tr/");

  // DevTools (BrowserView için)
  mebbisView.webContents.openDevTools();

  mebbisWindow.on("closed", () => {
    mebbisWindow = null;
    mebbisView = null;
  });

  console.log("✅ MEBBİS penceresi açıldı");

  return mebbisWindow;
}

async function parseStudentTable() {
  if (!mebbisView) {
    return { success: false, message: "MEBBİS penceresi açık değil!" };
  }

  try {
    console.log("📊 Öğrenci tablosu okunuyor...");

    const students = await mebbisView.webContents.executeJavaScript(`
      (function() {
        const rows = document.querySelectorAll('#tbPageDataTable tbody tr');
        const students = [];

        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          
          if (cells.length >= 7) {
            const sinifText = cells[5].textContent.trim();
            let sinif = sinifText;
            const match = sinifText.match(/(\\d+).*?\\/(\\s*)(\\w+).*?Şubesi/i);
            if (match) sinif = match[1] + '-' + match[3];
            
            students.push({
              tc_no: null,
              ad: cells[2].textContent.trim(),
              soyad: cells[3].textContent.trim(),
              ad_soyad: cells[2].textContent.trim() + ' ' + cells[3].textContent.trim(),
              okul_no: cells[4].textContent.trim(),
              sinif: sinif,
              yabanci_dil: cells[7] ? cells[7].textContent.trim() : ''
            });
          }
        });

        return students;
      })();
    `);

    console.log(`✅ ${students.length} öğrenci bulundu`);
    return { success: true, data: students };
  } catch (error) {
    console.error("❌ Öğrenci parse hatası:", error);
    return { success: false, message: error.message };
  }
}

async function parsePhotos() {
  if (!mebbisView) {
    return { success: false, message: "MEBBİS penceresi açık değil!" };
  }

  try {
    console.log("📸 Fotoğraflar okunuyor...");

    const photos = await mebbisView.webContents.executeJavaScript(`
      (function() {
        const cards = document.querySelectorAll('#divPhotoList .col-xl-2');
        const photos = [];

        cards.forEach(card => {
          const img = card.querySelector('img');
          const h6 = card.querySelector('h6');

          if (img && h6) {
            photos.push({
              ad_soyad: h6.textContent.trim(),
              base64: img.src
            });
          }
        });

        return photos;
      })();
    `);

    console.log(`✅ ${photos.length} fotoğraf bulundu`);
    return { success: true, data: photos };
  } catch (error) {
    console.error("❌ Fotoğraf parse hatası:", error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  openMebbisWindow,
  parseStudentTable,
  parsePhotos,
  getMebbisWindow: () => mebbisWindow,
};
