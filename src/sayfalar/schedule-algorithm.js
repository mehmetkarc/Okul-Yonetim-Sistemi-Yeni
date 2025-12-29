/**
 * ============================================
 * AKILLI DERS DAĞITIM ALGORİTMASI
 * ============================================
 * Hibrit yaklaşım:
 * - CSP (Constraint Satisfaction)
 * - Greedy + A* (Hızlı başlangıç)
 * - Genetic Algorithm (Optimizasyon)
 * - AI Learning (Uzun vadeli iyileştirme)
 *
 * @version 1.0.0
 * @author Okul Yönetim Sistemi
 */

class ScheduleAlgorithm {
  constructor() {
    // Veri yöneticileri
    this.dataManager = window.ScheduleDataManager;
    this.constraintManager = window.ConstraintManager;

    // Program verisi
    this.program = {}; // {sinifId: {gun: {saat: {dersId, ogretmenId}}}}
    this.yerlestirilmeyenDersler = [];

    // İstatistikler
    this.stats = {
      toplamDers: 0,
      yerlestirilen: 0,
      basarisiz: 0,
      sure: 0,
      jenerasyon: 0,
    };

    // Ayarlar
    this.config = {
      maxAttempts: 1000,
      timeoutMs: 60000, // 60 saniye
      populationSize: 50,
      maxGenerations: 500,
      mutationRate: 0.1,
      elitismRate: 0.2,
    };

    // Progress callback
    this.onProgress = null;
    this.onComplete = null;

    console.log("✅ ScheduleAlgorithm başlatıldı");
  }

  // ============================================
  // 1. ANA DAĞITIM FONKSİYONU
  // ============================================

  /**
   * Otomatik dağıtımı başlat
   * @param {Object} options - Dağıtım seçenekleri
   * @param {string} options.mode - "all" | "class" | "teacher" | "subject"
   * @param {Array} options.targets - Hedef ID'ler (sınıf/öğretmen/ders)
   * @param {Function} options.onProgress - İlerleme callback
   * @param {Function} options.onComplete - Tamamlanma callback
   * @returns {Promise<Object>} Sonuç
   */
  async dagit(options = {}) {
    console.log("🚀 Otomatik dağıtım başladı:", options);

    // Başlangıç
    const startTime = Date.now();
    this.onProgress = options.onProgress || null;
    this.onComplete = options.onComplete || null;

    try {
      // ADIM 1: Veri toplama
      this.updateProgress("Veriler toplanıyor...", 0);
      const data = await this.veriTopla(options);

      if (data.dersler.length === 0) {
        throw new Error("Dağıtılacak ders bulunamadı!");
      }

      // ADIM 2: GREEDY ile hızlı başlangıç
      this.updateProgress("Hızlı yerleştirme başladı...", 10);
      const greedySonuc = await this.greedyDagit(data);

      // ADIM 3: Genetik Algoritma ile optimizasyon
      this.updateProgress("Optimizasyon başladı...", 50);
      const gaSonuc = await this.genetikOptimizasyon(greedySonuc, data);

      // ADIM 4: Sonuçları kaydet
      this.updateProgress("Sonuçlar kaydediliyor...", 95);
      await this.sonuclariKaydet(gaSonuc);

      // İstatistikler
      this.stats.sure = Date.now() - startTime;
      this.updateProgress("Tamamlandı!", 100);

      const sonuc = {
        success: true,
        program: this.program,
        stats: this.stats,
        yerlestirilmeyenDersler: this.yerlestirilmeyenDersler,
      };

      if (this.onComplete) {
        this.onComplete(sonuc);
      }

      return sonuc;
    } catch (error) {
      console.error("❌ Dağıtım hatası:", error);

      const sonuc = {
        success: false,
        error: error.message,
        stats: this.stats,
      };

      if (this.onComplete) {
        this.onComplete(sonuc);
      }

      return sonuc;
    }
  }

  // ============================================
  // 2. VERİ TOPLAMA
  // ============================================

