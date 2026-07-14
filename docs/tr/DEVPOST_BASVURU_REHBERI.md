# Devpost başvuru rehberi — adım adım

Bu belge Devpost formunu güvenli biçimde doldurmak içindir. Başvurunun dili İngilizce olmalıdır. Forma yapıştırılacak nihai içerik [DEVPOST_SUBMISSION.md](../DEVPOST_SUBMISSION.md) dosyasındadır; bu Türkçe açıklamayı forma kopyalama.

## Resmî tarih ve temel şartlar

Resmî son gönderim: **10 Ağustos 2026, 17:00 EDT**. İstanbul karşılığı: **11 Ağustos 2026, 00:00**. Kaynak: [Build with DataHub resmî kuralları](https://datahub.devpost.com/rules).

Göndermeden hemen önce kuralları tekrar aç; Devpost arayüzü veya alan adları değişmiş olabilir. Başvuru paketinde en az şu public yüzeyler hazır olmalıdır:

- Apache-2.0 lisanslı public GitHub repository;
- çalışan proje veya kolay incelenebilir demo yolu;
- üç dakikadan kısa public demo videosu;
- DataHub'ın projedeki temel rolünü açıklayan İngilizce proje metni.

Repository, hosted walkthrough ve video, resmî değerlendirme dönemi **31 Ağustos 2026 17:00 EDT** tarihinde bitene kadar public ve kısıtsız kalmalıdır.

Güvenli iç takvim:

- 8 Ağustos: kod/kanıt dondurma;
- 9 Ağustos: video, metin ve public bağlantı kontrolü;
- 10 Ağustos: yalnız yedek gün.

## 1. Formdan önce hazırlanacak bağlantılar

Gizli pencerede açıp doğrula:

- Repository: [https://github.com/zyganali-glitch/ContextSeal](https://github.com/zyganali-glitch/ContextSeal)
- Kurulumsuz fixture gösterimi: [https://zyganali-glitch.github.io/ContextSeal/](https://zyganali-glitch.github.io/ContextSeal/)
- Public demo video URL'si
- Sample outputs: [https://github.com/zyganali-glitch/ContextSeal/tree/main/examples/outputs](https://github.com/zyganali-glitch/ContextSeal/tree/main/examples/outputs)

Video URL'si YouTube Studio düzenleme bağlantısı değil, signed-out kullanıcıların açabildiği public izleme bağlantısı olmalıdır.

## 2. Repository son kontrolü

Proje klasöründe açılan PowerShell'de:

```powershell
npm run validate
git status --short
```

Beklenen:

- validation'ın tüm adımları `PASS`;
- komut sonrasında yeni Git diff oluşmaması;
- gönderilecek branch üzerinde kişisel dosya, `.env`, token veya müşteri verisi bulunmaması;
- GitHub Actions'ın tam gönderilecek commit üzerinde yeşil olması.

[Pre-submission checklist](../PRE_SUBMISSION_CHECKLIST.md) tamamlanmadan forma son halini verme.

## 3. Devpost projesini aç

1. [Yarışma sayfasını](https://datahub.devpost.com/) aç.
2. Devpost hesabına giriş yap.
3. **Join hackathon** tamamlanmadıysa önce katıl.
4. **Create a project**, **Start submission** veya benzer düğmeye bas.
5. Taslak kaydetme seçeneğini kullan; bütün kontroller bitmeden **Submit** yapma.

## 4. Temel alanları doldur

Kullanılacak sabit bilgiler:

- **Project name:** `ContextSeal`
- **Tagline:** `Every data change ships with proof, not confidence.`
- **Primary category:** `Agents That Do Real Work`
- Form izin veriyorsa **secondary fit:** `Metadata-Aware Code Generation & Development`

Kategori isimleri formda farklı görünürse [resmî overview](https://datahub.devpost.com/) sayfasındaki güncel ifadeyi esas al.

## 5. İngilizce proje metnini aktar

[DEVPOST_SUBMISSION.md](../DEVPOST_SUBMISSION.md) dosyasını aç. Bölümleri Devpost'taki karşılık gelen alanlara kopyala:

- Inspiration
- What it does
- Why this is an agent
- What real work it performs
- How we built it
- How it uses DataHub
- What makes it original
- Challenges we ran into
- Accomplishments
- What we learned
- What's next
- Honest limitations
- Data used

Metni kısaltmak gerekirse önce tekrarları azalt; kanıt sınırlarını veya limitations bölümünü silme.

Metindeki temel gerçekler değişmemelidir:

- fixture: beş aşağı yönlü varlık, en derin dört adım, iki sentetik query örneği;
- canlı yerel kanıt: 10 MCP okuması, tek sayfada tam üç alanlı hedef şeması, altı exact path ve altı aşağı yönlü native varlık — iki Dataset, iki DataJob, iki Dashboard;
- canlı query sonucu sıfır;
- doğrudan istek `70 / BLOCKED`, onaylanan güvenli kapsam ise üç `PASS` mutation receipt'i ve ayrı durable read-back `PASS` üretmiştir;
- MLflow scoring kaydı DataJob'dır, MLModel değildir;
- üç sınırlı DataHub metadata mutation'ı;
- mutation receipt ve durable read-back ayrı iddialardır;
- full document-body eşitliği değil, exact returned-document literal bağları doğrulanır;
- warehouse SQL çalıştırılmaz, code merge/deploy yapılmaz;
- production/customer use veya security certification iddia edilmez.

## 6. DataHub kullanımını görünür yap

Devpost metninde ve gerekiyorsa teknoloji alanında kullanılan araçlar açıkça yer almalıdır.

Okuma ve path araçları:

- `get_entities`
- `list_schema_fields`
- `get_lineage`
- her keşfedilen hedef için `get_lineage_paths_between`
- `get_dataset_queries`

Onaylı mutation araçları:

- `add_structured_properties`
- append modunda `update_description`
- `save_document`

Doğrulama araçları:

- `get_entities`
- `grep_documents`

DataHub yalnız bir logo veya yan entegrasyon değildir; context authority ve kalıcı karar hafızasıdır. ContextSeal'ın ajan döngüsü DataHub olmadan canlı modda tamamlanmaz.

## 7. Video alanını doldur

1. [Çekim rehberine](DEMO_VIDEO_CEKIM_REHBERI.md) göre üretilmiş videonun public URL'sini kopyala.
2. Gizli pencerede video süresini ve oynatmayı tekrar kontrol et.
3. URL'yi Devpost video alanına yapıştır.
4. Devpost preview içinde videonun embed edildiğini doğrula.
5. Submitted form içinde `TODO_PUBLIC_VIDEO_URL` kalmadığını kontrol et.

Repository belgesindeki placeholder operatör hatırlatıcısı olarak kalabilir; fakat Devpost formunda kesinlikle gerçek video URL'si bulunmalıdır.

## 8. Açık kaynak ve build-period açıklaması

- Lisansı `Apache-2.0` olarak seç veya belirt.
- [BUILD_PERIOD_DISCLOSURE.md](../BUILD_PERIOD_DISCLOSURE.md) ile uyumlu biçimde AI geliştirme yardımı kullanıldığını ve önceden var olan kişisel projeden kod kopyalanmadığını açıkla.
- DataHub Skills katkısı yalnız gerçek public issue/PR URL'si varsa bonus olarak sunulabilir.
- Public katkı artık [DataHub Skills PR #35](https://github.com/datahub-project/datahub-skills/pull/35) adresindedir; durumu `OPEN / DRAFT / NOT_MERGED` olarak yaz ve inceleme, kabul veya merge iddia etme.

## 9. Görsel ve logo alanları

Kullanacağın ekran görüntülerinde:

- ContextSeal ürün adı ve kanıt durumları okunur olsun;
- fixture veya live boundary rozeti kesilmesin;
- `.env`, terminal, token, browser profile, bildirim ve kişisel sekme görünmesin;
- sentetik DataHub görüntüsü “synthetic metadata” diye etiketlensin;
- eski pasaport ID'si veya güncel kanıtla çelişen sayı elle yazılmasın.

Telifli müzik, logo veya izinsiz üçüncü taraf görsel kullanma.

## 10. Preview ve gönderim

Devpost preview ekranında sırayla kontrol et:

1. Proje adı ve tagline doğru.
2. Kategori doğru.
3. Repository, Pages, outputs ve video linkleri tıklanıyor.
4. Video 3:00 altında ve public.
5. README, video ve Devpost aynı fixture/live sayılarını kullanıyor.
6. `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, `FIXTURE` anlamları karışmamış.
7. Generated SQL executed diye anlatılmamış.
8. Production, customer adoption veya security certification iddiası yok.
9. Video placeholder'ı formda yok.
10. Kişisel veya gizli bilgi yok.

Mümkünse preview'i signed-out/gizli pencerede bir kez daha aç. Her şey doğrulandıktan sonra **Submit** düğmesine bas ve oluşan public Devpost proje URL'sini özel notlarına kaydet.

## Başvuru sonrası

- Public repository ve videoyu erişilebilir tut.
- Mutation ayarını `false` bırak.
- Token'ları video veya destek mesajı için tekrar paylaşma.
- Devpost düzenlemesi yaparsan metin, video, README ve kanıt tutarlılığını yeniden kontrol et.
