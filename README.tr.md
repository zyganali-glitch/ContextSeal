# ContextSeal — Türkçe Açıklama

> **Her veri değişikliği güvenle değil, kanıtla yayınlansın.**

ContextSeal; riskli bir kolon değişikliğini DataHub bağlamıyla inceleyen, etkilenecek varlıkları gösteren, güvenli taşıma dosyaları üreten, insan onayı isteyen ve son kararı tekrar DataHub’a kaydeden bir veri değişikliği güvenlik sistemidir.

**[Kurulum gerektirmeyen güvenli gösterimi aç](https://zyganali-glitch.github.io/ContextSeal/)** · [English README](README.md)

## Neden güçlü görünüyor?

- Küçük görünen riskli bir yeniden adlandırma merge olmadan önce durduruluyor.
- DataHub bağlamı aşağı yöndeki etkiyi ve isimlendirilmiş risk bulgularını açıkça gösteriyor.
- İsteğe bağlı AI paneli görünür, sınırlı ve runtime yoksa bunu dürüstçe söylüyor.
- ContextSeal yıkıcı değişikliği değil, güvenli geçiş paketi ve reviewer-ready PR handoff üretir.
- İnsan onayı sonucunda oluşan pasaport, sonraki insan veya ajan tarafından miras alınabilir.

## İlk dakikada ne görülüyor?

1. Bloke edilen istek ve aşağı yöndeki etki alanı.
2. Deterministik `80 / BLOCKED` kararı ve isimli bulgular.
3. Açıklama amaçlı AI sınırı.
4. Üretilen güvenli geçiş paketi ve inceleme handoff'u.
5. Pasaport ve miras alınan karar döngüsü.

## Ne problemi çözüyor?

Bir veri tablosundaki kolon yeniden adlandırıldığında yalnızca o tablo etkilenmez. Uzak bir gösterge paneli, başka ekibin veri hattı veya çalışan bir makine öğrenmesi modeli kırılabilir. Normal kod kontrolleri bu bağlantıların tamamını göremez.

ContextSeal DataHub’dan şu bilgileri toplar:

- tablonun şeması,
- aşağı yöndeki bağlantıları,
- sorumlu ekipleri,
- gizlilik ve hassas veri işaretlerini,
- kalite kontrollerini,
- açık olay kayıtlarını,
- kolonla ilgili gözlemlenen sorgu kanıtlarını.

Sonra değişikliği doğrudan yapmak yerine güvenli bir geçiş planı üretir. Örneğin eski kolonu hemen silmek yerine yeni kolonu ekler, veriyi taşır, kullanan sistemlerin geçmesini bekler ve eski kolonu daha sonraki ayrı bir değişiklikte kaldırır.

## Güvenli denemeyi çalıştırma

PowerShell’de proje klasörüne gir:

```powershell
cd "C:\Users\ASUS 6410\.gemini\antigravity\scratch\ContextSeal"
npm install
npm test
npm start
```

Tarayıcıda şu adresi aç:

```text
http://127.0.0.1:4173
```

Ardından sırasıyla:

1. **Analyze the demo change** düğmesine bas.
2. Risk puanı, etkilenen varlıkları ve güvenli gösterimdeki etki yollarını incele.
3. **Approve safe plan** düğmesine bas.
4. Oluşan pasaport numarasını gör.
5. **Prepare DataHub write-back** düğmesine bas.

Bu güvenli deneme modunda gerçek DataHub değiştirilmez. Varsayılan ekran DataHub biçimine uyarlanmış sentetik bağlam kullanır; canlı MCP kanıtı ayrı rehberde gösterilir. Ekranda bunun açıkça yazması bilinçli bir güvenlik özelliğidir.

## Istege bagli yerel AI yardimcisi

Repo artik istege bagli bir yerel Ollama bagdastiricisi, gorunur bir Local AI Copilot paneli ve incelenebilir AI girdi/cikti artefaktlari iceriyor. Deterministik verdict once hesaplanir. AI kapaliysa veya Ollama yoksa, ContextSeal uydurma metin uretmek yerine `NOT_ENABLED` ya da `UNAVAILABLE` durumu kaydeder.

```powershell
npm run ai:probe
```

Tam sozlesme icin [AI Runtime Decision](docs/AI_RUNTIME_DECISION.md) dosyasina bak.

Kayitli AI artefaktlari:

- `examples/outputs/generated/ai/contextseal-ai-input.json`
- `examples/outputs/generated/ai/contextseal-ai-output.json`
- `examples/outputs/generated/ai/contextseal-ai-output.md`

## Senin için hazırlanmış ayrıntılı rehberler

- [Önce yapman gerekenler](docs/tr/BENIM_YAPMAM_GEREKENLER.md)
- [DataHub canlı bağlantı rehberi](docs/tr/CANLI_DATAHUB_KURULUMU.md)
- [Devpost başvuru rehberi](docs/tr/DEVPOST_BASVURU_REHBERI.md)
- [Demo videosu çekim rehberi](docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md)
- [Sorun çözme rehberi](docs/tr/SORUN_COZME_REHBERI.md)

## Dürüstlük sınırı

- `PASS`: Kontrol gerçekten çalıştı ve geçti.
- `WARN`: İncelenmesi gereken durum var.
- `FAIL`: Kontrol çalıştı ve başarısız oldu.
- `NOT_RUN`: Kontrol çalıştırılmadı.
- `STALE`: Kullanılan bağlam fazla eski.
- `FIXTURE`: Sonuç, yarışma için hazırlanmış yapay örnekten geldi.

ContextSeal çalışmayan bir işlemi çalışmış gibi göstermez.