  async veriTopla(options) {
    console.log("📦 Veri toplama başladı");

    const data = {
      siniflar: [],
      ogretmenler: [],
      dersler: [],
      kisitlar: {},
      tercihler: {},
    };

    // Modlara göre veri toplama
    switch (options.mode) {
      case "all":
        // Tüm okul
        data.siniflar = this.dataManager.getSiniflar();
        data.ogretmenler = this.dataManager.getOgretmenler();
        break;

      case "class":
        // Seçili sınıflar
        data.siniflar = options.targets
          .map((id) => this.dataManager.sinifBul(id))
          .filter(Boolean);
        break;

      case "teacher":
        // Seçili öğretmenler
        data.ogretmenler = options.targets
          .map((id) => this.dataManager.ogretmenBul(id))
          .filter(Boolean);
        break;

      case "subject":
        // Seçili dersler
        // TODO: Ders bazlı filtreleme
        break;
    }

    // Dersleri topla (sınıf-ders-öğretmen kombinasyonları)
    data.dersler = await this.dersleriTopla(data.siniflar);

    console.log(`✅ Veri toplandı: ${data.dersler.length} ders`);
    return data;
  }

  async dersleriTopla(siniflar) {
    const dersler = [];

    for (const sinif of siniflar) {
      for (const ders of sinif.mevcutDersler) {
        const dersDetay = this.dataManager.dersBul(ders.dersId);
        const ogretmen = this.dataManager.ogretmenBul(ders.ogretmenId);

        if (!dersDetay || !ogretmen) continue;

        // Blokları ayır
        const bloklar = dersDetay.bloklar || [ders.saatSayisi];

        bloklar.forEach((blokUzunluk, index) => {
          dersler.push({
            id: `${sinif.id}_${ders.dersId}_${index}`,
            sinifId: sinif.id,
            sinifKod: sinif.kod,
            dersId: ders.dersId,
            dersAd: dersDetay.ad,
            dersKod: dersDetay.kod,
            ogretmenId: ders.ogretmenId,
            ogretmenAd: ogretmen.tamAd,
            ogretmenKisaAd: ogretmen.kod,
            blokUzunluk: blokUzunluk,
            renk: dersDetay.renk,
          });
        });
      }
    }

    return dersler;
  }

  // ============================================
  // 3. GREEDY DAĞITIM (Hızlı Başlangıç)
  // ============================================

  async greedyDagit(data) {
    console.log("⚡ GREEDY dağıtım başladı");

    // Dersleri zorluğa göre sırala (MRV - Minimum Remaining Values)
    const sortedDersler = this.dersleriSirala(data.dersler);

    let yerlestirilen = 0;

    for (let i = 0; i < sortedDersler.length; i++) {
      const ders = sortedDersler[i];

      // İlerleme güncelle
      const progress = 10 + Math.floor((i / sortedDersler.length) * 40);
      this.updateProgress(
        `Yerleştiriliyor: ${ders.sinifKod} - ${ders.dersAd}`,
        progress
      );

      // Uygun hücre bul
      const hucre = await this.uygunHucreBul(ders);

      if (hucre) {
        // Yerleştir
        this.dersYerlestir(hucre.gun, hucre.saat, ders);
        yerlestirilen++;
      } else {
        // Yerleştirilemedi
        this.yerlestirilmeyenDersler.push(ders);
      }

      // Her 10 derste bir ekrana yansıt (animasyon için)
      if (i % 10 === 0) {
        await this.sleep(50); // 50ms bekle
      }
    }

    this.stats.yerlestirilen = yerlestirilen;
    this.stats.basarisiz = sortedDersler.length - yerlestirilen;

    console.log(
      `✅ GREEDY tamamlandı: ${yerlestirilen}/${sortedDersler.length}`
    );

    return {
      program: this.program,
      yerlestirilen,
      toplamDers: sortedDersler.length,
    };
  }

  // ============================================
  // 4. DERS SIRALAMA (Heuristic)
  // ============================================

  dersleriSirala(dersler) {
    // Önce kopyala (orijinali değiştirme)
    const sorted = [...dersler];

    // Rastgele karıştır (aynı derslerin arka arkaya gelmemesi için)
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }

