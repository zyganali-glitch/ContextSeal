# Demo Videosu Çekim Rehberi — İngilizce Bilmeyen Acemi Kullanıcı İçin

Bu rehberle İngilizce konuşmadan, ücretsiz araçlarla, üç dakikadan kısa İngilizce anlatımlı bir video hazırlayacaksın. Ekranı sen kaydedeceksin; İngilizce sesi bilgisayar üretecek.

## Son videonun hedefi

- Süre: 2 dakika 35 saniye ile 2 dakika 55 saniye arasında.
- Görüntü: 1920 × 1080.
- Dil: İngilizce bilgisayar sesi.
- Altyazı: İngilizce.
- Müzik: kullanılmayacak.
- Kişisel bilgi: görünmeyecek.
- Canlı DataHub kanıtı hazırdır; bunun sentetik verili yerel DataHub olduğunu açıkça söyleyeceğiz.

## Kullanılacak ücretsiz araçlar

1. **OBS Studio:** ekranı kaydetmek için.
2. **Microsoft Clipchamp:** görüntüyü kesmek, bilgisayar sesi ve yazı eklemek için.
3. **YouTube:** videoyu herkese açık yayınlamak için.

## Bölüm A — Bilgisayarı çekime hazırla

### 1. Bildirimleri kapat

1. Windows görev çubuğunun sağ altındaki saat bölümüne bas.
2. Bildirim panelini aç.
3. **Rahatsız etmeyin** seçeneğini aç.
4. WhatsApp, e-posta veya özel mesaj uygulamalarını kapat.

### 2. Gizli bilgileri kapat

Şunların hiçbirini açık bırakma:

- `.env` dosyası,
- GitHub veya DataHub token ekranı,
- e-posta gelen kutusu,
- özel GitHub repoları,
- kişisel mesajlar,
- masaüstündeki özel dosya adları.

### 3. Tarayıcıyı düzenle

1. Chrome’u aç.
2. Yalnız şu sekmeleri açık bırak:
   - ContextSeal,
   - DataHub hedef varlık,
   - DataHub’da ContextSeal özellikleri veya pasaport belgesi.
3. Diğer sekmeleri kapat.
4. `Ctrl+L` ile adres çubuğunu seç.
5. Tam ekran görünüm için `F11` tuşuna bas.
6. Yazılar küçükse `Ctrl` ve `+` ile yakınlaştır. Genellikle yüzde 100 veya yüzde 110 uygundur.

### 3A. Hazır DataHub kanıt sekmelerini aç

1. Chrome'da yeni sekme aç.
2. Adres çubuğuna şunu yaz ve `Enter` tuşuna bas:

   ```text
   http://localhost:9002
   ```

3. Giriş ekranı açılırsa kullanıcı adına `datahub`, parolaya `datahub` yaz ve giriş düğmesine bas.
4. Sayfanın üstündeki arama kutusuna şunu yaz:

   ```text
   gold_customers
   ```

5. Sonuçlarda Snowflake işareti bulunan `gold_customers` satırına bas.
6. Varlık sayfasında `Properties` veya `Structured Properties` bölümünü bul. Burada şu değerler hazır olmalı:

   - `ContextSeal Status`: `CERTIFIED`
   - `ContextSeal Risk Score`: `80`
   - `ContextSeal Passport ID`: `csp_910a779e1ca2e29e9b88`
   - `ContextSeal Valid Until`: `2026-07-15`

7. Aynı sayfadaki açıklama bölümünde `ContextSeal passport` ile başlayan ek satırı bul.
8. Bu sekmeyi kapatma.
9. Yeni bir DataHub sekmesi aç ve üst arama alanına pasaport numarasını yapıştır:

   ```text
   csp_910a779e1ca2e29e9b88
   ```

10. `Change Passport csp_910a779e1ca2e29e9b88` adlı belgeyi aç. Arama sonucu gecikirse sayfayı bir kez `Ctrl+R` ile yenile.
11. Bu sekmeyi de kapatma.

### 4. Demo verisini sıfırla

1. ContextSeal’i yeniden başlat.
2. Ana sayfayı yenile.
3. Henüz **Analyze the demo change** düğmesine basma.
4. Reviewer alanında `demo-reviewer` yazdığını doğrula.
5. Decision note alanında güvenli plan onayının yazdığını doğrula.

## Bölüm B — OBS Studio kurulumu

### 1. İndir

1. Chrome’da şu adresi aç:

   ```text
   https://obsproject.com/
   ```

2. **Windows** düğmesine bas.
3. İnen kurulum dosyasını aç.
4. `Next → Next → Install → Finish` sırasıyla ilerle.

### 2. İlk açılış

1. OBS açılınca otomatik ayar sihirbazı çıkabilir.
2. **Optimize just for recording** seçeneğini seç. Bu, “yalnız kayıt için ayarla” anlamına gelir.
3. `Next` ve ardından `Apply Settings` düğmelerine bas.

### 3. Ekran kaynağı ekle

OBS’nin alt bölümünde **Sources** adlı kutuyu bul.

