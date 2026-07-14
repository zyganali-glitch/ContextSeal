# Benim yapmam gerekenler

Bu belge proje sahibinin son güne kadar yapacağı işleri sırayla anlatır. Kod yazman veya teknik karar vermen gerekmiyor. Bir adım beklenen sonucu vermiyorsa sonraki adıma geçme; gizli bilgi görünmeyecek şekilde ekran görüntüsü al ve yardım iste.

## Kısa yol haritası

1. Devpost yarışmasına katıl ve taslak proje aç.
2. Temiz yerel fixture yolunu doğrula.
3. Kaydedilmiş canlı DataHub kanıtını kontrol et.
4. Gerekirse canlı kanıtı güvenli sırayla yeniden üret.
5. Videoyu kesin İngilizce metne göre çek.
6. Nihai İngilizce Devpost metnini forma aktar.
7. Bütün bağlantıları gizli pencerede kontrol et.
8. Son kontrol listesini tamamlayıp başvuruyu gönder.

## 1. Yarışmaya katıl

1. [DataHub Devpost sayfasını](https://datahub.devpost.com/) aç.
2. **Join hackathon** düğmesine bas.
3. Gerekirse Devpost hesabı oluştur ve e-posta adresini doğrula.
4. Yarışma sayfasına dönüp katılımın etkin olduğunu doğrula.
5. Proje taslağını açabilirsin; henüz **Submit** düğmesine basma.

Resmî son tarih: **10 Ağustos 2026, 17:00 EDT**. İstanbul saatiyle **11 Ağustos 2026, 00:00**. Kaynak: [resmî yarışma kuralları](https://datahub.devpost.com/rules).

Güvenli çalışma hedefi:

- 8 Ağustos: kod ve kanıt dondurma;
- 9 Ağustos: video, metin ve bütün bağlantıların kontrolü;
- 10 Ağustos: yalnız yedek gün, yeni büyük özellik yok.

## 2. Public repository ve Pages kontrolü

Gizli Chrome penceresinde şu iki adresi aç:

- [ContextSeal repository](https://github.com/zyganali-glitch/ContextSeal)
- [Kurulumsuz fixture gösterimi](https://zyganali-glitch.github.io/ContextSeal/)

Şunları doğrula:

- repository adının yanında **Public** yazıyor;
- lisans Apache-2.0 olarak görünüyor;
- Pages sayfası açılıyor;
- Pages sayfası kendisini canlı backend değil, kaydedilmiş `FIXTURE` gösterimi olarak tanımlıyor.

## 3. Yerel fixture yolunu doğrula

1. Dosya Gezgini'nde `ContextSeal` klasörünü aç.
2. Adres çubuğuna `powershell` yazıp `Enter` tuşuna bas. Böylece terminal doğru klasörde açılır; kullanıcı adına özel bir yol yazman gerekmez.
3. Sırayla çalıştır:

   ```powershell
   npm install
   npm run validate
   npm start
   ```

4. Terminali açık bırak.
5. [http://127.0.0.1:4173](http://127.0.0.1:4173) adresini aç.
6. Arayüzde fixture/connected rozetini gör.
7. Şu tıklama yolunu tamamla:

   - **Run local certification**
   - risk `80`, karar `BLOCKED`
   - beş fixture aşağı yönlü varlığı, en derin dört adım
   - dört üretilmiş dosya
   - **Approve safe plan**
   - `csp_...` pasaportu
   - **Prepare protected operations**
   - üç işlemin `NOT_RUN` olması

8. Terminalde sunucuyu `Ctrl+C` ile durdur.

Fixture yolu canlı DataHub veya gerçek sorgu iddiası değildir. İki query örneği ve fixture'daki `ML_MODEL` düğümü sentetiktir. Canlı yerel seed'deki MLflow scoring varlığı ise native `DataJob` metadata'sıdır; iki yüzeyi birleştirme ve inference çalıştığını iddia etme.

## 4. Canlı DataHub kanıtını kontrol et

Önce [canlı kurulum rehberini](CANLI_DATAHUB_KURULUMU.md) oku. Kaydedilmiş kanıtın doğru gerçekleri şunlardır:

- kullan-at yerel DataHub Core;
- yalnız ContextSeal'e ait sentetik metadata, kaynak satırı yok;
- 10 MCP okuması ve tek sayfada tam üç alanlı hedef şeması;
- hedefin altında altı varlık ve altı exact path: iki `Dataset`, iki `DataJob`, iki `Dashboard`;
- canlı query sonucu sıfır;
- MLflow scoring kaydı `DataJob` türündedir, `MLModel` değildir;
- doğrudan istek `70 / BLOCKED`;
- onaylanan güvenli kapsam için üç sınırlı metadata mutation receipt'i `PASS`;
- structured properties, açıklama bağı ve exact returned-document pasaport/manifest/hedef literal bağlarının ayrı read-back doğrulaması `PASS`.

Kanıtı yeniden üretirken güvenlik sırası değişmez:

1. operator token'ı üret ve `.env` içinde yerel tut;
2. exact target allowlist'ini ayarla;
3. mutation ayarı `false` iken read-only analiz yap;
4. yalnız doğrulanan hedef için mutation ayarını `true` yap;
5. taze analiz oluştur, tam kapsamı onayla ve write-back'e yalnız bir kez bas;
6. sunucuyu durdurup mutation ayarını hemen tekrar `false` yap;
7. capture, export, evidence ve tam validation komutlarını çalıştır.

Tarayıcıya girilen operator token yalnız o sekmenin belleğinde kalır. `.env`, token ekranı veya terminaldeki gizli değer hiçbir ekran görüntüsüne/video kaydına girmemelidir.

## 5. Demo videosunu hazırla

[Demo videosu çekim rehberini](DEMO_VIDEO_CEKIM_REHBERI.md) uygula. Ana kurallar:

- süre 3:00 altında, hedef 2:50–2:58;
- 1920×1080, 30 fps;
- İngilizce kesin metin [DEMO_SCRIPT.md](../DEMO_SCRIPT.md) ile aynı;
- görüntü sırası [VIDEO_SHOT_LIST.md](../VIDEO_SHOT_LIST.md) ile aynı;
- fixture rozeti kesilmez;
- generated SQL çalıştırılmış gibi anlatılmaz;
- canlı kanıt “disposable local DataHub, synthetic metadata” diye etiketlenir;
- müzik, kişisel sekme, bildirim, `.env` veya token görünmez.

Videoyu YouTube, Vimeo veya Youku'ya **Public** yükle. Bağlantıyı gizli pencerede baştan sona oynat.

## 6. Devpost formunu doldur

[Devpost başvuru rehberini](DEVPOST_BASVURU_REHBERI.md) kullan. Forma yapıştırılacak içerik [İngilizce nihai metindir](../DEVPOST_SUBMISSION.md); Türkçe rehberi forma yapıştırma.

Video bağlantısı oluşunca Devpost formundaki `TODO_PUBLIC_VIDEO_URL` yerini gerçek public bağlantıyla değiştir. Repository içindeki operatör hatırlatıcısını yanlışlıkla “gönderilmiş video” diye sunma.

## 7. Son kontrol

[Pre-submission checklist](../PRE_SUBMISSION_CHECKLIST.md) belgesindeki her kutuyu gerçek kanıtla tamamla. Özellikle:

- `npm run validate` geçiyor ve Git diff oluşturmuyor;
- GitHub Actions submitted commit üzerinde yeşil;
- repository ve video signed-out pencerede açılıyor;
- video 3:00 altında;
- Devpost metni, README, video, dashboard ve kanıt dosyaları aynı sayıları/iddiaları kullanıyor;
- mutation ayarı `false`;
- `.env` untracked;
- token, özel tenant veya müşteri verisi yok;
- upstream DataHub Skills katkısı gerçek public [PR #35](https://github.com/datahub-project/datahub-skills/pull/35) ile gösteriliyor ve `OPEN / DRAFT / NOT_MERGED` sınırı korunuyor.

## Asla yapma

- Token'ı sohbete, issue'ya, GitHub'a, Devpost'a veya ekran görüntüsüne yapıştırma.
- Operator token ile DataHub credential'ını aynı değer yapma.
- Başarısız ya da kısmi write-back'i tekrar deneme; önce durumu incele.
- `NOT_RUN` işlemi `PASS`, fixture sorgusunu canlı sorgu veya DataJob'ı MLModel diye anlatma.
- Üretim, müşteri kullanımı, güvenlik sertifikası veya ölçülmüş incident azalması iddiası uydurma.
- Son kontrol bitmeden **Submit** düğmesine basma.
