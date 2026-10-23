"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// Seviye eşikleri (yüzde). İstersen buradan değiştir.
const DUSUK_ESIK = 15; // bunun altı kırmızı
const ORTA_ESIK = 30; // bunun altı turuncu
const YENILEME_SANIYE = 60; // sayfa kendini kaç saniyede bir yeniler

const SIRA_TUR = ["toner", "murekkep", "tambur", "bakim", "fuser", "transfer", "atik_toner", "diger"];
const SIRA_RENK = ["siyah", "camgobegi", "magenta", "sari"];

const TUR_AD = {
  toner: "Toner",
  murekkep: "Mürekkep",
  tambur: "Tambur",
  bakim: "Bakım kiti",
  fuser: "Fuser",
  transfer: "Transfer",
  atik_toner: "Atık toner",
  diger: "Diğer",
};

const RENK_AD = {
  siyah: "Siyah",
  sari: "Sarı",
  magenta: "Magenta",
  camgobegi: "Camgöbeği",
};

function siraBul(liste, deger) {
  const i = liste.indexOf(deger);
  return i === -1 ? 99 : i;
}

function sirala(a, b) {
  const t = siraBul(SIRA_TUR, a.kind) - siraBul(SIRA_TUR, b.kind);
  if (t !== 0) return t;
  const r = siraBul(SIRA_RENK, a.color) - siraBul(SIRA_RENK, b.color);
  if (r !== 0) return r;
  return String(a.name).localeCompare(String(b.name));
}

// Her sarf malzemeye ekranda görünecek Türkçe bir ad verir.
// Aynı ad birden fazla çıkarsa (örneğin 4 tambur) özgün adı kullanır.
function etiketle(sarflar) {
  const ham = sarflar.map((s) => {
    const tur = TUR_AD[s.kind] || "Sarf malzeme";
    const renk = s.color ? RENK_AD[s.color] : null;
    return renk ? renk + " " + tur.toLocaleLowerCase("tr-TR") : tur;
  });
  return sarflar.map((s, i) => {
    const tekrar = ham.filter((h) => h === ham[i]).length > 1;
    return { ...s, etiket: tekrar ? s.name : ham[i] };
  });
}

function seviyeRengi(yuzde) {
  if (yuzde === null || yuzde === undefined) return "#B4B2A9";
  if (yuzde < DUSUK_ESIK) return "#E24B4A";
  if (yuzde < ORTA_ESIK) return "#BA7517";
  return "#639922";
}

function zamanOnce(iso) {
  if (!iso) return "bilinmiyor";
  const dk = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return dk + " dk önce";
  const saat = Math.round(dk / 60);
  if (saat < 24) return saat + " saat önce";
  return Math.round(saat / 24) + " gün önce";
}

function sayiYaz(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("tr-TR");
}

function GirisFormu() {
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [mesgul, setMesgul] = useState(false);

  async function girisYap(e) {
    e.preventDefault();
    setHata("");
    setMesgul(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: eposta,
      password: sifre,
    });
    setMesgul(false);
    if (error) setHata("E-posta veya şifre hatalı.");
  }

  return (
    <form className="giris" onSubmit={girisYap}>
      <h1>Yazıcı Takip</h1>
      <p>Devam etmek için giriş yap.</p>
      <label htmlFor="eposta">E-posta</label>
      <input
        id="eposta"
        type="email"
        value={eposta}
        onChange={(e) => setEposta(e.target.value)}
        required
      />
      <label htmlFor="sifre">Şifre</label>
      <input
        id="sifre"
        type="password"
        value={sifre}
        onChange={(e) => setSifre(e.target.value)}
        required
      />
      {hata && <div className="hata">{hata}</div>}
      <button className="dugme" type="submit" disabled={mesgul}>
        {mesgul ? "Giriş yapılıyor..." : "Giriş yap"}
      </button>
    </form>
  );
}

