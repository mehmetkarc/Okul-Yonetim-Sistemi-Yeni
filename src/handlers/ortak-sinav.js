// ==========================================
// 📝 ORTAK SINAV TÜM HANDLER'LARI
// ==========================================

const { ipcMain } = require("electron");

/**
 * Ortak Sınav modülü için tüm IPC handler'ları
 * @param {Object} db - Veritabanı modülü
 */
function registerOrtakSinavHandlers(db) {
  console.log("📝 Ortak Sınav Handler'ları yükleniyor...");

  // ========================================
  // OTURMA PLANLARI
  // ========================================

  // Tüm Planları Getir
  ipcMain.handle("get-all-sinav-planlar", async () => {
    try {
      console.log("📋 Tüm sınav planları getiriliyor...");

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        SELECT * FROM ortak_sinav_planlar
        WHERE durum = 1
        ORDER BY id ASC
      `);

      const planlar = [];
      while (stmt.step()) {
        planlar.push(stmt.getAsObject());
      }
      stmt.free();

      console.log(`✅ ${planlar.length} plan bulundu`);
      return { success: true, data: planlar };
    } catch (error) {
      console.error("❌ Planlar getirme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Plan Ekle
  ipcMain.handle("add-sinav-plan", async (event, planData) => {
    try {
      console.log("🆕 Yeni plan ekleniyor:", planData.plan_adi);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        INSERT INTO ortak_sinav_planlar 
        (plan_adi, sira_sayisi, sutun_sayisi, toplam_kapasite, duzeni)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run([
        planData.plan_adi,
        planData.sira_sayisi,
        planData.sutun_sayisi,
        planData.toplam_kapasite,
        planData.duzeni || "Z",
      ]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Plan eklendi");
      return { success: true, message: "Plan başarıyla eklendi!" };
    } catch (error) {
      console.error("❌ Plan ekleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Plan Güncelle
  ipcMain.handle("update-sinav-plan", async (event, planId, planData) => {
    try {
      console.log("✏️ Plan güncelleniyor, ID:", planId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        UPDATE ortak_sinav_planlar SET
          plan_adi = ?,
          sira_sayisi = ?,
          sutun_sayisi = ?,
          toplam_kapasite = ?,
          duzeni = ?,
          guncelleme_tarihi = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run([
        planData.plan_adi,
        planData.sira_sayisi,
        planData.sutun_sayisi,
        planData.toplam_kapasite,
        planData.duzeni,
        parseInt(planId),
      ]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Plan güncellendi");
      return { success: true, message: "Plan başarıyla güncellendi!" };
    } catch (error) {
      console.error("❌ Plan güncelleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Plan Sil
  ipcMain.handle("delete-sinav-plan", async (event, planId) => {
    try {
      console.log("🗑️ Plan siliniyor, ID:", planId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      activeDB.run("UPDATE ortak_sinav_planlar SET durum = 0 WHERE id = ?", [
        parseInt(planId),
      ]);

      db.saveActiveSchoolDB();

      console.log("✅ Plan silindi");
      return { success: true, message: "Plan başarıyla silindi!" };
    } catch (error) {
      console.error("❌ Plan silme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // ========================================
  // SALONLAR
  // ========================================

  // Tüm Salonları Getir
  ipcMain.handle("get-all-sinav-salonlar", async () => {
    try {
      console.log("📋 Tüm sınav salonları getiriliyor...");

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        SELECT 
          s.*,
          p.plan_adi,
          p.sira_sayisi,
          p.sutun_sayisi,
          p.duzeni
        FROM ortak_sinav_salonlar s
        LEFT JOIN ortak_sinav_planlar p ON s.plan_id = p.id
        WHERE s.durum = 1
        ORDER BY s.salon_adi ASC
      `);

      const salonlar = [];
      while (stmt.step()) {
        salonlar.push(stmt.getAsObject());
      }
      stmt.free();

      console.log(`✅ ${salonlar.length} salon bulundu`);
      return { success: true, data: salonlar };
    } catch (error) {
      console.error("❌ Salonlar getirme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Salon Ekle
  ipcMain.handle("add-sinav-salon", async (event, salonData) => {
    try {
      console.log("🆕 Yeni salon ekleniyor:", salonData.salon_adi);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        INSERT INTO ortak_sinav_salonlar 
        (salon_adi, plan_id, kapasite)
        VALUES (?, ?, ?)
      `);

      stmt.run([
        salonData.salon_adi,
        salonData.plan_id || null,
        salonData.kapasite,
      ]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Salon eklendi");
      return { success: true, message: "Salon başarıyla eklendi!" };
    } catch (error) {
      console.error("❌ Salon ekleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Salon Güncelle
  ipcMain.handle("update-sinav-salon", async (event, salonId, salonData) => {
    try {
      console.log("✏️ Salon güncelleniyor, ID:", salonId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        UPDATE ortak_sinav_salonlar SET
          salon_adi = ?,
          plan_id = ?,
          kapasite = ?,
          guncelleme_tarihi = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run([
        salonData.salon_adi,
        salonData.plan_id,
        salonData.kapasite,
        parseInt(salonId),
      ]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Salon güncellendi");
      return { success: true, message: "Salon başarıyla güncellendi!" };
    } catch (error) {
      console.error("❌ Salon güncelleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Salon Sil
  ipcMain.handle("delete-sinav-salon", async (event, salonId) => {
    try {
      console.log("🗑️ Salon siliniyor, ID:", salonId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      activeDB.run("UPDATE ortak_sinav_salonlar SET durum = 0 WHERE id = ?", [
        parseInt(salonId),
      ]);

      db.saveActiveSchoolDB();

      console.log("✅ Salon silindi");
      return { success: true, message: "Salon başarıyla silindi!" };
    } catch (error) {
      console.error("❌ Salon silme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // ========================================
  // SINAVLAR
  // ========================================

  // Tüm Sınavları Getir
  ipcMain.handle("get-all-ortak-sinavlar", async () => {
    try {
      console.log("📋 Tüm ortak sınavlar getiriliyor...");

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        SELECT 
          s.*,
          COUNT(DISTINCT d.ogrenci_id) as dagitilan_ogrenci_sayisi,
          COUNT(DISTINCT g.ogretmen_id) as gozetmen_sayisi
        FROM ortak_sinavlar s
        LEFT JOIN ortak_sinav_dagitim d ON s.id = d.sinav_id
        LEFT JOIN ortak_sinav_gozetmenler g ON s.id = g.sinav_id
        WHERE s.durum = 1
        GROUP BY s.id
        ORDER BY s.sinav_tarihi DESC, s.sinav_saati DESC
      `);

      const sinavlar = [];
      while (stmt.step()) {
        sinavlar.push(stmt.getAsObject());
      }
      stmt.free();

      console.log(`✅ ${sinavlar.length} sınav bulundu`);
      return { success: true, data: sinavlar };
    } catch (error) {
      console.error("❌ Sınavlar getirme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Sınav Ekle
  ipcMain.handle("add-ortak-sinav", async (event, sinavData) => {
    try {
      console.log("🆕 Yeni sınav ekleniyor:", sinavData.sinav_adi);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        INSERT INTO ortak_sinavlar 
        (sinav_kodu, sinav_turu, sinav_adi, sinav_tarihi, sinav_saati, 
         sinif_seviyesi, sinav_donemi, sinav_no, aciklama, mazeret_telafi, kilitli)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        sinavData.sinav_kodu,
        sinavData.sinav_turu,
        sinavData.sinav_adi,
        sinavData.sinav_tarihi,
        sinavData.sinav_saati,
        sinavData.sinif_seviyesi,
        sinavData.sinav_donemi,
        sinavData.sinav_no,
        sinavData.aciklama || null,
        sinavData.mazeret_telafi || 0,
        sinavData.kilitli || 0,
      ]);
      stmt.free();

      const lastInsertId = activeDB.exec("SELECT last_insert_rowid() as id")[0]
        .values[0][0];

      db.saveActiveSchoolDB();

      console.log("✅ Sınav eklendi, ID:", lastInsertId);
      return {
        success: true,
        id: lastInsertId,
        message: "Sınav başarıyla eklendi!",
      };
    } catch (error) {
      console.error("❌ Sınav ekleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Sınav Güncelle
  ipcMain.handle("update-ortak-sinav", async (event, sinavId, sinavData) => {
    try {
      console.log("✏️ Sınav güncelleniyor, ID:", sinavId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        UPDATE ortak_sinavlar SET
          sinav_kodu = ?,
          sinav_turu = ?,
          sinav_adi = ?,
          sinav_tarihi = ?,
          sinav_saati = ?,
          sinif_seviyesi = ?,
          sinav_donemi = ?,
          sinav_no = ?,
          aciklama = ?,
          mazeret_telafi = ?,
          kilitli = ?,
          guncelleme_tarihi = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run([
        sinavData.sinav_kodu,
        sinavData.sinav_turu,
        sinavData.sinav_adi,
        sinavData.sinav_tarihi,
        sinavData.sinav_saati,
        sinavData.sinif_seviyesi,
        sinavData.sinav_donemi,
        sinavData.sinav_no,
        sinavData.aciklama,
        sinavData.mazeret_telafi,
        sinavData.kilitli,
        parseInt(sinavId),
      ]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Sınav güncellendi");
      return { success: true, message: "Sınav başarıyla güncellendi!" };
    } catch (error) {
      console.error("❌ Sınav güncelleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Sınav Sil
  ipcMain.handle("delete-ortak-sinav", async (event, sinavId) => {
    try {
      console.log("🗑️ Sınav siliniyor, ID:", sinavId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      activeDB.run("DELETE FROM ortak_sinav_dagitim WHERE sinav_id = ?", [
        parseInt(sinavId),
      ]);
      activeDB.run("DELETE FROM ortak_sinav_gozetmenler WHERE sinav_id = ?", [
        parseInt(sinavId),
      ]);
      activeDB.run("UPDATE ortak_sinavlar SET durum = 0 WHERE id = ?", [
        parseInt(sinavId),
      ]);

      db.saveActiveSchoolDB();

      console.log("✅ Sınav ve ilişkili kayıtlar silindi");
      return { success: true, message: "Sınav başarıyla silindi!" };
    } catch (error) {
      console.error("❌ Sınav silme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Sınav Kilitle/Kilidi Aç
  ipcMain.handle("toggle-sinav-lock", async (event, sinavId) => {
    try {
      console.log("🔒 Sınav kilidi değiştiriliyor, ID:", sinavId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const checkStmt = activeDB.prepare(
        "SELECT kilitli FROM ortak_sinavlar WHERE id = ?"
      );
      checkStmt.bind([parseInt(sinavId)]);

      let currentLock = 0;
      if (checkStmt.step()) {
        currentLock = checkStmt.getAsObject().kilitli;
      }
      checkStmt.free();

      const newLock = currentLock === 1 ? 0 : 1;

      const stmt = activeDB.prepare(`
        UPDATE ortak_sinavlar SET
          kilitli = ?,
          guncelleme_tarihi = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run([newLock, parseInt(sinavId)]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log(`✅ Sınav ${newLock === 1 ? "kilitlendi" : "kilidi açıldı"}`);
      return {
        success: true,
        locked: newLock === 1,
        message: `Sınav ${newLock === 1 ? "kilitlendi" : "kilidi açıldı"}!`,
      };
    } catch (error) {
      console.error("❌ Kilit değiştirme hatası:", error);
      return { success: false, message: error.message };
    }
  });
  // ========================================
  // DAĞITIM (KELEBEK)
  // ========================================

  ipcMain.handle("get-kelebek-ogrenciler", async () => {
    try {
      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) return [];

      const stmt = activeDB.prepare(`
        SELECT id, okul_no, ad_soyad, sinif, cinsiyet, fotograf_path
        FROM ogrenciler WHERE durum = 1
      `);

      const ogrenciler = [];
      while (stmt.step()) {
        ogrenciler.push(stmt.getAsObject());
      }
      stmt.free();
      return ogrenciler;
    } catch (error) {
      console.error("❌ get-kelebek-ogrenciler hatası:", error);
      return [];
    }
  });

  ipcMain.handle("get-kelebek-salonlar", async () => {
    try {
      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) return [];

      const stmt = activeDB.prepare(`
        SELECT s.id, s.salon_adi, s.kapasite, 
               p.sira_sayisi, p.sutun_sayisi, p.duzeni
        FROM ortak_sinav_salonlar s
        LEFT JOIN ortak_sinav_planlar p ON s.plan_id = p.id
        WHERE s.durum = 1
      `);

      const salonlar = [];
      while (stmt.step()) {
        salonlar.push(stmt.getAsObject());
      }
      stmt.free();
      return salonlar;
    } catch (error) {
      console.error("❌ get-kelebek-salonlar hatası:", error);
      return [];
    }
  });

  ipcMain.handle(
    "kelebek-dagitimi-yap",
    async (event, sinavId, salonIds, ogrenciIds, sabitlenenler) => {
      try {
        console.log("🦋 Kelebek dağıtımı başlatılıyor...");

        const activeDB = db.getActiveSchoolDB();
        if (!activeDB) {
          return { success: false, message: "Aktif veritabanı bulunamadı!" };
        }

        // Eski dağıtımı sil
        activeDB.run("DELETE FROM ortak_sinav_dagitim WHERE sinav_id = ?", [
          parseInt(sinavId),
        ]);

        // Salonları çek
        const salonlar = [];
        for (const salonId of salonIds) {
          const salonStmt = activeDB.prepare(`
            SELECT s.*, p.sira_sayisi, p.sutun_sayisi, p.duzeni
            FROM ortak_sinav_salonlar s
            LEFT JOIN ortak_sinav_planlar p ON s.plan_id = p.id
            WHERE s.id = ?
          `);
          salonStmt.bind([salonId]);

          if (salonStmt.step()) {
            salonlar.push(salonStmt.getAsObject());
          }
          salonStmt.free();
        }

        // Öğrencileri karıştır
        const karisikOgrenciler = [...ogrenciIds].sort(
          () => Math.random() - 0.5
        );

        let ogrenciIndex = 0;

        // ✅ DÜZELTİLDİ: sutun_no -> sutun_index, satir_index eklendi
        const dagitimStmt = activeDB.prepare(`
          INSERT INTO ortak_sinav_dagitim 
          (sinav_id, ogrenci_id, salon_id, sira_no, satir_index, sutun_index, sabitle)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const salon of salonlar) {
          const siraSayisi = salon.sira_sayisi || 8;
          const sutunSayisi = salon.sutun_sayisi || 5;
          let siraNo = 1;

          for (let satir = 0; satir < siraSayisi; satir++) {
            for (let sutun = 0; sutun < sutunSayisi; sutun++) {
              if (ogrenciIndex >= karisikOgrenciler.length) break;

              const ogrenciId = karisikOgrenciler[ogrenciIndex];
              const sabitle = sabitlenenler.includes(ogrenciId) ? 1 : 0;

              // ✅ DÜZELTİLDİ: 7 parametre (satir_index ve sutun_index eklendi)
              dagitimStmt.run([
                parseInt(sinavId),
                parseInt(ogrenciId),
                parseInt(salon.id),
                siraNo,
                satir,
                sutun,
                sabitle,
              ]);

              ogrenciIndex++;
              siraNo++;
            }
            if (ogrenciIndex >= karisikOgrenciler.length) break;
          }

          if (ogrenciIndex >= karisikOgrenciler.length) break;
        }

        dagitimStmt.free();
        db.saveActiveSchoolDB();

        console.log(`✅ ${ogrenciIndex} öğrenci dağıtıldı`);
        return {
          success: true,
          dagitilan: ogrenciIndex,
          message: `${ogrenciIndex} öğrenci başarıyla dağıtıldı!`,
        };
      } catch (error) {
        console.error("❌ Kelebek dağıtımı hatası:", error);
        return { success: false, message: error.message };
      }
    }
  );

  // ✅ DÜZELTİLDİ: getSinavDagitim handler'ı
  ipcMain.handle("get-sinav-dagitim", async (event, sinavId) => {
    try {
      console.log("🔍 Sınav dağıtımı getiriliyor, ID:", sinavId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        console.error("❌ Aktif veritabanı bulunamadı!");
        return {
          success: false,
          data: [],
          error: "Aktif veritabanı bulunamadı!",
        };
      }

      const stmt = activeDB.prepare(`
        SELECT 
          d.id,
          d.sinav_id,
          d.ogrenci_id,
          d.salon_id,
          d.sira_no,
          d.satir_index,
          d.sutun_index,
          d.sabitle,
          o.ad_soyad as ogrenci_ad,
          o.sinif,
          o.okul_no,
          o.fotograf_path,
          o.cinsiyet,
          s.salon_adi
        FROM ortak_sinav_dagitim d
        INNER JOIN ogrenciler o ON d.ogrenci_id = o.id
        INNER JOIN ortak_sinav_salonlar s ON d.salon_id = s.id
        WHERE d.sinav_id = ?
        ORDER BY s.salon_adi, d.sira_no
      `);

      stmt.bind([parseInt(sinavId)]);

      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      console.log(`✅ ${results.length} kayıt bulundu`);
      return { success: true, data: results };
    } catch (error) {
      console.error("❌ Dağıtım getirme hatası:", error);
      return { success: false, data: [], error: error.message };
    }
  });

  ipcMain.handle("toggle-ogrenci-sabitle", async (event, dagitimId) => {
    try {
      console.log("📌 Öğrenci sabitleme durumu değiştiriliyor, ID:", dagitimId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const checkStmt = activeDB.prepare(
        "SELECT sabitle FROM ortak_sinav_dagitim WHERE id = ?"
      );
      checkStmt.bind([parseInt(dagitimId)]);

      let currentSabitle = 0;
      if (checkStmt.step()) {
        currentSabitle = checkStmt.getAsObject().sabitle;
      }
      checkStmt.free();

      const newSabitle = currentSabitle === 1 ? 0 : 1;

      const stmt = activeDB.prepare(
        "UPDATE ortak_sinav_dagitim SET sabitle = ? WHERE id = ?"
      );
      stmt.run([newSabitle, parseInt(dagitimId)]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log(
        `✅ Öğrenci ${newSabitle === 1 ? "sabitlendi" : "sabitleme kaldırıldı"}`
      );
      return {
        success: true,
        sabitle: newSabitle === 1,
        message: `Öğrenci ${
          newSabitle === 1 ? "sabitlendi" : "sabitleme kaldırıldı"
        }!`,
      };
    } catch (error) {
      console.error("❌ Sabitleme değiştirme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // ========================================
  // GÖZETMEN ATAMA
  // ========================================

  ipcMain.handle(
    "add-sinav-gozetmen",
    async (event, sinavId, ogretmenId, salonId, gorevTuru) => {
      try {
        console.log("👨‍🏫 Sınava gözetmen ekleniyor...");

        const activeDB = db.getActiveSchoolDB();
        if (!activeDB) {
          return { success: false, message: "Aktif veritabanı bulunamadı!" };
        }

        const stmt = activeDB.prepare(`
          INSERT INTO ortak_sinav_gozetmenler 
          (sinav_id, ogretmen_id, salon_id, gorev_turu)
          VALUES (?, ?, ?, ?)
        `);

        stmt.run([
          parseInt(sinavId),
          parseInt(ogretmenId),
          parseInt(salonId),
          gorevTuru || "Gözetmen",
        ]);
        stmt.free();

        db.saveActiveSchoolDB();

        console.log("✅ Gözetmen eklendi");
        return { success: true, message: "Gözetmen başarıyla eklendi!" };
      } catch (error) {
        console.error("❌ Gözetmen ekleme hatası:", error);
        return { success: false, message: error.message };
      }
    }
  );

  ipcMain.handle("get-sinav-gozetmenler", async (event, sinavId) => {
    try {
      console.log("📋 Sınav gözetmenleri getiriliyor, ID:", sinavId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        SELECT g.*, o.ad_soyad as ogretmen_ad, o.brans, s.salon_adi
        FROM ortak_sinav_gozetmenler g
        INNER JOIN ogretmenler o ON g.ogretmen_id = o.id
        INNER JOIN ortak_sinav_salonlar s ON g.salon_id = s.id
        WHERE g.sinav_id = ?
        ORDER BY s.salon_adi
      `);

      stmt.bind([parseInt(sinavId)]);

      const gozetmenler = [];
      while (stmt.step()) {
        gozetmenler.push(stmt.getAsObject());
      }
      stmt.free();

      console.log(`✅ ${gozetmenler.length} gözetmen bulundu`);
      return { success: true, data: gozetmenler };
    } catch (error) {
      console.error("❌ Gözetmen listeleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("delete-sinav-gozetmen", async (event, gozetmenId) => {
    try {
      console.log("🗑️ Gözetmen siliniyor, ID:", gozetmenId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      activeDB.run("DELETE FROM ortak_sinav_gozetmenler WHERE id = ?", [
        parseInt(gozetmenId),
      ]);
      db.saveActiveSchoolDB();

      console.log("✅ Gözetmen silindi");
      return { success: true, message: "Gözetmen başarıyla silindi!" };
    } catch (error) {
      console.error("❌ Gözetmen silme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // ========================================
  // AÇIKLAMALAR
  // ========================================

  ipcMain.handle("get-all-sinav-aciklamalar", async () => {
    try {
      console.log("📋 Tüm sınav açıklamaları getiriliyor...");

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        SELECT * FROM ortak_sinav_aciklamalar
        ORDER BY sira ASC
      `);

      const aciklamalar = [];
      while (stmt.step()) {
        aciklamalar.push(stmt.getAsObject());
      }
      stmt.free();

      console.log(`✅ ${aciklamalar.length} açıklama bulundu`);
      return { success: true, data: aciklamalar };
    } catch (error) {
      console.error("❌ Açıklamalar getirme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("add-sinav-aciklama", async (event, aciklama, sira) => {
    try {
      console.log("🆕 Yeni açıklama ekleniyor...");

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        INSERT INTO ortak_sinav_aciklamalar (aciklama, sira)
        VALUES (?, ?)
      `);

      stmt.run([aciklama, sira]);
      stmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Açıklama eklendi");
      return { success: true, message: "Açıklama başarıyla eklendi!" };
    } catch (error) {
      console.error("❌ Açıklama ekleme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle(
    "update-sinav-aciklama",
    async (event, aciklamaId, aciklama, sira) => {
      try {
        console.log("✏️ Açıklama güncelleniyor, ID:", aciklamaId);

        const activeDB = db.getActiveSchoolDB();
        if (!activeDB) {
          return { success: false, message: "Aktif veritabanı bulunamadı!" };
        }

        const stmt = activeDB.prepare(`
          UPDATE ortak_sinav_aciklamalar SET
            aciklama = ?,
            sira = ?
          WHERE id = ?
        `);

        stmt.run([aciklama, sira, parseInt(aciklamaId)]);
        stmt.free();

        db.saveActiveSchoolDB();

        console.log("✅ Açıklama güncellendi");
        return { success: true, message: "Açıklama başarıyla güncellendi!" };
      } catch (error) {
        console.error("❌ Açıklama güncelleme hatası:", error);
        return { success: false, message: error.message };
      }
    }
  );

  ipcMain.handle("delete-sinav-aciklama", async (event, aciklamaId) => {
    try {
      console.log("🗑️ Açıklama siliniyor, ID:", aciklamaId);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      activeDB.run("DELETE FROM ortak_sinav_aciklamalar WHERE id = ?", [
        parseInt(aciklamaId),
      ]);
      db.saveActiveSchoolDB();

      console.log("✅ Açıklama silindi");
      return { success: true, message: "Açıklama başarıyla silindi!" };
    } catch (error) {
      console.error("❌ Açıklama silme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // ========================================
  // GELİŞMİŞ ÖZELLİKLER
  // ========================================

  // Akıllı Gözetmen Dağıt
  ipcMain.handle("akilli-gozetmen-dagit", async (event, sinavId, salonId) => {
    try {
      console.log("🤖 Akıllı gözetmen dağıtımı başlatılıyor...");
      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const sinavStmt = activeDB.prepare(
        `SELECT * FROM ortak_sinavlar WHERE id = ?`
      );
      sinavStmt.bind([parseInt(sinavId)]);

      let sinav = null;
      if (sinavStmt.step()) {
        sinav = sinavStmt.getAsObject();
      }
      sinavStmt.free();

      if (!sinav) {
        return { success: false, message: "Sınav bulunamadı!" };
      }

      const dersAdi = sinav.sinav_adi.split("(")[0].trim();

      const ogretmenlerStmt = activeDB.prepare(`
        SELECT o.*, COALESCE(gp.toplam_gorev_dakika, 0) as gorev_puani
        FROM ogretmenler o
        LEFT JOIN ogretmen_gorev_puanlari gp ON o.id = gp.ogretmen_id 
          AND gp.donem = ?
        WHERE o.durum = 1
        ORDER BY gorev_puani ASC, RANDOM()
      `);

      ogretmenlerStmt.bind([sinav.sinav_donemi]);

      const tumOgretmenler = [];
      while (ogretmenlerStmt.step()) {
        tumOgretmenler.push(ogretmenlerStmt.getAsObject());
      }
      ogretmenlerStmt.free();

      const farkliTransli = tumOgretmenler.filter(
        (ogr) => ogr.brans !== dersAdi
      );

      const uygunOgretmenler =
        farkliTransli.length > 0 ? farkliTransli : tumOgretmenler;

      if (uygunOgretmenler.length === 0) {
        return { success: false, message: "Uygun öğretmen bulunamadı!" };
      }

      const secilenOgretmen = uygunOgretmenler[0];
      const bransUyumu = secilenOgretmen.brans === dersAdi ? 0 : 1;

      const gorevStmt = activeDB.prepare(`
        INSERT INTO ortak_sinav_gozetmenler 
        (sinav_id, ogretmen_id, salon_id, gorev_turu, gorev_puani, brans_uyumu)
        VALUES (?, ?, ?, 'Gözetmen', ?, ?)
      `);

      gorevStmt.run([
        parseInt(sinavId),
        secilenOgretmen.id,
        parseInt(salonId),
        secilenOgretmen.gorev_puani || 0,
        bransUyumu,
      ]);
      gorevStmt.free();

      const updatePuanStmt = activeDB.prepare(`
        INSERT OR REPLACE INTO ogretmen_gorev_puanlari 
        (ogretmen_id, donem, toplam_gorev_sayisi, toplam_gorev_dakika, son_gorev_tarihi)
        VALUES (?, ?, 
          COALESCE((SELECT toplam_gorev_sayisi FROM ogretmen_gorev_puanlari WHERE ogretmen_id = ? AND donem = ?), 0) + 1,
          COALESCE((SELECT toplam_gorev_dakika FROM ogretmen_gorev_puanlari WHERE ogretmen_id = ? AND donem = ?), 0) + 120,
          ?)
      `);

      updatePuanStmt.run([
        secilenOgretmen.id,
        sinav.sinav_donemi,
        secilenOgretmen.id,
        sinav.sinav_donemi,
        secilenOgretmen.id,
        sinav.sinav_donemi,
        sinav.sinav_tarihi,
      ]);
      updatePuanStmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Gözetmen başarıyla atandı");
      return {
        success: true,
        ogretmen: secilenOgretmen,
        bransUyumu: bransUyumu === 1,
        message: `${secilenOgretmen.ad_soyad} gözetmen olarak atandı${
          bransUyumu === 0 ? " (Branş zorunluluğu)" : ""
        }`,
      };
    } catch (error) {
      console.error("❌ Akıllı gözetmen dağıtım hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // ==========================================
  // QR KOD SİSTEMİ
  // ==========================================

  ipcMain.handle("generate-qr-kod", async (event, sinavId, qrTuru, hedefId) => {
    try {
      console.log("📱 QR kod oluşturuluyor...");
      console.log(`   • Sınav ID: ${sinavId}`);
      console.log(`   • QR Türü: ${qrTuru}`);
      console.log(`   • Hedef ID: ${hedefId}`);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      // QR hash oluştur (benzersiz)
      const qrHash = `SINAV-${sinavId}-${qrTuru.toUpperCase()}-${hedefId}-${Date.now()}`;

      // Önce aynı kayıt var mı kontrol et
      const checkStmt = activeDB.prepare(`
      SELECT id FROM sinav_qr_kodlar 
      WHERE sinav_id = ? AND qr_turu = ? AND hedef_id = ?
    `);
      checkStmt.bind([parseInt(sinavId), qrTuru, parseInt(hedefId)]);

      let existingId = null;
      if (checkStmt.step()) {
        existingId = checkStmt.getAsObject().id;
      }
      checkStmt.free();

      if (existingId) {
        // Varsa güncelle
        const updateStmt = activeDB.prepare(`
        UPDATE sinav_qr_kodlar 
        SET qr_hash = ?, olusturma_tarihi = ? 
        WHERE id = ?
      `);
        updateStmt.run([qrHash, new Date().toISOString(), existingId]);
        updateStmt.free();

        console.log(`✅ QR kod güncellendi (ID: ${existingId})`);
      } else {
        // Yoksa ekle
        const insertStmt = activeDB.prepare(`
        INSERT INTO sinav_qr_kodlar (sinav_id, qr_turu, hedef_id, qr_hash, olusturma_tarihi)
        VALUES (?, ?, ?, ?, ?)
      `);
        insertStmt.run([
          parseInt(sinavId),
          qrTuru,
          parseInt(hedefId),
          qrHash,
          new Date().toISOString(),
        ]);
        insertStmt.free();

        console.log(`✅ Yeni QR kod oluşturuldu`);
      }

      db.saveActiveSchoolDB();

      return {
        success: true,
        qr_hash: qrHash,
        message: "QR kod başarıyla oluşturuldu!",
      };
    } catch (error) {
      console.error("❌ QR kod oluşturma hatası:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("verify-qr-kod", async (event, qrHash) => {
    try {
      console.log("🔍 QR kod doğrulanıyor:", qrHash);

      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
      SELECT 
        qr.*,
        o.ad_soyad,
        o.sinif,
        o.okul_no,
        s.salon_adi,
        os.sinav_adi,
        os.sinav_tarihi
      FROM sinav_qr_kodlar qr
      LEFT JOIN ogrenciler o ON qr.hedef_id = o.id AND qr.qr_turu = 'ogrenci'
      LEFT JOIN ortak_sinav_salonlar s ON qr.hedef_id = s.id AND qr.qr_turu = 'salon'
      LEFT JOIN ortak_sinavlar os ON qr.sinav_id = os.id
      WHERE qr.qr_hash = ?
    `);
      stmt.bind([qrHash]);

      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();

      if (result) {
        console.log("✅ QR kod geçerli");
        return { success: true, data: result };
      } else {
        console.log("❌ QR kod bulunamadı");
        return { success: false, message: "QR kod geçersiz!" };
      }
    } catch (error) {
      console.error("❌ QR kod doğrulama hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Yoklama Kaydet
  ipcMain.handle("kaydet-yoklama", async (event, yoklamaData) => {
    try {
      console.log("📝 Yoklama kaydediliyor...");
      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        INSERT OR REPLACE INTO sinav_yoklama_kayitlari 
        (sinav_id, ogrenci_id, salon_id, yoklama_durumu, yoklama_saati, gozetmen_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        parseInt(yoklamaData.sinav_id),
        parseInt(yoklamaData.ogrenci_id),
        parseInt(yoklamaData.salon_id),
        yoklamaData.yoklama_durumu,
        new Date().toISOString(),
        yoklamaData.gozetmen_id || null,
      ]);
      stmt.free();

      const updateStmt = activeDB.prepare(`
        UPDATE ortak_sinav_dagitim 
        SET yoklama_durumu = ?
        WHERE sinav_id = ? AND ogrenci_id = ?
      `);

      updateStmt.run([
        yoklamaData.yoklama_durumu,
        parseInt(yoklamaData.sinav_id),
        parseInt(yoklamaData.ogrenci_id),
      ]);
      updateStmt.free();

      db.saveActiveSchoolDB();

      console.log("✅ Yoklama kaydedildi");
      return { success: true, message: "Yoklama başarıyla kaydedildi!" };
    } catch (error) {
      console.error("❌ Yoklama kaydetme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Disiplin Kaydet
  ipcMain.handle("kaydetDisiplin", async (event, data) => {
    try {
      const db = require("../veritabani/veritabani");
      const activeDB = db.getActiveSchoolDB();

      if (!activeDB) {
        console.error("❌ Aktif veritabanı yok!");
        return { success: false, message: "Aktif veritabanı seçilmemiş!" };
      }

      console.log("🔍 Disiplin kaydı oluşturuluyor...");
      console.log("   • Sınav ID:", data.sinav_id);
      console.log("   • Öğrenci ID:", data.ogrenci_id);
      console.log("   • Salon ID:", data.salon_id);
      console.log("   • Disiplin Türü:", data.disiplin_turu);

      // ✅ salon_id eklendi
      activeDB.run(
        `INSERT INTO sinav_yoklama_kayitlari 
        (sinav_id, ogrenci_id, salon_id, disiplin_turu, disiplin_aciklama, tarih, yoklama_durumu) 
       VALUES (?, ?, ?, ?, ?, ?, 'Mevcut')`,
        [
          data.sinav_id,
          data.ogrenci_id,
          data.salon_id || 0, // ✅ EKLENEN
          data.disiplin_turu,
          data.aciklama,
          data.tarih,
        ]
      );

      db.saveActiveSchoolDB();

      console.log("✅ Disiplin kaydı eklendi");
      return { success: true, message: "Disiplin kaydı başarıyla eklendi" };
    } catch (error) {
      console.error("❌ Disiplin kaydetme hatası:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  });

  // Salon Yoklama Listesi
  ipcMain.handle("get-salon-yoklama", async (event, sinavId, salonId) => {
    try {
      console.log("📋 Salon yoklama listesi getiriliyor...");
      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const stmt = activeDB.prepare(`
        SELECT d.*, o.ad_soyad, o.okul_no, o.sinif, o.fotograf_path,
               COALESCE(y.yoklama_durumu, 'Bekleniyor') as yoklama_durumu,
               y.disiplin_turu, y.disiplin_aciklama
        FROM ortak_sinav_dagitim d
        INNER JOIN ogrenciler o ON d.ogrenci_id = o.id
        LEFT JOIN sinav_yoklama_kayitlari y ON d.sinav_id = y.sinav_id 
          AND d.ogrenci_id = y.ogrenci_id
        WHERE d.sinav_id = ? AND d.salon_id = ?
        ORDER BY d.sira_no
      `);

      stmt.bind([parseInt(sinavId), parseInt(salonId)]);

      const liste = [];
      while (stmt.step()) {
        liste.push(stmt.getAsObject());
      }
      stmt.free();

      console.log(`✅ ${liste.length} öğrenci bulundu`);
      return { success: true, data: liste };
    } catch (error) {
      console.error("❌ Yoklama listesi getirme hatası:", error);
      return { success: false, message: error.message };
    }
  });

  // Sınav Doğrula
  ipcMain.handle("validate-sinav", async (event, sinavData) => {
    try {
      console.log("🔍 Sınav doğrulanıyor...");
      const activeDB = db.getActiveSchoolDB();
      if (!activeDB) {
        return { success: false, message: "Aktif veritabanı bulunamadı!" };
      }

      const uyarilar = [];

      const salonStmt = activeDB.prepare(`
        SELECT SUM(kapasite) as toplam_kapasite
        FROM ortak_sinav_salonlar WHERE durum = 1
      `);

      let toplamKapasite = 0;
      if (salonStmt.step()) {
        toplamKapasite = salonStmt.getAsObject().toplam_kapasite || 0;
      }
      salonStmt.free();

      const ogrenciStmt = activeDB.prepare(`
        SELECT COUNT(*) as sayi
        FROM ogrenciler WHERE durum = 1 AND sinif LIKE ?
      `);

      const seviyeler = sinavData.sinif_seviyesi.split("-");
      let toplamOgrenci = 0;

      for (const seviye of seviyeler) {
        ogrenciStmt.bind([`${seviye}-%`]);
        if (ogrenciStmt.step()) {
          toplamOgrenci += ogrenciStmt.getAsObject().sayi;
        }
        ogrenciStmt.reset();
      }
      ogrenciStmt.free();

      if (toplamOgrenci > toplamKapasite) {
        uyarilar.push({
          tur: "Kapasite",
          seviye: "error",
          mesaj: `Okul kapasitesi ${toplamKapasite} sıra, planlanan öğrenci ${toplamOgrenci}. Lütfen ${
            toplamOgrenci - toplamKapasite
          } öğrenci için ek salon açın!`,
        });
      }

      console.log(`✅ Doğrulama tamamlandı, ${uyarilar.length} uyarı bulundu`);
      return {
        success: true,
        valid: uyarilar.filter((u) => u.seviye === "error").length === 0,
        uyarilar: uyarilar,
      };
    } catch (error) {
      console.error("❌ Sınav doğrulama hatası:", error);
      return { success: false, message: error.message };
    }
  });

  console.log("✅ Ortak Sınav Handler'ları yüklendi (40+ handler)");
}

// ==========================================
// 🔧 DEBUG: TABLO YAPISINI KONTROL ET
// ==========================================

ipcMain.handle("debug-check-table", async () => {
  try {
    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Veritabanı bulunamadı" };
    }

    // Tablo yapısını kontrol et
    const stmt = activeDB.prepare(`PRAGMA table_info(ortak_sinav_dagitim)`);

    const columns = [];
    while (stmt.step()) {
      columns.push(stmt.getAsObject());
    }
    stmt.free();

    console.log("📊 TABLO YAPISI (ortak_sinav_dagitim):");
    console.log(JSON.stringify(columns, null, 2));

    return { success: true, columns };
  } catch (error) {
    console.error("❌ Tablo kontrol hatası:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("debug-check-dagitim-data", async (event, sinavId) => {
  try {
    const activeDB = db.getActiveSchoolDB();
    if (!activeDB) {
      return { success: false, message: "Veritabanı bulunamadı" };
    }

    // Ham veriyi çek
    const stmt = activeDB.prepare(`
      SELECT * FROM ortak_sinav_dagitim WHERE sinav_id = ? LIMIT 5
    `);
    stmt.bind([parseInt(sinavId)]);

    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    console.log("📊 DAĞITIM VERİSİ (İlk 5 kayıt):");
    console.log(JSON.stringify(rows, null, 2));

    return { success: true, rows };
  } catch (error) {
    console.error("❌ Veri kontrol hatası:", error);
    return { success: false, error: error.message };
  }
});

module.exports = registerOrtakSinavHandlers;
