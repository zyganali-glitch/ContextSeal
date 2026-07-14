# Demo videosu çekim rehberi — adım adım

Bu rehber, üç dakikadan kısa İngilizce demo videosunu teknik veya ileri İngilizce bilgisi gerektirmeden hazırlamak içindir. Görüntü sırası [İngilizce shot list](../VIDEO_SHOT_LIST.md), söylenecek cümleler ise [İngilizce kesin anlatım](../DEMO_SCRIPT.md) ile **birebir aynı** olmalıdır. Bu Türkçe belge yeni iddia veya alternatif metin üretmez.

## Hedef çıktı

- Süre: 3:00 altında; hedef 2:50–2:58
- Çözünürlük: 1920×1080
- Kare hızı: 30 fps
- Dil: İngilizce anlatım ve düzeltilmiş İngilizce altyazı
- Müzik: yok
- Ana görüntü: çalışan yerel fixture uygulaması
- Son kanıt kesiti: kullan-at yerel DataHub, sentetik metadata
- Gizli/kişisel bilgi: yok

## Videodaki iki yüzeyi karıştırma

1. **Yerel fixture:** Gerçek ContextSeal uygulaması çalışır; metadata sentetiktir. Beş aşağı yönlü fixture varlığı, en derin dört adım ve iki sentetik query örneği gösterilir. Doğrudan istek risk `80` ve `BLOCKED` olur. Hazırlanan üç operation `NOT_RUN` kalır.
2. **Canlı yerel kanıt kesiti:** Kullan-at DataHub içindeki ContextSeal sentetik metadata'sıdır. Seed edilen native aşağı yönlü varlıklar iki Dataset, iki DataJob ve iki Dashboard'dur; canlı query sonucu sıfırdır. MLflow scoring öğesi `DataJob`'dır, `MLModel` değildir.

Video anlatımı fixture query örneklerini canlı/production query diye sunmamalıdır. Canlı DataHub kesitinde üretim veya müşteri verisi olduğu söylenmemelidir.

## 1. Çekimden önce güvenlik kontrolü