    // Sonra önceliklere göre sırala
    return sorted.sort((a, b) => {
      // 1. Öncelik: Blok uzunluğu (uzun bloklar önce)
      if (a.blokUzunluk !== b.blokUzunluk) {
        return b.blokUzunluk - a.blokUzunluk;
      }

      // 2. Öncelik: Sınıf (aynı sınıfın dersleri dağılsın)
      if (a.sinifId !== b.sinifId) {
        return a.sinifId.localeCompare(b.sinifId);
      }

      // 3. Öncelik: Rastgele (aynı dersin farklı blokları karışık)
      return Math.random() - 0.5;
    });
  }

  // ============================================
  // 5. UYGUN HÜCRE BULMA (Geliştirilmiş)
  // ============================================

  async uygunHucreBul(ders) {
    // Günleri RASTGELE karıştır (hep Pazartesi'den başlama!)
    const gunler = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);

    // Dinamik saat sayısı
    let maxSaat = 8;
    if (window.programConfig && window.programConfig.gunlukDers) {
      if (window.programConfig.gunlukDers.type === "sabit") {
        maxSaat = window.programConfig.gunlukDers.sabit;
      } else {
        maxSaat = Math.max(
          ...Object.values(window.programConfig.gunlukDers.farkli)
        );
      }
    }

    const saatler = Array.from({ length: maxSaat }, (_, i) => i + 1);

    let enIyiHucre = null;
    let enIyiSkor = -Infinity;

    for (const gun of gunler) {
      for (const saat of saatler) {
        // Blok sığar mı?
        if (saat + ders.blokUzunluk - 1 > maxSaat) {
          continue;
        }

        // Kısıtları kontrol et
        const kisitSonuc = this.kisitKontrolEt(gun, saat, ders);

        if (kisitSonuc.success) {
          // Skor hesapla
          const skor = this.skorHesapla(gun, saat, ders);

          if (skor > enIyiSkor) {
            enIyiSkor = skor;
            enIyiHucre = { gun, saat };
          }
        }
      }
    }

    if (!enIyiHucre) {
      console.warn(
        `⚠️ Uygun hücre bulunamadı: ${ders.sinifKod}-${ders.dersAd} (${ders.blokUzunluk} saat)`
      );
    }

    return enIyiHucre;
  }

  // ============================================
  // 6. KISIT KONTROLÜ (GÜÇLENDİRİLMİŞ)
  // ============================================

  kisitKontrolEt(gun, saat, ders) {
    console.log(
      `🔍 Kısıt kontrolü: Gün ${gun}, Saat ${saat}, Ders ${ders.dersKod}`
    );

    // ============================================
    // A) TEMEL ÇAKIŞMA KONTROLÜ (ZORUNLU)
    // ============================================

    // Blok boyunca tüm saatleri kontrol et
    for (let i = 0; i < ders.blokUzunluk; i++) {
      const mevcutSaat = saat + i;

      // 1. Öğretmen çakışması
      if (this.ogretmenMesgulMu(gun, mevcutSaat, ders.ogretmenId)) {
        return {
          success: false,
          mesaj: `Öğretmen meşgul (Gün ${gun}, Saat ${mevcutSaat})`,
          tip: "critical",
        };
      }

      // 2. Sınıf çakışması
      if (this.sinifMesgulMu(gun, mevcutSaat, ders.sinifId)) {
        return {
          success: false,
          mesaj: `Sınıf meşgul (Gün ${gun}, Saat ${mevcutSaat})`,
          tip: "critical",
        };
      }
    }

    // ============================================
    // B) ÖĞRETMEN TERCİHLERİ (YÖNLENDİRİCİ)
    // ============================================

    if (window.PreferenceManager && ders.ogretmenId) {
      // 1. Boş gün kontrolü
      if (!window.PreferenceManager.gunMusaitMi(gun, ders.ogretmenId)) {
        console.log(`⚠️ Öğretmen ${ders.ogretmenAd} bu günü boş istiyor`);
        return {
          success: false,
          mesaj: `Öğretmen ${ders.ogretmenAd} ${this.gunAdi(
            gun
          )} gününü boş istiyor`,
          tip: "preference",
        };
      }

      // 2. Kapalı saat kontrolü
      for (let i = 0; i < ders.blokUzunluk; i++) {
        const mevcutSaat = saat + i;
        if (
          !window.PreferenceManager.saatMusaitMi(
            gun,
            mevcutSaat,
            ders.ogretmenId
          )
        ) {
          console.log(
            `⚠️ Öğretmen ${ders.ogretmenAd} ${mevcutSaat}. saati kapalı olarak işaretlemiş`
          );
          return {
            success: false,
            mesaj: `Öğretmen ${ders.ogretmenAd} ${mevcutSaat}. saati uygun görmüyor`,
            tip: "preference",
          };
        }
      }
    }

    // ============================================
    // C) CONSTRAINT MANAGER KONTROLÜ (GÜÇLENDİRİLMİŞ)
    // ============================================

    if (window.ConstraintManager) {
      // Global program yapısını dönüştür (ConstraintManager formatına)
      const globalProgram = this.convertToGlobalFormat();

      const kisitSonuc = window.ConstraintManager.kontrolEt(
        gun,
        saat,
        ders.dersId,
        ders.ogretmenId,
        ders.sinifId,
        globalProgram
      );

      if (!kisitSonuc.success && kisitSonuc.ihlaller.length > 0) {
        // En yüksek öncelikli ihlali bul
        const enOnemliIhlal = kisitSonuc.ihlaller.reduce((max, ihlal) => {
          return ihlal.oncelik > max.oncelik ? ihlal : max;
        }, kisitSonuc.ihlaller[0]);

        console.log(`❌ Kısıt ihlali: ${enOnemliIhlal.mesaj}`);

        return {
          success: false,
          mesaj: enOnemliIhlal.mesaj,
          tip: "constraint",
          oncelik: enOnemliIhlal.oncelik,
        };
      }
    }

    // ============================================
    // D) EK KONTROLLER
    // ============================================

    // 1. Günlük maksimum ders limiti (öğretmen)
    const ogretmenGunlukDers = this.getOgretmenGunlukDersSayisi(
      gun,
      ders.ogretmenId
    );
    const maxDersLimiti = 8; // Config'den alınabilir

    if (ogretmenGunlukDers >= maxDersLimiti) {
      return {
        success: false,
        mesaj: `Öğretmen günlük ${maxDersLimiti} ders limitine ulaştı`,
        tip: "limit",
      };
    }

    // 2. Günlük minimum ders kontrolü (öğretmen için gün başına min 2 ders)
    // TODO: Dağıtım sonunda kontrol edilmeli

    // 3. Blok dersleri aynı gün kontrolü
    if (ders.blokUzunluk > 1) {
      // Aynı dersin başka bloğu bu günde var mı?
      const ayniGunBlokVar = this.ayniDersAyniGundeVarMi(
        gun,
        ders.sinifId,
        ders.dersId
      );
      if (ayniGunBlokVar) {
        return {
          success: false,
          mesaj: `${ders.dersKod} bloğu aynı günde 2 kez olamaz`,
          tip: "block",
        };
      }
    }

    // 4. Max boş pencere kontrolü
    const maxBosPencere = 2; // Config'den alınabilir
    const bosPencereSayisi = this.getBosPencereSayisi(
      gun,
      saat,
      ders.ogretmenId
    );

    if (bosPencereSayisi > maxBosPencere) {
      return {
        success: false,
        mesaj: `Öğretmen için ${bosPencereSayisi} saatlik boşluk oluşuyor (max: ${maxBosPencere})`,
        tip: "gap",
      };
    }

    // ✅ TÜM KONTROLLERDEN GEÇTİ
    console.log(`✅ Tüm kısıtlar geçildi`);
    return { success: true };
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  /**
   * Öğretmenin bir gündeki toplam ders sayısı
   */
  getOgretmenGunlukDersSayisi(gun, ogretmenId) {
    let toplam = 0;

    for (const sinifId in this.program) {
      if (this.program[sinifId][gun]) {
        Object.values(this.program[sinifId][gun]).forEach((hucre) => {
          if (hucre.ogretmenId === ogretmenId) {
            toplam++;
          }
        });
      }
    }

    return toplam;
  }

  /**
   * Aynı ders aynı günde var mı? (blok kontrolü)
   */
  ayniDersAyniGundeVarMi(gun, sinifId, dersId) {
    if (!this.program[sinifId] || !this.program[sinifId][gun]) {
      return false;
    }

    return Object.values(this.program[sinifId][gun]).some(
      (hucre) => hucre.dersId === dersId
    );
  }

  /**
   * Boş pencere sayısını hesapla
   */
  getBosPencereSayisi(gun, yeniSaat, ogretmenId) {
    // Öğretmenin bu gündeki tüm derslerini bul
    const dersler = [];

    for (const sinifId in this.program) {
      if (this.program[sinifId][gun]) {
        Object.keys(this.program[sinifId][gun]).forEach((saat) => {
          const hucre = this.program[sinifId][gun][saat];
          if (hucre.ogretmenId === ogretmenId) {
            dersler.push(parseInt(saat));
          }
        });
      }
    }

    // Yeni saati ekle
    dersler.push(parseInt(yeniSaat));
    dersler.sort((a, b) => a - b);

    // Boşlukları say
    let maxBosluk = 0;
    for (let i = 0; i < dersler.length - 1; i++) {
      const bosluk = dersler[i + 1] - dersler[i] - 1;
      if (bosluk > maxBosluk) {
        maxBosluk = bosluk;
      }
    }

    return maxBosluk;
  }

  /**
   * Program yapısını global formata dönüştür
   */
  convertToGlobalFormat() {
    const globalProgram = {};

    for (const sinifId in this.program) {
      for (const gun in this.program[sinifId]) {
        if (!globalProgram[gun]) globalProgram[gun] = {};

        for (const saat in this.program[sinifId][gun]) {
          const hucre = this.program[sinifId][gun][saat];

          // Eğer bu hücre zaten doluysa, çakışma var demektir
          if (!globalProgram[gun][saat]) {
            globalProgram[gun][saat] = {
              ders_id: hucre.dersId,
              ogretmen_id: hucre.ogretmenId,
              sinif_id: hucre.sinifId,
            };
          }
        }
      }
    }

    return globalProgram;
  }

  /**
   * Gün adını getir
   */
  gunAdi(gun) {
    const gunler = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    return gunler[gun] || `Gün ${gun}`;
  }

  // ============================================
  // 7. SKOR HESAPLAMA
  // ============================================

  skorHesapla(gun, saat, ders) {
    let skor = 100; // Temel skor

    // BONUS 1: Farklı günlere dağıt
    if (gun === 1) {
      skor -= 20; // Pazartesi yoğun olmasın
    } else if (gun === 5) {
      skor -= 10; // Cuma da fazla yoğun olmasın
    } else {
      skor += 5; // Orta günler ideal
    }

    // BONUS 2: Gün doluluk oranı
    const gunDoluluOrani = this.getGunDoluluOrani(ders.sinifId, gun);
    skor -= gunDoluluOrani * 50;

    // BONUS 3: Sabah saatleri tercih edilsin
    if (saat >= 1 && saat <= 3) {
      skor += 10;
    } else if (saat >= 6) {
      skor -= 5;
    }

    // BONUS 4: Boşluk cezası
    const boslukCezasi = this.getBoslukCezasi(ders.sinifId, gun, saat);
    skor -= boslukCezasi * 5;

    // ✅ BONUS 5: ÖĞRETMEN TERCİHİ (GÜÇLENDİRİLMİŞ)
    if (window.PreferenceManager && ders.ogretmenId) {
      const tercihSkoru = window.PreferenceManager.skorHesapla(
        gun,
        saat,
        ders.ogretmenId
      );

      const tercihFarki = tercihSkoru - 100;
      skor += tercihFarki * 2; // Tercihlere 2x ağırlık ver

      console.log(
        `🎯 Öğretmen tercih etkisi: ${tercihFarki} (Toplam: ${skor})`
      );
    }

    // ✅ BONUS 6: BLOK DERSİ UYUMU
    if (ders.blokUzunluk > 1) {
      // Blok dersleri sabah saatlerinde daha iyi
      if (saat <= 2) {
        skor += 15;
      }

      // Öğle arası ile bölünmesin
      if (saat === 4 || saat === 5) {
        skor -= 20;
      }
    }

    // ✅ BONUS 7: ÖĞRETMEN GÜNLÜK YÜK DAĞILIMI
    const ogretmenGunlukDers = this.getOgretmenGunlukDersSayisi(
      gun,
      ders.ogretmenId
    );
    if (ogretmenGunlukDers >= 6) {
      skor -= 15; // Günlük 6+ ders varsa caydır
    } else if (ogretmenGunlukDers <= 2) {
      skor += 10; // Az dersli günlere teşvik
    }

    return Math.max(0, skor); // Negatif olmasın
  }

  // ============================================
  // 8. DERS YERLEŞTİRME
  // ============================================

  dersYerlestir(gun, saat, ders) {
    const sinifId = ders.sinifId;

    // Program yapısını oluştur
    if (!this.program[sinifId]) {
      this.program[sinifId] = {};
    }

    if (!this.program[sinifId][gun]) {
      this.program[sinifId][gun] = {};
    }

    // Blok boyunca yerleştir VE ekrana yansıt
    for (let i = 0; i < ders.blokUzunluk; i++) {
      const mevcutSaat = saat + i;

      // Programa ekle
      this.program[sinifId][gun][mevcutSaat] = {
        dersId: ders.dersId,
        dersAd: ders.dersAd,
        dersKod: ders.dersKod,
        ogretmenId: ders.ogretmenId,
        ogretmenAd: ders.ogretmenAd,
        ogretmenKisaAd: ders.ogretmenKisaAd,
        sinifId: sinifId,
        sinifKod: ders.sinifKod,
        renk: ders.renk,
        blokIndex: i,
        blokUzunluk: ders.blokUzunluk,
      };

      // Her saati ekrana yansıt
      this.ekranaYansit(gun, mevcutSaat, {
        ...ders,
        blokIndex: i,
      });
    }

    console.log(
      `✅ ${ders.blokUzunluk} saatlik blok: ${ders.sinifKod}-${
        ders.dersAd
      } → Gün ${gun}, Saat ${saat}-${saat + ders.blokUzunluk - 1}`
    );
  }

  ekranaYansit(gun, saat, ders) {
    // Hücreyi bul
    const cell = document.querySelector(
      `.ders-cell[data-gun="${gun}"][data-saat="${saat}"] .cell-content`
    );

    if (!cell) {
      console.warn(`⚠️ Hücre bulunamadı: Gün ${gun}, Saat ${saat}`);
      return;
    }

    // Animasyon için class ekle
    cell.classList.add("filling");
    cell.classList.remove("empty");

    // İçeriği güncelle
    cell.innerHTML = `
    <div class="cell-header">
      <span class="cell-sinif">${ders.sinifKod}</span>
      <span class="cell-ders">${ders.dersKod}</span>
    </div>
    <div class="cell-ogretmen">${ders.ogretmenKisaAd}</div>
  `;

    // Arka plan rengini ayarla (dersin rengi)
    if (ders.renk) {
      cell.style.background = `linear-gradient(135deg, ${ders.renk}dd 0%, ${ders.renk} 100%)`;
      cell.style.borderColor = ders.renk;
    }

    // Animasyon bitince class'ı kaldır
    setTimeout(() => {
      cell.classList.remove("filling");
    }, 600);

    console.log(
      `📍 Yerleştirildi: ${ders.sinifKod}-${ders.dersAd} → Gün ${gun}, Saat ${saat}`
    );
  }

  // ============================================
  // 9. GENETİK ALGORİTMA (Placeholder)
  // ============================================

  async genetikOptimizasyon(greedySonuc, data) {
    console.log("🧬 Genetik optimizasyon başladı");

    // TODO: GA implementasyonu (sonraki adımda)

    this.updateProgress("Optimizasyon tamamlandı", 90);

    return greedySonuc;
  }

  // ============================================
  // 10. SONUÇLARI KAYDET
  // ============================================

  async sonuclariKaydet(sonuc) {
    console.log("💾 Sonuçlar kaydediliyor");

    // ✅ 1. GLOBAL programData'yı güncelle
    if (window.programData) {
      window.programData = { ...this.program };
      console.log(
        "✅ window.programData güncellendi:",
        Object.keys(window.programData).length,
        "gün"
      );
    }

    // ✅ 2. Tabloyu güncelle
    for (const gun in this.program) {
      for (const saat in this.program[gun]) {
        const hucre = this.program[gun][saat];

        // Tablodaki hücreyi bul
        const cell = document.querySelector(
          `.cell-content[data-gun="${gun}"][data-saat="${saat}"]`
        );

        if (cell && hucre) {
          // Hücreyi güncelle
          cell.classList.remove("empty");
          cell.classList.add("filled");

          cell.style.backgroundColor = hucre.renk || "#4ECDC4";

          cell.innerHTML = `
          <div class="cell-ders">
            <div class="cell-ders-kod">${hucre.ders_kodu || "?"}</div>
            <div class="cell-sinif">${hucre.sinif_kodu || "?"}</div>
            <div class="cell-ogretmen">${hucre.ogretmen_kod || "?"}</div>
          </div>
        `;
        }
      }
    }

    console.log("✅ Tablo güncellendi");

    // ✅ 3. DataManager'a kaydet
    if (this.dataManager) {
      // ✅ this.program bir object, array değil!
      this.dataManager.program = { ...this.program }; // Object olarak kopyala
      this.dataManager.saveToStorage();
      console.log("✅ DataManager'a kaydedildi");
    }

    return true;
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  updateProgress(mesaj, oran) {
    console.log(`[${oran}%] ${mesaj}`);

    if (this.onProgress) {
      this.onProgress({
        mesaj,
        oran,
        stats: this.stats,
      });
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // RESET
  // ============================================

  reset() {
    this.program = {};
    this.yerlestirilmeyenDersler = [];
    this.stats = {
      toplamDers: 0,
      yerlestirilen: 0,
      basarisiz: 0,
      sure: 0,
      jenerasyon: 0,
    };
  }
}

// ============================================
// EXPORT
// ============================================

const scheduleAlgorithm = new ScheduleAlgorithm();
window.ScheduleAlgorithm = scheduleAlgorithm;

console.log("✅ ScheduleAlgorithm hazır");
