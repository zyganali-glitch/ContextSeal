# ContextSeal — Türkçe Açıklama

> **Her veri değişikliği güvenle değil, kanıtla yayınlansın.**

ContextSeal; riskli bir kolon değişikliğini DataHub bağlamıyla inceleyen, etkilenecek varlıkları gösteren, güvenli taşıma dosyaları üreten, insan onayı isteyen ve son kararı tekrar DataHub’a kaydeden bir veri değişikliği güvenlik sistemidir.

**[Kurulum gerektirmeyen güvenli gösterimi aç](https://zyganali-glitch.github.io/ContextSeal/)** · [English README](README.md)

## Ne problemi çözüyor?

Bir veri tablosundaki kolon yeniden adlandırıldığında yalnızca o tablo etkilenmez. Uzak bir gösterge paneli, başka ekibin veri hattı veya çalışan bir makine öğrenmesi modeli kırılabilir. Normal kod kontrolleri bu bağlantıların tamamını göremez.

ContextSeal DataHub’dan şu bilgileri toplar:

- tablonun şeması,
- aşağı yöndeki bağlantıları,
- sorumlu ekipleri,
- gizlilik ve hassas veri işaretlerini,
- kalite kontrollerini,
- açık olay kayıtlarını,
- kolonu kullanan gerçek sorguları.

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
2. Risk puanı ve etkilenen varlıkları incele.
3. **Approve safe plan** düğmesine bas.
4. Oluşan pasaport numarasını gör.
5. **Prepare DataHub write-back** düğmesine bas.

Bu güvenli deneme modunda gerçek DataHub değiştirilmez. Ekranda bunun açıkça yazması bilinçli bir güvenlik özelliğidir.

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
