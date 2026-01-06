// ==========================================
// 🎨 ORTAK SINAV ULTRA MODERN MODAL SİSTEMİ
// ==========================================
// SweetAlert2 ile profesyonel modaller
// Glassmorphism + Smooth Animations
// ==========================================

/**
 * 🆕 FULL ENTEGRE AKILLI SINAV MODAL
 * - Modern Tasarım + Şube Seçimi + Otomatik Yayma
 * - Akıllı Validasyon + Kapasite Kontrolü
 * - 4 YENİ ÖZELLİK ENTEGRASYONLARİ
 */
async function openYeniSinavModal() {
  try {
    // 🎯 ADIM 1: REHBERLİK PENCERESİ
    const rehberlikSonuc = await Swal.fire({
      title:
        '<div style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🎓 Sınav Oturumu Oluşturma Rehberi</div>',
      html: `
        <div style="text-align: left; padding: 20px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%); border-radius: 16px; border: 2px solid rgba(102, 126, 234, 0.2);">
          <div style="margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
              <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                1️⃣
              </div>
              <div style="flex: 1;">
                <h3 style="margin: 0; color: #667eea; font-size: 18px; font-weight: 700;">Sınav Oturumu Nedir?</h3>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                  Aynı tarih ve saatte yapılacak, farklı sınıf seviyelerindeki <strong>birden fazla dersin sınavlarını</strong> tek seferde oluşturmanızı sağlar.
                </p>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
              <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                2️⃣
              </div>
              <div style="flex: 1;">
                <h3 style="margin: 0; color: #10b981; font-size: 18px; font-weight: 700;">Nasıl Kullanılır?</h3>
                <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                  <li><strong>Ders Seçimi:</strong> Bir ders seçtiğinizde diğer seviyeler otomatik önerilir.</li>
                  <li><strong>Şube Seçimi:</strong> Altta çıkan şube kutucuklarına tıklayarak sınavı o şubeden çıkarabilirsiniz.</li>
                  <li><strong>Mavi Kutu:</strong> Sınav yapılacak, <strong>Gri Kutu:</strong> Sınav yapılmayacak demektir.</li>
                </ul>
              </div>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%); padding: 15px; border-radius: 12px; border-left: 4px solid #ef4444;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-size: 24px;">💡</div>
              <div style="flex: 1; color: #ef4444; font-size: 14px; font-weight: 600; line-height: 1.6;">
                <strong>İpucu:</strong> Şube isimleri gelmiyorsa sınıflar tablonuzu kontrol ediniz.
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 25px; padding: 15px; background: rgba(102, 126, 234, 0.05); border-radius: 12px; text-align: center;">
          <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
            ⏱️ Bu pencere <strong id="countdown">5</strong> saniye sonra otomatik kapanacak
          </div>
        </div>
      `,
      width: "750px",
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-arrow-right"></i> Devam Et',
      cancelButtonText: '<i class="fas fa-times"></i> Vazgeç',
      confirmButtonColor: "#667eea",
      cancelButtonColor: "#ef4444",
      timer: 5000,
      timerProgressBar: true,
      allowOutsideClick: false,
      didOpen: () => {
        let countdown = 5;
        const countdownEl = document.getElementById("countdown");
        const interval = setInterval(() => {
          countdown--;
          if (countdownEl && countdown > 0) countdownEl.textContent = countdown;
          if (countdown <= 0) clearInterval(interval);
        }, 1000);
      },
    });

    if (
      !rehberlikSonuc.isConfirmed &&
      rehberlikSonuc.dismiss === Swal.DismissReason.cancel
    )
      return;

    // 🎯 VERİLERİ ÇEK
    const [derslerRes, siniflarRes, mevcutSinavlarRes] = await Promise.all([
      window.electronAPI.getAllDersler(),
      window.electronAPI.getAllClasses(),
      window.electronAPI.getAllOrtakSinavlar(),
    ]);

    if (!derslerRes.success || !siniflarRes.success)
      throw new Error("Veriler yüklenemedi");

    const tumDersler = derslerRes.data;
    const tumSiniflar = siniflarRes.data;
    const mevcutSinavlar = mevcutSinavlarRes.success
      ? mevcutSinavlarRes.data
      : [];

    console.log("📚 Yüklenen Dersler:", tumDersler.length);
    console.log("🏫 Yüklenen Sınıflar:", tumSiniflar.length);

    // 🎯 ADIM 2: ANA MODAL (Ultra Modern + Tıklanabilir Şube)
    const mainModalResult = await Swal.fire({
      title:
        '<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 26px; font-weight: 800;">🎯 Sınav Oturumu Planla</span>',
      html: `
        <div class="swal-form-modern">
          <div class="form-row-modern">
            <div class="form-group-modern full-width">
              <label class="label-modern">📝 Sınav Oturumu Adı *</label>
              <input id="sinavAdi" class="swal2-input input-modern" placeholder="Örn: 2025-2026 I. Dönem 1. Ortak Sınavları">
            </div>
          </div>

          <div class="form-row-modern">
            <div class="form-group-modern">
              <label class="label-modern">📅 Sınav Tarihi *</label>
              <input type="date" id="sinavTarihi" class="swal2-input input-modern">
            </div>
            <div class="form-group-modern">
              <label class="label-modern">⏰ Sınav Saati *</label>
              <input type="time" id="sinavSaati" class="swal2-input input-modern">
            </div>
          </div>

          <div class="form-row-modern">
            <div class="form-group-modern">
              <label class="label-modern">📌 Kategori</label>
              <select id="sinavKategori" class="swal2-select select-modern">
                <option value="Yazılı">📝 Yazılı Sınav</option>
                <option value="Uygulama">🛠️ Uygulama Sınavı</option>
                <option value="Sözlü">🗣️ Sözlü Sınav</option>
                <option value="Dinleme-Konuşma">🎧 Dinleme-Konuşma Sınavı</option>
              </select>
            </div>
            <div class="form-group-modern">
              <label class="label-modern">🦋 Yerleşim</label>
              <select id="sinavYerlesim" class="swal2-select select-modern">
                <option value="Kelebek">🦋 Kelebek Sistemi</option>
                <option value="Karma">🔀 Sınıf İçi Karma</option>
                <option value="Normal">📋 Normal Düzen</option>
              </select>
            </div>
          </div>

          <div style="margin-top: 25px; border-top: 2px solid rgba(102, 126, 234, 0.2); padding-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <label class="label-modern" style="color: #667eea; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-layer-group"></i> SINIF, DERS VE ŞUBE SEÇİMİ
              </label>
              <button type="button" id="addMoreExam" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 11px; font-weight: bold; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
                <i class="fas fa-plus-circle"></i> GRUP EKLE
              </button>
            </div>
            
            <div id="dynamicExamContainer" style="max-height: 400px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 12px; border: 2px dashed rgba(102,126,234,0.3);"></div>
            
            <div style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.05); border-left: 3px solid #10b981; border-radius: 6px; font-size: 11px; color: #059669;">
              💡 <strong>İpucu:</strong> Şube kutularına tıklayarak o şubeyi sınavdan <strong>çıkarabilirsiniz</strong>.
            </div>
          </div>
        </div>
      `,
      width: "900px",
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-save"></i> Sınavları Kaydet',
      cancelButtonText: '<i class="fas fa-times"></i> İptal',
      confirmButtonColor: "#667eea",
      cancelButtonColor: "#6b7280",
      allowOutsideClick: false,
      didOpen: () => {
        const container = document.getElementById("dynamicExamContainer");
        const addBtn = document.getElementById("addMoreExam");

        const createRow = (seviye = "9", dersAdi = "") => {
          // Çift kayıt kontrolü
          const mevcutlar = Array.from(
            container.querySelectorAll(".s-seviye")
          ).map((s) => s.value);

          if (dersAdi !== "" && mevcutlar.includes(seviye.toString())) {
            console.log(
              `⚠️ ${seviye}. sınıf için ${dersAdi} zaten var, atlıyorum`
            );
            return;
          }

          const row = document.createElement("div");
          row.className = "exam-entry modern-row-box";
          row.style =
            "display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; background: white; padding: 15px; border-radius: 12px; border-left: 5px solid #667eea; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative;";

          row.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="flex: 1;">
                 <select class="swal2-select s-seviye select-modern" style="margin: 0; width: 100%; height: 40px; font-weight: 600; border: 2px solid rgba(102, 126, 234, 0.2);">
                  <option value="9" ${
                    seviye == "9" ? "selected" : ""
                  }>9. Sınıf</option>
                  <option value="10" ${
                    seviye == "10" ? "selected" : ""
                  }>10. Sınıf</option>
                  <option value="11" ${
                    seviye == "11" ? "selected" : ""
                  }>11. Sınıf</option>
                  <option value="12" ${
                    seviye == "12" ? "selected" : ""
                  }>12. Sınıf</option>
                </select>
              </div>
              <div style="flex: 2;">
                <select class="swal2-select s-ders select-modern" style="margin: 0; width: 100%; height: 40px; font-weight: 600; border: 2px solid rgba(102, 126, 234, 0.2);"></select>
              </div>
              <button type="button" class="remove-btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 8px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
            
            <div style="padding: 5px 0 0 5px;">
              <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                🏫 Sınava Girecek Şubeler:
              </div>
              <div class="sube-secim-alani" style="display: flex; gap: 6px; flex-wrap: wrap; min-height: 30px;"></div>
            </div>
          `;

          container.appendChild(row);

          const sevSel = row.querySelector(".s-seviye");
          const derSel = row.querySelector(".s-ders");
          const subeAlani = row.querySelector(".sube-secim-alani");

          // ŞUBELERİ YÜKLE VE TIKLANABİLİR YAP
          const refreshSubeler = () => {
            const sLevel = sevSel.value.toString();
            console.log(`🔄 ${sLevel}. sınıf şubeleri yükleniyor...`);

            const subeler = tumSiniflar.filter(
              (s) => s.sinif_duzey && s.sinif_duzey.toString() === sLevel
            );

            console.log(`✅ ${subeler.length} şube bulundu`);

            if (subeler.length > 0) {
              subeAlani.innerHTML = subeler
                .map(
                  (s) => `
                  <div class="sube-card active" 
                       data-id="${s.id}" 
                       data-ad="${s.sinif_adi}" 
                       style="background: #667eea; color: white; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; user-select: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ${s.sinif_adi}
                  </div>
                `
                )
                .join("");

              // TIKLANABİLİR YAPMA
              subeAlani.querySelectorAll(".sube-card").forEach((card) => {
                card.onclick = () => {
                  if (card.classList.contains("active")) {
                    card.classList.remove("active");
                    card.style.background = "#e2e8f0";
                    card.style.color = "#94a3b8";
                    card.style.borderColor = "#cbd5e1";
                  } else {
                    card.classList.add("active");
                    card.style.background = "#667eea";
                    card.style.color = "white";
                    card.style.borderColor = "transparent";
                  }
                };
              });
            } else {
              subeAlani.innerHTML =
                '<span style="color:#ef4444; font-size:11px; padding: 5px 10px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">⚠ Bu seviyede şube bulunamadı!</span>';
            }
          };

          const updateDersListesi = () => {
            const currentSeviye = sevSel.value.toString();
            console.log(`🔍 ${currentSeviye}. sınıf dersleri filtreleniyor...`);

            // Ders veritabanı formatı kontrolü
            const filtered = tumDersler.filter((d) => {
              if (!d.sinif_seviyeleri) return false;

              // Virgüllü string: "9,10,11"
              if (d.sinif_seviyeleri.toString().includes(",")) {
                return d.sinif_seviyeleri
                  .toString()
                  .split(",")
                  .includes(currentSeviye);
              }

              // Tekil string: "9"
              return d.sinif_seviyeleri.toString() === currentSeviye;
            });

            console.log(`✅ ${filtered.length} ders bulundu`);

            if (filtered.length > 0) {
              derSel.innerHTML = filtered
                .map(
                  (d) =>
                    `<option value="${d.ders_adi}" ${
                      d.ders_adi === dersAdi ? "selected" : ""
                    }>${d.ders_adi}</option>`
                )
                .join("");
            } else {
              derSel.innerHTML =
                '<option value="">⚠️ Bu seviyede ders yok!</option>';
            }

            refreshSubeler();
          };

          // OTOMATİK DERS YAYMA (Sessizce Alta Ekleme)
          derSel.onchange = () => {
            const secilenDers = derSel.value;
            console.log(
              `📢 ${secilenDers} seçildi, diğer seviyeler aranıyor...`
            );

            const digerSeviyeKayitlari = tumDersler.filter((d) => {
              if (!d.sinif_seviyeleri || d.ders_adi !== secilenDers)
                return false;

              const seviyeler = d.sinif_seviyeleri.toString().split(",");
              return seviyeler.some((s) => s !== sevSel.value.toString());
            });

            console.log(
              `🔄 ${digerSeviyeKayitlari.length} farklı seviye kaydı bulundu`
            );

            digerSeviyeKayitlari.forEach((d) => {
              const seviyeler = d.sinif_seviyeleri.toString().split(",");
              seviyeler.forEach((s) => {
                if (s !== sevSel.value.toString()) {
                  console.log(
                    `➕ ${s}. sınıf için ${secilenDers} ekleniyor...`
                  );
                  createRow(s, secilenDers);
                }
              });
            });
          };

          sevSel.onchange = updateDersListesi;
          updateDersListesi();

          row.querySelector(".remove-btn").onclick = () => {
            if (container.children.length > 1) {
              row.remove();
              console.log("🗑️ Satır silindi");
            } else {
              if (typeof showNotification === "function") {
                showNotification("warning", "En az bir ders grubu olmalı!");
              }
            }
          };
        };

        // İlk satırı başlat
        createRow();

        // Manuel ekleme butonu
        addBtn.onclick = () => {
          console.log("➕ Manuel grup ekleniyor...");
          createRow();
        };
      },
      preConfirm: () => {
        const rows = Array.from(document.querySelectorAll(".exam-entry"));
        const finalExams = [];

        rows.forEach((row, index) => {
          const ders = row.querySelector(".s-ders").value;
          const seviye = row.querySelector(".s-seviye").value;
          const seciliSubeler = Array.from(
            row.querySelectorAll(".sube-card.active")
          ).map((card) => ({
            id: card.dataset.id,
            ad: card.dataset.ad,
          }));

          console.log(`📋 Satır ${index + 1}:`, {
            ders,
            seviye,
            subeSayisi: seciliSubeler.length,
          });

          if (seciliSubeler.length > 0 && ders) {
            finalExams.push({ ders, seviye, subeler: seciliSubeler });
          }
        });

        const data = {
          sinav_adi: document.getElementById("sinavAdi").value.trim(),
          sinav_tarihi: document.getElementById("sinavTarihi").value,
          sinav_saati: document.getElementById("sinavSaati").value,
          kategori: document.getElementById("sinavKategori").value,
          yerlesim: document.getElementById("sinavYerlesim").value,
          finalExams,
        };

        console.log("📊 Final Data:", data);

        if (
          !data.sinav_adi ||
          !data.sinav_tarihi ||
          !data.sinav_saati ||
          finalExams.length === 0
        ) {
          Swal.showValidationMessage(
            "❌ Eksik alanları doldurun ve en az 1 şube seçin!"
          );
          return false;
        }

        return data;
      },
    });

    if (!mainModalResult.isConfirmed) return;
    const formValues = mainModalResult.value;

    // 🛡️ ÇAKIŞMA KONTROLÜ (VALİDASYON YOK - SADECE ÇAKIŞMA)
    const cakisanlar = mevcutSinavlar.filter(
      (s) =>
        s.sinav_tarihi === formValues.sinav_tarihi &&
        s.sinav_saati === formValues.sinav_saati
    );

    if (cakisanlar.length > 0) {
      const confirmCakisma = await Swal.fire({
        title: "⚠️ Çakışma Uyarısı",
        html: `
          <div style="text-align: left; padding: 20px;">
            <p style="color: #666; margin-bottom: 15px;">
              Bu tarih ve saatte zaten <strong style="color: #f59e0b;">${
                cakisanlar.length
              }</strong> adet sınav var:
            </p>
            <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px;">
              ${cakisanlar
                .map(
                  (s) =>
                    `<div style="padding: 8px; margin-bottom: 5px; background: white; border-left: 3px solid #f59e0b; border-radius: 4px;">
                    <strong>${s.sinav_adi}</strong> - ${s.sinif_seviyesi}. Sınıf
                  </div>`
                )
                .join("")}
            </div>
            <p style="color: #666; margin-top: 15px; font-size: 14px;">
              Yine de devam etmek istiyor musunuz?
            </p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Evet, Devam Et",
        cancelButtonText: "Hayır, Vazgeç",
        confirmButtonColor: "#f59e0b",
      });

      if (!confirmCakisma.isConfirmed) return;
    }

    // 🎯 ADIM 3: KAYIT DÖNGÜSÜ
    Swal.fire({
      title: "🚀 Kaydediliyor...",
      html: `
        <div style="padding: 20px;">
          <div class="swal2-loading"></div>
          <p style="margin-top: 15px; color: #666;">
            Sınavlar oluşturuluyor...<br>
            <span id="progressText" style="font-size: 12px; color: #999;">0 / ${formValues.finalExams.reduce(
              (acc, g) => acc + g.subeler.length,
              0
            )}</span>
          </p>
        </div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    let basariliSayisi = 0;
    let hataliSayisi = 0;
    let toplamIslem = 0;

    for (const group of formValues.finalExams) {
      for (const sube of group.subeler) {
        try {
          await window.electronAPI.addOrtakSinav({
            sinav_kodu: `SNV-${Date.now()}-${sube.id}-${Math.floor(
              Math.random() * 1000
            )}`,
            sinav_turu: formValues.yerlesim,
            sinav_adi: `${group.ders} - ${formValues.sinav_adi}`,
            sinav_tarihi: formValues.sinav_tarihi,
            sinav_saati: formValues.sinav_saati,
            sinif_seviyesi: group.seviye,
            sinif_id: sube.id,
            sinav_donemi: "I. Dönem", // TODO: Dinamik
            sinav_no: "I. Yazılı", // TODO: Dinamik
            aciklama: `${sube.ad} şubesi için ${group.ders} sınavı`,
            mazeret_telafi: 0,
            kilitli: 0,
          });
          basariliSayisi++;
        } catch (error) {
          console.error("Sınav kaydetme hatası:", error);
          hataliSayisi++;
        }

        toplamIslem++;
        const progressEl = document.getElementById("progressText");
        if (progressEl) {
          progressEl.textContent = `${toplamIslem} / ${formValues.finalExams.reduce(
            (acc, g) => acc + g.subeler.length,
            0
          )}`;
        }
      }
    }

    await Swal.fire({
      icon: basariliSayisi > 0 ? "success" : "error",
      title: basariliSayisi > 0 ? "Başarılı!" : "Hata!",
      html: `
        <div style="padding: 20px; text-align: left;">
          <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
            <div style="text-align: center;">
              <div style="font-size: 48px; color: #10b981;">✅</div>
              <div style="font-size: 24px; font-weight: 700; color: #10b981;">${basariliSayisi}</div>
              <div style="color: #666; font-size: 14px;">Başarılı</div>
            </div>
            ${
              hataliSayisi > 0
                ? `
              <div style="text-align: center;">
                <div style="font-size: 48px; color: #ef4444;">❌</div>
                <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${hataliSayisi}</div>
                <div style="color: #666; font-size: 14px;">Hatalı</div>
              </div>
            `
                : ""
            }
          </div>
          <div style="padding: 15px; background: rgba(16, 185, 129, 0.05); border-left: 3px solid #10b981; border-radius: 8px; text-align: center;">
            <p style="color: #059669; margin: 0; font-size: 14px;">
              ${
                basariliSayisi > 0
                  ? `${basariliSayisi} sınav başarıyla oluşturuldu.`
                  : ""
              }
              ${hataliSayisi > 0 ? `${hataliSayisi} sınav oluşturulamadı.` : ""}
            </p>
          </div>
        </div>
      `,
      confirmButtonText: "Tamam",
      confirmButtonColor: "#667eea",
    });

    if (typeof loadDashboard === "function") loadDashboard();
  } catch (err) {
    console.error("Hata:", err);
    Swal.fire(
      "Hata",
      "İşlem sırasında bir sorun oluştu: " + err.message,
      "error"
    );
  }
}

/**
 * 🏛️ YENİ SALON MODAL
 */
async function openYeniSalonModal() {
  const { value: formValues } = await Swal.fire({
    title:
      '<span style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🏛️ Yeni Salon Ekle</span>',
    html: `
      <div class="swal-form-modern">
        <div class="form-row-modern">
          <div class="form-group-modern">
            <label class="label-modern">🏢 Salon Adı</label>
            <input id="salonAdi" class="swal2-input input-modern" placeholder="Örn: A Blok 101">
          </div>
        </div>

        <div class="form-row-modern">
          <div class="form-group-modern">
            <label class="label-modern">👥 Kapasite</label>
            <input type="number" id="salonKapasite" class="swal2-input input-modern" placeholder="30" min="1">
          </div>
          <div class="form-group-modern">
            <label class="label-modern">🪑 Sıra Sayısı</label>
            <input type="number" id="salonSira" class="swal2-input input-modern" placeholder="6" min="1">
          </div>
        </div>

        <div class="form-row-modern">
          <div class="form-group-modern">
            <label class="label-modern">📐 Sütun Sayısı</label>
            <input type="number" id="salonSutun" class="swal2-input input-modern" placeholder="5" min="1" max="10">
          </div>
          <div class="form-group-modern">
            <label class="label-modern">🎯 Salon Tipi</label>
            <select id="salonTip" class="swal2-select select-modern">
              <option value="Normal">📋 Normal Sınıf</option>
              <option value="Bilgisayar">💻 Bilgisayar Lab</option>
              <option value="Konferans">🎤 Konferans Salonu</option>
              <option value="Amfi">🏛️ Amfi</option>
            </select>
          </div>
        </div>

        <div class="form-row-modern">
          <div class="form-group-modern full-width">
            <label class="label-modern">📍 Konum</label>
            <input id="salonKonum" class="swal2-input input-modern" placeholder="Örn: A Blok 1. Kat">
          </div>
        </div>

        <div class="form-row-modern">
          <div class="form-group-modern full-width">
            <label class="label-modern">📝 Notlar</label>
            <textarea id="salonNot" class="swal2-textarea textarea-modern" placeholder="Salon hakkında notlar..."></textarea>
          </div>
        </div>
      </div>
    `,
    width: "650px",
    showCancelButton: true,
    confirmButtonText: '<i class="fas fa-plus"></i> Salonu Ekle',
    cancelButtonText: '<i class="fas fa-times"></i> İptal',
    confirmButtonColor: "#4facfe",
    cancelButtonColor: "#ef4444",
    background:
      "linear-gradient(135deg, rgba(30, 30, 46, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
    backdrop: "rgba(0, 0, 0, 0.8)",
    customClass: {
      popup: "swal-popup-modern",
      confirmButton: "swal-btn-modern swal-btn-confirm",
      cancelButton: "swal-btn-modern swal-btn-cancel",
    },
    preConfirm: () => {
      const salonAdi = document.getElementById("salonAdi").value;
      const salonKapasite = document.getElementById("salonKapasite").value;
      const salonSira = document.getElementById("salonSira").value;
      const salonSutun = document.getElementById("salonSutun").value;
      const salonTip = document.getElementById("salonTip").value;
      const salonKonum = document.getElementById("salonKonum").value;
      const salonNot = document.getElementById("salonNot").value;

      if (!salonAdi || !salonKapasite) {
        Swal.showValidationMessage("Salon adı ve kapasite zorunludur!");
        return false;
      }

      return {
        salon_adi: salonAdi,
        kapasite: parseInt(salonKapasite),
        satir_sayisi: parseInt(salonSira) || 6,
        sutun_sayisi: parseInt(salonSutun) || 5,
        salon_tipi: salonTip,
        konum: salonKonum,
        notlar: salonNot,
      };
    },
  });

  if (formValues) {
    try {
      const result = await window.electronAPI.addSinavSalon(formValues);

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "✅ Başarılı!",
          text: "Salon başarıyla eklendi",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
          background:
            "linear-gradient(135deg, rgba(30, 30, 46, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
        });

        if (typeof loadSalonlar === "function") loadSalonlar();
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "❌ Hata!",
        text: "Salon eklenirken hata oluştu: " + error.message,
        confirmButtonColor: "#ef4444",
      });
    }
  }
}

/**
 * 📋 YENİ PLAN MODAL
 */
async function openYeniPlanModal() {
  const { value: formValues } = await Swal.fire({
    title:
      '<span style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📋 Yeni Oturma Planı</span>',
    html: `
      <div class="swal-form-modern">
        <div class="form-row-modern">
          <div class="form-group-modern full-width">
            <label class="label-modern">📝 Plan Adı</label>
            <input id="planAdi" class="swal2-input input-modern" placeholder="Örn: Plan-1 (3 Sütun)">
          </div>
        </div>

        <div class="form-row-modern">
          <div class="form-group-modern">
            <label class="label-modern">🪑 Sıra Sayısı</label>
            <input type="number" id="planSira" class="swal2-input input-modern" value="8" min="1" max="20">
          </div>
          <div class="form-group-modern">
            <label class="label-modern">📐 Sütun Sayısı</label>
            <input type="number" id="planSutun" class="swal2-input input-modern" value="5" min="1" max="10">
          </div>
        </div>

        <div class="form-row-modern">
          <div class="form-group-modern full-width">
            <label class="label-modern">🔀 Düzen Tipi</label>
            <select id="planDuzen" class="swal2-select select-modern">
              <option value="Z">⚡ Z Düzeni (Zigzag)</option>
              <option value="S">🌊 S Düzeni (Serpantine)</option>
              <option value="STRAIGHT">➡️ Düz (Soldan Sağa)</option>
            </select>
          </div>
        </div>
      </div>
    `,
    width: "600px",
    showCancelButton: true,
    confirmButtonText: '<i class="fas fa-check"></i> Planı Oluştur',
    cancelButtonText: '<i class="fas fa-times"></i> İptal',
    confirmButtonColor: "#f093fb",
    cancelButtonColor: "#ef4444",
    background:
      "linear-gradient(135deg, rgba(30, 30, 46, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
    backdrop: "rgba(0, 0, 0, 0.8)",
    customClass: {
      popup: "swal-popup-modern",
      confirmButton: "swal-btn-modern swal-btn-confirm",
      cancelButton: "swal-btn-modern swal-btn-cancel",
    },
    preConfirm: () => {
      const planAdi = document.getElementById("planAdi").value;
      const planSira = document.getElementById("planSira").value;
      const planSutun = document.getElementById("planSutun").value;
      const planDuzen = document.getElementById("planDuzen").value;

      if (!planAdi) {
        Swal.showValidationMessage("Plan adı zorunludur!");
        return false;
      }

      return {
        planAdi,
        siraSayisi: parseInt(planSira),
        sutunSayisi: parseInt(planSutun),
        duzenTipi: planDuzen,
      };
    },
  });

  if (formValues) {
    try {
      const result = await window.electronAPI.addSinavPlan(formValues);

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "✅ Başarılı!",
          text: "Oturma planı oluşturuldu",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        if (typeof loadPlanlar === "function") loadPlanlar();
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "❌ Hata!",
        text: error.message,
        confirmButtonColor: "#ef4444",
      });
    }
  }
}

/**
 * 📝 YENİ AÇIKLAMA MODAL
 */
async function openYeniAciklamaModal() {
  const { value: formValues } = await Swal.fire({
    title:
      '<span style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📝 Yeni Açıklama Ekle</span>',
    html: `
      <div class="swal-form-modern">
        <div class="form-row-modern">
          <div class="form-group-modern">
            <label class="label-modern">🔢 Sıra No</label>
            <input type="number" id="aciklamaSira" class="swal2-input input-modern" value="1" min="1">
          </div>
        </div>

        <div class="form-row-modern">
          <div class="form-group-modern full-width">
            <label class="label-modern">📝 Açıklama Metni</label>
            <textarea id="aciklamaMetin" class="swal2-textarea textarea-modern" placeholder="Sınav kuralı veya açıklama yazın..." rows="5"></textarea>
          </div>
        </div>
      </div>
    `,
    width: "600px",
    showCancelButton: true,
    confirmButtonText: '<i class="fas fa-plus"></i> Ekle',
    cancelButtonText: '<i class="fas fa-times"></i> İptal',
    confirmButtonColor: "#43e97b",
    cancelButtonColor: "#ef4444",
    background:
      "linear-gradient(135deg, rgba(30, 30, 46, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
    backdrop: "rgba(0, 0, 0, 0.8)",
    customClass: {
      popup: "swal-popup-modern",
      confirmButton: "swal-btn-modern swal-btn-confirm",
      cancelButton: "swal-btn-modern swal-btn-cancel",
    },
    preConfirm: () => {
      const aciklamaMetin = document.getElementById("aciklamaMetin").value;
      const aciklamaSira = document.getElementById("aciklamaSira").value;

      if (!aciklamaMetin) {
        Swal.showValidationMessage("Açıklama metni zorunludur!");
        return false;
      }

      return {
        aciklama: aciklamaMetin,
        sira: parseInt(aciklamaSira),
      };
    },
  });

  if (formValues) {
    try {
      const result = await window.electronAPI.addSinavAciklama(
        formValues.aciklama,
        formValues.sira
      );

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "✅ Başarılı!",
          text: "Açıklama eklendi",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        if (typeof loadAciklamalar === "function") loadAciklamalar();
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "❌ Hata!",
        text: error.message,
        confirmButtonColor: "#ef4444",
      });
    }
  }
}

// ==========================================
// 🎨 KEYFRAME ANIMATIONS
// ==========================================

const style = document.createElement("style");
style.textContent = `
  @keyframes swalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(-50px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .swal-popup-modern {
    border-radius: 20px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
  }

  .swal-title-modern {
    font-size: 1.75rem !important;
    font-weight: 700 !important;
    margin-bottom: 1.5rem !important;
  }

  .swal-form-modern {
    padding: 1rem;
  }

  .form-row-modern {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group-modern {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group-modern.full-width {
    flex: 1 1 100%;
  }

  .label-modern {
    font-size: 0.95rem;
    font-weight: 600;
    color: #e5e7eb;
    text-align: left;
  }

  .input-modern,
  .select-modern,
  .textarea-modern {
    width: 100% !important;
    padding: 0.75rem !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 10px !important;
    background: rgba(255, 255, 255, 0.05) !important;
    color: #ffffff !important;
    font-size: 0.95rem !important;
    transition: all 0.2s ease !important;
  }

  .input-modern:focus,
  .select-modern:focus,
  .textarea-modern:focus {
    outline: none !important;
    border-color: #667eea !important;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
  }

  .select-modern option {
    background: #1a1a2e !important;
    color: #ffffff !important;
  }

  .swal-btn-modern {
    padding: 0.75rem 2rem !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    font-size: 1rem !important;
    transition: all 0.2s ease !important;
  }

  .swal-btn-confirm:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2) !important;
  }

  .swal-btn-cancel:hover {
    transform: translateY(-2px) !important;
  }
`;
document.head.appendChild(style);
