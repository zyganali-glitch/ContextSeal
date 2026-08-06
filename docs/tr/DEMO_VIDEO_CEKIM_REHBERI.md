# Demo Videosu Çekim Rehberi — İngilizce Bilmeyen Acemi Kullanıcı İçin

Bu rehberle İngilizce konuşmadan, ücretsiz araçlarla, üç dakikadan kısa İngilizce anlatımlı bir video hazırlayacaksın. Ekranı sen kaydedeceksin; İngilizce sesi bilgisayar üretecek.

## Son videonun hedefi

- Süre: yaklaşık 2 dakika 20 saniye; hedef aralık 2 dakika 15 saniye ile 2 dakika 30 saniye.
- Görüntü: 1920 × 1080.
- Dil: İngilizce bilgisayar sesi.
- Altyazı: İngilizce.
- Müzik: kullanılmayacak.
- Kişisel bilgi: görünmeyecek.
- Varsayılan akış fixture tabanlıdır; canlı MCP kanıtı gösterilecekse bunun sentetik verili yerel DataHub olduğunu açıkça söyleyeceğiz.
- Her ürün karesinde fixture rozeti görünür kalmalı; kayıtlı kanıt bölümü gösterilirse `Recorded live-local proof` etiketi de kadrajda kalmalı.

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
2. Varsayılan kayıt için yalnız ContextSeal sekmesini açık bırak. Ayrı canlı yerel DataHub kanıtını yalnız kayıtlı artefaktla eşleşiyorsa son dört saniyede göster.
3. Diğer sekmeleri kapat.
4. `Ctrl+L` ile adres çubuğunu seç.
5. Tam ekran görünüm için `F11` tuşuna bas.
6. Yazılar küçükse `Ctrl` ve `+` ile yakınlaştır. Genellikle yüzde 100 veya yüzde 110 uygundur.

### 3A. İsteğe bağlı canlı yerel kanıt sekmesi

Bu bölüm varsayılan 2 dakika 20 saniyelik kaydın zorunlu parçası değildir. Yalnız `examples/outputs/live-datahub-read-evidence.json` ve `examples/outputs/live-datahub-writeback-evidence.json` ile eşleşen, sentetik metadata içeren yerel DataHub kanıtı hazırsa kullan.

1. Chrome'da yeni sekme aç ve `http://localhost:9002` adresine git.
2. Güncel Quickstart çıktısının verdiği kimlik bilgilerini kullan; tahmin etme veya gizli bilgi gösterme.
3. Hedef varlığın ContextSeal özelliklerini ve pasaport belgesini yalnız birkaç saniye göster.
4. Bu görüntüde veya seslendirmede, bunun sentetik yerel DataHub kanıtı olduğunu söyle.

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
2. ContextSeal başlık ekranını ve `customer_email → contact_email` isteğini göster.
3. **Analyze the demo change** düğmesine bir kez bas.
4. Risk puanını, fixture rozetiyle birlikte beş aşağı yönlü varlığı ve bulguları göster.
5. Local AI Copilot panelini göster; AI'nın sadece açıklama yaptığı ve `NOT_ENABLED` durumunun dürüstçe göründüğü anı kaydet.
6. Agent Run Trace'i, üretilen beş dosyayı, rename diff'i, sandbox kanıtını ve PR inceleme paketini göster.
7. İnsan onayı bölümüne kaydır ve **Approve safe plan** düğmesine bir kez bas.
8. Pasaport numarası ve manifest hash oluşunca birkaç saniye bekle.
9. **Prepare DataHub write-back** düğmesine bas. Fixture gösteriminde hiçbir kataloğun değiştirilmediği yazmalıdır.
10. `Recorded live-local proof` receipt'ini yalnız sentetik metadata etiketiyle kısa göster veya fixture kapanışıyla devam et; bunu aktif canlı katalog bağlantısı diye anlatma.
11. OBS’ye dön ve **Stop Recording** düğmesine bas.

### Kayıt sırasında dikkat et

- Fareyi hızlı hareket ettirme.
- Metin okurken ekranda en az 3 saniye kal.
- Yanlış düğmeye basarsan kaydı durdurup yeniden başla.
- Hata mesajını gizleyip devam etme.
- Fixture modundaysan üstteki fixture rozetini görüntüden çıkarma; recorded proof görünürse onun etiketini de görüntüden çıkarma.

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

Her metni tek parça yerine aşağıdaki sekiz bölüm halinde ekle. Böylece görüntüyle eşleştirmek kolay olur.

#### Ses 1 — Açılış

```text
A repository can see code. DataHub can see what that code will break. ContextSeal turns that context into a change decision backed by proof.
```

Türkçe anlamı: Repo kodu görür; DataHub kodun neyi kıracağını görür. ContextSeal bu bağlamı kanıtlı karara dönüştürür.

#### Ses 2 — İstek

```text
Here, a developer requests a direct customer email rename. ContextSeal blocks the risky request before it reaches GitHub.
```

#### Ses 3 — DataHub bağlamı

```text
The public fixture shows five downstream assets and the path that explains the blast radius. Separate local evidence records raw DataHub MCP reads on synthetic metadata.
```

#### Ses 4 — Risk kararı

```text
The deterministic policy blocks the direct change with a risk score of eighty and named lineage, sensitivity, and fixture query-evidence findings.
```

#### Ses 5 — AI sınırı

```text
The 12-step agent trace shows evidence moving before action. After the deterministic verdict, the local AI layer creates bounded operator guidance. It can explain the evidence, but it can never change the verdict or evidence state.
```

#### Ses 6 — Güvenli çözüm

```text
Instead of a destructive rename, ContextSeal exposes an inspectable expand, migrate, and contract package: dbt model, parity test, rollback, owner brief, sandbox evidence, and a reviewer-ready PR packet.
```

#### Ses 7 — Onay ve pasaport

```text
A human approves only this safe scope. ContextSeal binds the request, context, artifacts, evidence, and approval into a SHA two fifty six change passport.
```

#### Ses 8 — Dürüst kapanış

```text
In this public fixture, write-back remains not run and no catalog is modified. The separately labeled Recorded live-local proof shows three bounded write-backs, a skipped idempotent retry, and durable read-back on synthetic metadata; it is not a current live catalog connection.
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

- [ ] Video 2 dakika 15 saniye ile 2 dakika 30 saniye arasında.
- [ ] İngilizce ses var.
- [ ] İngilizce altyazı var.
- [ ] Telifli müzik yok.
- [ ] Token, parola veya `.env` görünmüyor.
- [ ] Kişisel sekmeler görünmüyor.
- [ ] Fixture/live rozeti görünür.
- [ ] Risk puanı ve etki zinciri okunuyor.
- [ ] AI paneli ve açıklama-only sınırı görünür.
- [ ] Güvenli migration dosyaları gösteriliyor.
- [ ] Sandbox kanıtı ve PR inceleme paketi gösteriliyor.
- [ ] İnsan onayı gösteriliyor.
- [ ] Pasaport gösteriliyor.
- [ ] DataHub write-back yalnız gerçekten yapıldıysa başarılı anlatılıyor.
- [ ] GitHub bağlantısı açıklamada doğru.
- [ ] Video gizli pencerede oynuyor.