1. Sources kutusunun altındaki `+` işaretine bas.
2. **Display Capture** seçeneğini seç.
3. Açılan ad alanını değiştirmeden `OK` düğmesine bas.
4. Doğru ekran seçiliyse tekrar `OK` düğmesine bas.
5. OBS ön izlemesinde masaüstünü görmelisin.

### 4. Mikrofonu kapat

İngilizce sesi daha sonra ekleyeceğimiz için kayıt sırasında mikrofon istemiyoruz.

1. OBS’nin altındaki **Audio Mixer** bölümünü bul.
2. `Mic/Aux` satırındaki hoparlör işaretine bas.
3. İşaret kırmızı veya üstü çizili olmalı.
4. `Desktop Audio` satırını da sessize al. Demo sırasında sistem sesi gerekmiyor.

### 5. Kayıt klasörü

1. OBS sağ altından **Settings** düğmesine bas.
2. Sol menüden **Output** seç.
3. **Recording Path** satırındaki **Browse** düğmesine bas.
4. Masaüstünde `ContextSeal Video` adlı klasör oluştur ve seç.
5. **Recording Format** alanında `MPEG-4 (.mp4)` varsa seç. Yoksa `MKV` seç; daha sonra dönüştürebiliriz.
6. **Apply**, ardından **OK** düğmesine bas.

## Bölüm C — Sessiz ekran kaydını çek

Önce bir prova yap. İlk kaydın kusursuz olması gerekmiyor.

### Çekim sırası

1. OBS’de **Start Recording** düğmesine bas.
2. Alt görev çubuğundan Chrome’a geç.
3. ContextSeal başlık ekranını yaklaşık 5 saniye göster.
4. `customer_email → contact_email` isteğini göster.
5. **Analyze the demo change** düğmesine bir kez bas.
6. Sonuçların gelmesini bekle.
7. Risk puanı görünürken 4 saniye bekle.
8. Yatay bağlantı zincirini yavaşça göster.
9. Risk bulgularına doğru aşağı kaydır.
10. `BREAKING LINEAGE`, `SENSITIVE DATA` ve `LIVE QUERY USAGE` satırlarında 4 saniye bekle.
11. Üretilen dört dosyayı göster.
12. İnsan onayı bölümüne kaydır.
13. **Approve safe plan** düğmesine bir kez bas.
14. Pasaport numarası oluşunca 5 saniye bekle.
15. **Prepare DataHub write-back** düğmesine bas. Bu halka açık fixture gösteriminde ekranda hiçbir kataloğun değiştirilmediği yazmalıdır.
16. Daha önce gerçek yerel yazma kanıtı hazırlanan DataHub sekmesine geç.
17. Eklenen ContextSeal alanlarını göster.
18. Pasaport belgesini göster.
19. ContextSeal ana başlığına geri dön.
20. Yaklaşık 3 saniye bekle.
21. OBS’ye dön ve **Stop Recording** düğmesine bas.

### Kayıt sırasında dikkat et

- Fareyi hızlı hareket ettirme.
- Metin okurken ekranda en az 3 saniye kal.
- Yanlış düğmeye basarsan kaydı durdurup yeniden başla.
- Hata mesajını gizleyip devam etme.
- Fixture modundaysan üstteki fixture rozetini görüntüden çıkarma.

## Bölüm D — Clipchamp ile videoyu düzenle

### 1. Clipchamp’i aç

1. Başlat menüsüne bas.
2. `Clipchamp` yaz.
3. Microsoft Clipchamp’i aç.
4. Microsoft hesabıyla giriş isterse Windows’ta kullandığın hesabı kullan.
5. **Create a new video** seçeneğine bas.

### 2. Kaydı ekle

1. Sol tarafta **Import media** düğmesine bas.
2. Masaüstündeki `ContextSeal Video` klasörünü aç.
3. OBS kaydını seç.
4. `Open` düğmesine bas.
5. Dosya sol üstte görününce onu fareyle aşağıdaki zaman çizgisine sürükle.

### 3. Baş ve sondaki boşlukları kes

1. Zaman çizgisindeki videoya bir kez bas.
2. Sol veya sağ kenarı tutup gereksiz boşluk bitene kadar içeri sürükle.
3. Yanlış yaparsan `Ctrl+Z` kullan.

### 4. İngilizce bilgisayar sesi ekle

Clipchamp’te **Record & create** veya **Text to speech** bölümünü bul. Türkçe arayüzde “Kaydet ve oluştur” ya da “Metinden konuşmaya” yazabilir.

Her metni tek parça yerine aşağıdaki yedi bölüm halinde ekle. Böylece görüntüyle eşleştirmek kolay olur.

#### Ses 1 — Açılış

```text
A repository can see code. DataHub can see what that code will break. ContextSeal turns that context into a change decision backed by proof.
```

Türkçe anlamı: Repo kodu görür; DataHub kodun neyi kıracağını görür. ContextSeal bu bağlamı kanıtlı karara dönüştürür.

#### Ses 2 — İstek

```text
Here, a developer asks to rename customer email directly. ContextSeal validates the request before any code or catalog mutation is allowed.
```