1. Windows'ta **Rahatsız etmeyin** modunu aç.
2. E-posta, mesaj, ödeme, hesap ve kişisel sekmeleri kapat.
3. `.env`, terminal, token/settings sayfası ve kullanıcı klasörü yolu ekranda olmasın.
4. Temiz bir browser profile kullan veya avatar/bookmarks bar'ı gizle.
5. Yalnız şu sekmeleri hazırla:

   - ContextSeal fixture: [http://127.0.0.1:4173](http://127.0.0.1:4173)
   - sentetik DataHub hedef varlığı
   - aynı run'a ait exact decision document

6. DataHub kesitine edit sırasında şu etiketi ekle:

   ```text
   Disposable local DataHub · synthetic metadata · no production/customer data
   ```

   Alt kanıt satırı: **10 MCP reads · 6 exact paths · 0 queries · 3 PASS mutations · read-back PASS**

7. Operator token alanı veya token'ın girildiği an videoda görünmesin. Tarayıcı alanındaki değer yalnız sekme belleğindedir; çekimden önce canlı kanıt sekmelerini hazırla, sonra token alanını kadraj dışında bırak.
8. Güncel pasaport ID, risk ve validity değerlerini kaydedilmiş kanıttan gör; eski bir değeri metne elle yazma.

## 2. Ürünü çekime hazırla

Proje klasörünü Dosya Gezgini'nde aç, adres çubuğuna `powershell` yazıp `Enter` tuşuna bas:

```powershell
npm run validate
npm start
```

Validation geçmeden çekime başlama. Video için fixture modunu kullan ve mutation ayarının `false` olduğunu doğrula. Başarılı terminal çıktısını videoya almak gerekmez.

Tarayıcıda:

1. ContextSeal sayfasını yenile.
2. **LOCAL FIXTURE · CONNECTED** rozetini gör.
3. Henüz **Run local certification** düğmesine basma.
4. Browser zoom değerini yüzde 90–100 aralığında ayarla.
5. Reviewer/note alanında yalnız demo metni kullan; kişisel isim veya e-posta kullanma.

## 3. OBS Studio ile sessiz görüntüyü kaydet

Ücretsiz [OBS Studio](https://obsproject.com/) kullanabilirsin.

1. OBS'yi aç.
2. İlk sihirbazda **Optimize just for recording** seç.
3. **Sources → + → Display Capture** ile doğru ekranı ekle.
4. **Mic/Aux** ve **Desktop Audio** kanallarını sessize al; anlatım sonradan eklenecek.
5. **Settings → Video** bölümünde 1920×1080 ve 30 fps seç.
6. **Settings → Output** bölümünde kayıt klasörünü belirle.
7. Önce 20 saniyelik deneme kaydı al; yazıların okunabildiğini kontrol et.

## 4. Kesin görüntü sırası

Bu tablo [İngilizce shot list](../VIDEO_SHOT_LIST.md) ile aynıdır:

| Zaman | Görüntü | Yapılacak işlem | Görünür kalması gereken |
| --- | --- | --- | --- |
| 0:00–0:15 | ContextSeal hero | Başlık ve `customer_email → contact_email` isteği | Ürün adı |
| 0:15–0:35 | Agent loop | Read, Decide, Generate, Certify, Write back | Human-gated etiketi |
| 0:35–1:20 | Yerel fixture | **Run local certification**, metrikler ve graph | **LOCAL FIXTURE · CONNECTED** |
| 1:20–1:50 | Risk/yollar | Paths, owners ve named findings | Risk 80, `BLOCKED`, evidence state'leri |
| 1:50–2:15 | Artifact önizleme | SQL, YAML, rollback, owner brief | Generated path ve içerik |
| 2:15–2:35 | Onay/pasaport | **Approve safe plan**, hash'ler ve expiry | Reviewer scope ve pasaport |
| 2:35–2:50 | Fixture → tek kanıt görünümü | **Prepare protected operations**, okunacak kadar bekle, sonra önceden hazırlanmış target/document görünümüne tek kesme yap | Önce üç `NOT_RUN`; sonra `10 MCP reads · 6 exact paths · 0 queries · 3 PASS mutations · read-back PASS` ve sentetik-local etiketi |
| 2:50–2:58 | ContextSeal | Pasaport/evidence ledger ve repository URL | Evidence state'leri |

Kayıt sırasında fareyi yavaş hareket ettir. Bir metnin okunması için en az 2–3 saniye bekle. Fixture analizinden onaya kadar olan ana akışı tek kesintisiz çekim yapmak, ürünün gerçekten çalıştığını gösterir.

Artifact'leri gösterirken “generated/reviewable” anlatımını kullan. Warehouse'da çalıştırıldığını söyleme. Fixture operation hazırlama ekranını gösterirken üç state'in `NOT_RUN` kaldığı okunabilsin.

## 5. İngilizce anlatımı ekle

Kesin İngilizce cümleleri yalnız [DEMO_SCRIPT.md](../DEMO_SCRIPT.md) dosyasından al. Dosyadaki 2:58 anlatımı ana sürümdür; gerekirse aynı dosyadaki 90 saniyelik backup metni kullanılır.

Kendi sesinle okuyabilir veya Clipchamp'in text-to-speech özelliğini kullanabilirsin:

1. [Microsoft Clipchamp](https://clipchamp.com/) içinde yeni 16:9 video oluştur.
2. OBS kaydını içe aktar ve timeline'a ekle.
3. **Record & create → Text to speech** bölümünü aç.
4. Metni zaman bloklarına göre ayrı ayrı yapıştır.
5. İngilizce doğal bir ses seç; hızı çok artırma.
6. Her ses parçasını ilgili görüntünün altına yerleştir.
7. Sessizlikleri ve beklemeleri keserek toplamı 2:50–2:58 aralığına getir.

Otomatik altyazı oluştur ve şu terimleri elle düzelt:

- ContextSeal
- DataHub
- MCP
- dbt
- lineage
- expand–migrate–contract
- passport
- `NOT_RUN`

## 6. Söylenmemesi gereken ifadeler

- “five-hop path” deme; **five downstream fixture assets, deepest path four hops** de.
- Fixture query örneklerine production/observed canlı query deme.
- ML yüzeylerini ayır: fixture açıkça sentetik bir `ML_MODEL` düğümü içerir; canlı yerel kanıt MLflow scoring metadata'sını `DataJob` olarak temsil eder. İkisini de inference çalıştığının kanıtı gibi anlatma.
- Generated SQL'a executed SQL deme.
- Prepared payload'a completed mutation deme.
- Mutation receipt `PASS` iken read-back başarısızsa tam doğrulama deme.
- Sentetik yerel DataHub'a production/customer DataHub deme.
- Tam belge body eşitliği iddia etme; exact returned-document bindings de.
- Security certified, production ready veya measured incident reduction deme.

## 7. Ayrı klipleri yedekle

Şu parçaları ayrıca kaydetmek düzenlemeyi kolaylaştırır:

1. Hero ve agent loop.
2. Kesintisiz fixture analyze akışı.
3. Dört artifact önizlemesi.
4. Onay ve pasaport.
5. Fixture `NOT_RUN` sınırı.
6. DataHub structured properties.
7. Exact decision document.
8. Son evidence ledger.

Canlı DataHub kanıtını yeniden mutation yaparak sırf video için tekrarlama. Hazır ve doğrulanmış sentetik-local sonucu göster.

## 8. Export ve public yükleme

1. Clipchamp'te **Export → 1080p** seç.
2. Export edilen videoyu baştan sona izle.
3. Sürenin 3:00 altında olduğunu doğrula.
4. Token, `.env`, kişisel sekme, bildirim veya kullanıcı klasörü yolu için kare kare kontrol et.
5. Videoyu YouTube, Vimeo veya Youku'ya **Public** yükle.
6. Bağlantıyı gizli pencerede aç ve videonun baştan sona oynadığını doğrula.
7. Gerçek public URL oluşmadan Devpost formundaki video placeholder'ını değiştirme.

## Son çekim kontrol listesi

- [ ] İngilizce ses [DEMO_SCRIPT.md](../DEMO_SCRIPT.md) ile aynı.
- [ ] Görüntü sırası [VIDEO_SHOT_LIST.md](../VIDEO_SHOT_LIST.md) ile aynı.
- [ ] Süre 3:00 altında.
- [ ] Fixture/live rozetleri kesilmemiş.
- [ ] Risk 80 ve beş fixture varlığı yalnız fixture olarak anlatılmış.
- [ ] Canlı DataHub kesiti sentetik-local olarak etiketlenmiş.
- [ ] Canlı query sıfırı iki sentetik fixture query ile karıştırılmamış.
- [ ] Fixture `ML_MODEL` düğümü ile canlı yerel `DataJob` ayrımı doğru anlatılmış; inference çalıştığı iddia edilmemiş.
- [ ] Üç fixture operation `NOT_RUN` görünüyor.
- [ ] Mutation receipt ve durable read-back ayrı gösteriliyor.
- [ ] Token, `.env`, terminal veya kişisel bilgi görünmüyor.
- [ ] Telifli müzik veya lisanssız görüntü yok.
- [ ] Public video signed-out pencerede çalışıyor.
