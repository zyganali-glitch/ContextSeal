# Bana kalan iki iş

Kod, test, Docker, DataHub kanıtı, public repository, GitHub Pages, açık kaynak katkısı, İngilizce başvuru metni, görseller, caption'lar, teknoloji etiketleri, geri bildirim metni ve kontrol belgeleri hazırdır. Teknik kurulum veya yeniden kanıt üretme işi yapman gerekmiyor.

Sana yalnızca fiziksel olarak senin hesabın/kimliğin ve sesinle yapılabilecek iki iş kalıyor:

1. demo videoyu çekip public yüklemek;
2. hazır paketi Devpost formuna aktarıp göndermek.

DataHub Skills [PR #35](https://github.com/datahub-project/datahub-skills/pull/35) `OPEN / READY_FOR_REVIEW / NOT_MERGED` durumunda ve maintainer incelemesini bekliyor. Bu senin tamamlaman gereken bir iş değil; review veya merge gerçekleşmeden kabul edilmiş gibi anlatma.

## 1. Demo videoyu çek ve yükle

1. [Türkçe çekim rehberini](DEMO_VIDEO_CEKIM_REHBERI.md) aç.
2. İngilizce anlatımı [kesin demo metninden](../DEMO_SCRIPT.md) oku.
3. Ekran sırasını [shot listeden](../VIDEO_SHOT_LIST.md) uygula.
4. Videoyu `2:50–2:58` hedefiyle, kesinlikle `3:00` altında tut.
5. `1920×1080`, 30 fps kullan; tarayıcı profili, kişisel sekme, bildirim, `.env`, terminal ve token gösterme.
6. Fixture bölümünde sınır rozetini görünür tut. Beş fixture downstream varlığı, en derin dört hop ve iki sentetik query örneği de.
7. Canlı kanıt bölümünde yalnız kaydedilmiş disposable-local DataHub kanıtını göster: 10 MCP okuması, 6 downstream varlık/6 exact path, query sonucu 0, `70 / BLOCKED`, 3 mutation receipt `PASS` ve ayrı durable read-back `PASS`.
8. En yeni kanıt dokümanını DataHub'da ararken `csp_315210a4fc40f86cd302` değerini kullan; related-document sırasına güvenme.
9. Generated SQL'in çalıştırılmadığını, production/customer veri veya sonuç iddiası olmadığını söyle.
10. İngilizce altyazıyı elle düzelt; telifli müzik veya üçüncü taraf görüntü ekleme.
11. YouTube, Vimeo veya Youku'ya **Public** yükle ve signed-out/gizli pencerede baştan sona oynat.

Video bağlantısını bir yere kaydet. Devpost formunda `TODO_PUBLIC_VIDEO_URL` yerine bu public izleme URL'sini kullan.

## 2. Devpost formunu doldur ve gönder

[Adım adım Devpost rehberini](DEVPOST_BASVURU_REHBERI.md) aç. Hazır değerler:

- **Project name:** `ContextSeal`
- **Tagline:** `Every data change ships with proof, not confidence.`
- **Primary category:** `Agents That Do Real Work`
- **Secondary fit (varsa):** `Metadata-Aware Code Generation & Development`
- **Built With:** `DataHub`, `DataHub MCP Server`, `Node.js`, `JavaScript`, `Python`, `Docker`, `GitHub Actions`, `dbt`
- **Repository:** https://github.com/zyganali-glitch/ContextSeal
- **Try it / walkthrough:** https://zyganali-glitch.github.io/ContextSeal/
- **Sample outputs:** https://github.com/zyganali-glitch/ContextSeal/tree/main/examples/outputs
- **Open-source contribution:** https://github.com/datahub-project/datahub-skills/pull/35 — `OPEN / READY_FOR_REVIEW / NOT_MERGED`

Formda yapılacaklar:

1. Devpost hesabınla yarışmaya katıl ve proje formunu aç.
2. İsim, ekip, ülke/ikamet, uygunluk ve şart kabulü gibi yalnız senin beyan edebileceğin alanları doldur.
3. İngilizce proje içeriğini [hazır final metinden](../DEVPOST_SUBMISSION.md) aktar.
4. Public video URL'sini ekle; form preview'ında embed'in çalıştığını doğrula.
5. [`docs/media`](../media/README.md) içindeki hazır thumbnail ve üç galeri PNG'sini, aynı belgedeki hazır İngilizce caption'larla yükle.
6. Opsiyonel Most Valuable Feedback alanı çıkarsa [hazır gerçek geri bildirim metnini](../DEVPOST_FEEDBACK.md) yapıştır.
7. Preview'da repository, walkthrough, outputs, video ve PR bağlantılarına tıkla.
8. `TODO_PUBLIC_VIDEO_URL` ifadesinin forma taşınmadığını kontrol et.
9. Video süresi, fixture/live sayıları ve kanıt durumlarının README ile aynı olduğunu son kez kontrol et.
10. **Submit** düğmesine bas ve oluşan public Devpost proje URL'sini kaydet.

## Gönderimden sonra

- Repository, walkthrough ve videoyu değerlendirme dönemi bitene kadar public/kısıtsız tut. Resmî dönem 31 Ağustos 2026 17:00 EDT'de (İstanbul'da 1 Eylül 2026 00:00) biter.
- Devpost veya video metnini değiştirirsen iddia sınırlarını koru.
- Public video ve Devpost proje URL'lerini bu sohbete gönder; repository'deki video placeholder'ını gerçek URL ile güncelleyip son signed-out denetimini ben yaparım. Bu, yeni bir hazırlık işi değil, gönderim sonrası kapanış doğrulamasıdır.

Resmî son gönderim: **10 Ağustos 2026 17:00 EDT** — İstanbul'da **11 Ağustos 2026 00:00**. Kaynak: [resmî yarışma kuralları](https://datahub.devpost.com/rules).