#### Ses 3 — DataHub bağlamı

```text
DataHub context reveals five downstream assets across an Airflow job, a Snowflake dataset, two dashboards, and a production machine learning model. Every impact includes its lineage path.
```

#### Ses 4 — Risk kararı

```text
The deterministic policy blocks the direct change with a risk score of eighty. The field is sensitive, used by observed queries, and connected to critical downstream consumers.
```

#### Ses 5 — Güvenli çözüm

```text
Instead of generating a destructive rename, ContextSeal creates an expand, migrate, and contract plan: a dbt model, schema tests, rollback, and an owner briefing.
```

#### Ses 6 — Onay ve pasaport

```text
A human approves only this safe scope. ContextSeal binds the request, DataHub context, artifacts, evidence, and approval into a SHA two fifty six change passport.
```

#### Ses 7 — Kapanış

Bu proje için kullanacağın kapanış metni:

```text
The certified status and passport are written back to DataHub, so the next engineer and agent inherit the decision. ContextSeal: every data change ships with proof, not confidence.
```

Yalnız DataHub kanıtı daha sonra silinmiş veya çalışmıyorsa bunun yerine:

```text
In this public fixture, write-back remains not run and no catalog is modified. ContextSeal keeps every claim honest: every data change ships with proof, not confidence.
```

### 5. Ses ayarı

1. Dil olarak **English** seç.
2. Sakin ve anlaşılır bir ses seç.
3. Hızı normal veya yüzde 90 civarında tut.
4. Ön izlemeyi dinle.
5. Her ses parçasını ilgili görüntünün altına yerleştir.
6. Ses bitmeden görüntüyü değiştirme.

### 6. Başlık yazıları

Videoya yalnız üç kısa yazı ekle:

Başlangıç:

```text
ContextSeal
Graph-backed certification for data changes
```

Risk anı:

```text
Direct change: BLOCKED
Safe migration: GENERATED
```

Kapanış:

```text
Read context. Act safely. Write knowledge back.
```

### 7. Altyazı

1. Sağ tarafta **Captions** veya “Altyazılar” bölümünü aç.
2. Otomatik altyazıyı etkinleştir.
3. Dil olarak İngilizce seç.
4. Oluşan altyazıları baştan sona kontrol et.
5. `DataHub`, `ContextSeal`, `dbt`, `lineage` ve `SHA-256` kelimelerinin doğru yazıldığını doğrula.
6. Altyazılar ekranın önemli bölümlerini kapatıyorsa alt konumunu değiştir veya yazıyı küçült.

## Bölüm E — Videoyu dışa aktar

1. Sağ üstte **Export** düğmesine bas.
2. `1080p` seç.
3. İşlemin tamamlanmasını bekle.
4. İnen dosyanın adını şu yap:

   ```text
   ContextSeal-DataHub-Demo.mp4
   ```

5. Dosyayı oynat.
6. Sürenin üç dakikadan kısa olduğunu kontrol et.
7. Baştan sona ses ve görüntünün uyumlu olduğunu izle.

## Bölüm F — YouTube’a yükle

1. Chrome’da şu adresi aç:

   ```text
   https://www.youtube.com/
   ```

2. Google hesabınla giriş yap.
3. Sağ üstte kamera ve `+` işaretine benzeyen **Create** düğmesine bas.
4. **Upload video** seçeneğine bas.
5. `Select files` düğmesine bas.
6. `ContextSeal-DataHub-Demo.mp4` dosyasını seç.

### Video başlığı

```text
ContextSeal — Graph-Backed Data Change Certification with DataHub
```

### Video açıklaması

```text
ContextSeal turns risky schema changes into lineage-aware, reviewable, and durable change passports using DataHub MCP.

Repository: https://github.com/zyganali-glitch/ContextSeal

Built for Build with DataHub: The Agent Hackathon.
```

### Çocuklara özel seçeneği

“Is this video made for kids?” sorusunda:

```text
No, it's not made for kids
```

seçeneğini işaretle.

### Görünürlük

1. Son ekranda **Public** seçeneğini seç.
2. **Publish** düğmesine bas.
3. Video bağlantısını kopyala.
4. Gizli Chrome penceresinde bağlantıyı aç.
5. Giriş yapmadan oynadığını doğrula.

## Son video kontrol listesi

- [ ] Video 3:00’dan kısa.
- [ ] İngilizce ses var.
- [ ] İngilizce altyazı var.
- [ ] Telifli müzik yok.
- [ ] Token, parola veya `.env` görünmüyor.
- [ ] Kişisel sekmeler görünmüyor.
- [ ] Fixture/live rozeti görünür.
- [ ] Risk puanı ve etki zinciri okunuyor.
- [ ] Güvenli migration dosyaları gösteriliyor.
- [ ] İnsan onayı gösteriliyor.
- [ ] Pasaport gösteriliyor.
- [ ] DataHub write-back yalnız gerçekten yapıldıysa başarılı anlatılıyor.
- [ ] GitHub bağlantısı açıklamada doğru.
- [ ] Video gizli pencerede oynuyor.