function YaziciKarti({ y }) {
  const sarflar = etiketle([...(y.supplies || [])].sort(sirala));
  const dusukler = sarflar.filter(
    (s) => s.percent !== null && s.percent < DUSUK_ESIK
  );

  return (
    <div className="kart">
      <div className="kart-ust">
        <div>
          <p className="ad">
            {y.model || "Bilinmeyen model"}
            <span className={y.online ? "rozet yesil" : "rozet kirmizi"}>
              {y.online ? "Çevrimiçi" : "Çevrimdışı"}
            </span>
          </p>
          <p className="alt">
            {y.ip} · Seri no: {y.serial_no}
          </p>
          <p className="alt">Son tarama: {zamanOnce(y.last_seen)}</p>
        </div>
        <div className="toplam">
          <b>{sayiYaz(y.total_pages)}</b>
          toplam baskı
        </div>
      </div>

      <div className="barlar">
        {sarflar.map((s) => (
          <div className="bar" key={s.id}>
            <div className="bar-ust">
              <span>{s.etiket}</span>
              <span>{s.percent === null ? "bilinmiyor" : "%" + s.percent}</span>
            </div>
            <div className="iz">
              {s.percent !== null && (
                <div
                  className="dolu"
                  style={{
                    width: Math.min(100, Math.max(0, s.percent)) + "%",
                    background: seviyeRengi(s.percent),
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {dusukler.length > 0 && (
        <div className="uyari">
          Dikkat, azalan sarf malzeme:{" "}
          {dusukler.map((s) => s.etiket + " %" + s.percent).join(", ")}
        </div>
      )}
    </div>
  );
}

export default function Sayfa() {
  const [oturum, setOturum] = useState(undefined);
  const [yazicilar, setYazicilar] = useState([]);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOturum(data.session));
    const { data: dinleyici } = supabase.auth.onAuthStateChange(
      (_olay, yeniOturum) => setOturum(yeniOturum)
    );
    return () => dinleyici.subscription.unsubscribe();
  }, []);

  async function yukle() {
    setYukleniyor(true);
    setHata("");
    const { data, error } = await supabase
      .from("printers")
      .select("*, supplies(*)")
      .order("model");
    setYukleniyor(false);
    if (error) {
      setHata("Veri okunamadı: " + error.message);
      return;
    }
    setYazicilar(data || []);
  }

  useEffect(() => {
    if (!oturum) return;
    yukle();
    const zamanlayici = setInterval(yukle, YENILEME_SANIYE * 1000);
    return () => clearInterval(zamanlayici);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturum]);

  async function cikisYap() {
    await supabase.auth.signOut();
    setYazicilar([]);
  }

  const toplamYazici = yazicilar.length;
  const cevrimici = yazicilar.filter((y) => y.online).length;
  const dusukSayisi = yazicilar.reduce(
    (toplam, y) =>
      toplam +
      (y.supplies || []).filter(
        (s) => s.percent !== null && s.percent < DUSUK_ESIK
      ).length,
    0
  );

  let govde;
  if (oturum === undefined) {
    govde = <div className="sayfa">Yükleniyor...</div>;
  } else if (!oturum) {
    govde = <GirisFormu />;
  } else {
    govde = (
      <div className="sayfa">
        <div className="ust">
          <h1>Yazıcılar</h1>
          <div className="ust-sag">
            <button className="dugme acik" onClick={yukle} disabled={yukleniyor}>
              {yukleniyor ? "Yenileniyor..." : "Yenile"}
            </button>
            <button className="dugme" onClick={cikisYap}>
              Çıkış
            </button>
          </div>
        </div>

        <div className="ozet">
          <div>
            <b>{toplamYazici}</b>
            <small>Yazıcı</small>
          </div>
          <div>
            <b>{dusukSayisi}</b>
            <small>Düşük sarf malzeme</small>
          </div>
          <div>
            <b>
              {cevrimici}/{toplamYazici}
            </b>
            <small>Çevrimiçi</small>
          </div>
        </div>

        {hata && <div className="hata">{hata}</div>}

        {yazicilar.length === 0 && !hata && !yukleniyor && (
          <div className="kart">
            Henüz yazıcı verisi yok. Ajanı çalıştır (node ajan.js), sonra
            Yenile'ye bas.
          </div>
        )}

        {yazicilar.map((y) => (
          <YaziciKarti key={y.id} y={y} />
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      {govde}
    </>
  );
}

const css = `
body{margin:0;background:#FFEDD5;color:#12172B;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.sayfa{max-width:900px;margin:0 auto;padding:20px 16px 40px}
.ust{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
.ust h1{margin:0;font-size:22px;font-weight:600}
.ust-sag{display:flex;gap:8px;align-items:center}
.dugme{border:none;background:#12172B;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer}
.dugme.acik{background:#fff;color:#12172B}
.dugme:disabled{opacity:.6;cursor:default}
.ozet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
.ozet div{background:#fff;border-radius:10px;padding:12px 14px}
.ozet b{display:block;font-size:24px;font-weight:600}
.ozet small{font-size:12px;color:#5b4a2e}
.kart{background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:14px}
.kart-ust{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
.kart-ust p{margin:0}
.ad{font-size:16px;font-weight:600}
.alt{font-size:12px;color:#5f5e5a;line-height:1.6}
.toplam{text-align:right;font-size:12px;color:#5f5e5a;flex-shrink:0}
.toplam b{display:block;font-size:20px;font-weight:600;color:#12172B}
.rozet{font-size:11px;font-weight:500;padding:2px 8px;border-radius:6px;margin-left:8px;vertical-align:middle}
.rozet.yesil{background:#EAF3DE;color:#27500A}
.rozet.kirmizi{background:#FCEBEB;color:#791F1F}
.barlar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 24px}
.bar{font-size:12px;color:#444441}
.bar-ust{display:flex;justify-content:space-between;gap:8px;margin-bottom:3px}
.iz{height:7px;border-radius:4px;background:#E8E6DC}
.dolu{height:7px;border-radius:4px}
.uyari{margin-top:12px;font-size:12px;background:#FCEBEB;color:#791F1F;padding:6px 10px;border-radius:8px}
.hata{background:#FCEBEB;color:#791F1F;padding:10px 14px;border-radius:10px;margin-bottom:14px;font-size:13px}
.giris{max-width:360px;margin:80px auto 0;background:#fff;border-radius:14px;padding:24px}
.giris h1{margin:0 0 4px;font-size:20px}
.giris p{margin:0 0 16px;font-size:13px;color:#5f5e5a}
.giris label{display:block;font-size:12px;margin-bottom:4px;color:#444441}
.giris input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #D3D1C7;border-radius:8px;font-size:14px;margin-bottom:12px;background:#fff;color:#12172B}
.giris .dugme{width:100%;padding:10px}
@media (max-width:600px){.barlar{grid-template-columns:1fr}.ozet b{font-size:20px}}
`;