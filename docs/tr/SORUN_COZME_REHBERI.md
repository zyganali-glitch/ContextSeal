# Sorun çözme rehberi

Bir hata gördüğünde rastgele komut deneme. Önce ilgili başlığı bul, hata metnini oku ve yalnız önerilen güvenli kontrolü yap. Ekran görüntüsü paylaşacaksan token, `.env`, kullanıcı yolu, e-posta ve kişisel sekmeleri gizle.

## PowerShell doğru klasörde değil

Belirti: `package.json bulunamadı` veya npm script'i yok hatası.

Çözüm:

1. Yanlış terminali kapat.
2. Dosya Gezgini'nde `ContextSeal` klasörünü aç.
3. Adres çubuğuna `powershell` yazıp `Enter` tuşuna bas.
4. Kontrol et:

   ```powershell
   Get-Location
   Test-Path package.json
   ```

İkinci komut `True` dönmelidir. Bilgisayara özel eski bir klasör yolunu kopyalama.

## `node` veya `npm` bulunamadı

Kontrol:

```powershell
node --version
npm --version
```

ContextSeal Node.js 20 veya daha yeni sürüm ister. Node.js'in güncel LTS sürümünü resmî [nodejs.org](https://nodejs.org/) sitesinden kur, bütün terminalleri kapatıp yeniden aç ve komutları tekrar dene.

## `npm install` başarısız

1. İnternet bağlantısını kontrol et.
2. Diskte boş alan olduğunu doğrula.
3. Aynı proje klasöründe tekrar çalıştır:

   ```powershell
   npm install
   ```

`node_modules` klasörünü veya lock dosyasını rastgele silme. Hata devam ederse yalnız hata metnini paylaş; token veya `.env` içeriğini ekleme.

## `npm run validate` başarısız

Çıktıdaki ilk `FAIL` satırını bul. Validation şu farklı katmanlardan oluşur:

- repository/link/credential kontrolü;
- kaydedilmiş evidence doğrulaması;
- Node testleri;
- deterministic demo drift kontrolü;
- fixture server smoke akışı.

Sonraki adımlara geçmeden ilk hatayı düzelt. `npm run validate` check-only olmalı ve yeni Git diff oluşturmamalıdır.

## `npm start` port kullanımda diyor

Önce açık eski ContextSeal terminalini bul ve `Ctrl+C` ile durdur. Hangi işlemin portu kullandığını görmek için:

```powershell
Get-NetTCPConnection -LocalPort 4173 -ErrorAction SilentlyContinue
```

Tanımadığın bir işlemi kapatma. Gerekirse uygulamayı geçici başka portta başlatabilirsin:

```powershell
$env:PORT=4174
npm start
```

Sonra [http://127.0.0.1:4174](http://127.0.0.1:4174) adresini aç. Yeni terminalde `$env:PORT` ayarı kendiliğinden yok olur.

## Docker çalışmıyor

1. Docker Desktop'ı aç.
2. **Engine running** görünene kadar bekle.
3. Kontrol et:

   ```powershell
   docker version
   ```

Yalnız client bölümü geliyor veya engine bağlantı hatası varsa bilgisayarı yeniden başlatıp Docker Desktop'ı tekrar aç. Çalışan başka proje container'larını silme.

## DataHub UI açılmıyor

1. Docker Desktop'ta DataHub container'larının çalıştığını kontrol et.
2. [http://localhost:9002](http://localhost:9002) adresini yenile.
3. GMS için [http://localhost:8080](http://localhost:8080) adresini kontrol et.
4. Quickstart'ı kendi terminalinden incele:

   ```powershell
   datahub docker quickstart
   ```

Mevcut değerli bir kataloğu silen komut kullanma. Sorun devam ederse [canlı kurulum rehberine](CANLI_DATAHUB_KURULUMU.md) dön.

## DataHub token sayfası token oluşturmaya izin vermiyor

Kullan-at yerel DataHub Core'da token authentication devre dışı olabilir. Bu durumda token düğmesinin kapalı olması ve DataHub credential satırının boş kalması beklenebilir. Önce GMS'nin yerelde kimlik doğrulamasız çalıştığını doğrula.

ContextSeal operator token'ı ise ayrı bir yerel API credential'ıdır ve DataHub UI'dan oluşturulmaz. [Kurulum rehberindeki](CANLI_DATAHUB_KURULUMU.md) PowerShell yöntemiyle rastgele üretilir. İki token aynı değer olmamalıdır.

## `uvx` veya MCP sunucusu bulunamadı

Kontrol:

```powershell
uvx --version
```

Bulunamıyorsa resmî [`uv` kurulumunu](https://docs.astral.sh/uv/getting-started/installation/) tamamla, terminali kapatıp yeniden aç. `.env` içinde MCP sürümü `mcp-server-datahub@0.6.0` olmalıdır; `@latest` kullanma.

## ContextSeal datahub modunda başlamıyor

DataHub modu iki güvenlik ayarı olmadan bilerek başlamaz:

- ayrı bir ContextSeal operator token;
- en az bir exact DataHub URN içeren `CONTEXTSEAL_ALLOWED_TARGET_URNS` listesi.

Operator token ile DataHub credential aynıysa da başlangıç reddedilir. `.env` dosyasını ekranda paylaşmadan, satırların varlığını yerelde kontrol et. Token değerini hata mesajına veya sohbete yazma.

## Arayüz `401` veya credential rejected gösteriyor

1. **ContextSeal operator token** alanını temizle.
2. Sunucunun yerel `.env` ayarında bulunan ayrı operator değerini yeniden yapıştır.
3. **Use for this tab** düğmesine bas.
4. Bu alana DataHub token'ı veya GitHub token'ı yapıştırma.

Tarayıcı token'ı yalnız sekme belleğinde tutar. Sekmeyi kapatınca yeniden girmen normaldir.

## Hedef allowlist dışında hatası

Analizdeki target URN ile `CONTEXTSEAL_ALLOWED_TARGET_URNS` içindeki exact URN aynı değildir. Güvenliği gevşetmek için geniş wildcard ekleme. Yalnız gerçekten test edeceğin sentetik hedefin tam URN'ini yerel `.env` listesine koy ve sunucuyu yeniden başlat.

## DataHub bağlantısı var ama live verified olmuyor

Canlı rozet ancak şu koşulların tamamında görünür:

- MCP initialization başarılı;
- hedef ve kaynak alan şemada tam eşleşiyor;
- lineage sonucu truncated değil;
- keşfedilen her hedefin exact path'i var;
- query sonucu incelenebilir;
- ham evidence hash'i ile normalize context uyumlu.

Eksik sonucu `PASS` yapmak için fixture veri gönderme veya rozeti elle değiştirme. ContextSeal live sertifikasyonda fail-closed davranır.

## Canlı query sayısı sıfır

Bu, kaydedilmiş yerel kanıtta beklenen gerçek sonuçtur. Başarılı `get_dataset_queries` çağrısı sıfır kayıt döndürmüştür. Sıfırı iki fixture query örneğiyle doldurma; `LIVE_QUERY_USAGE` bulgusunun olmaması doğrudur.

## DataHub graph'ta tür/sayı karışıklığı

Sentetik seed'in hedef dışındaki native aşağı yönlü varlıkları:

- iki `Dataset`;
- iki `DataJob`;
- iki `Dashboard`.

MLflow scoring öğesi `DataJob` metadata'sıdır. `MLModel` veya çalışan production inference değildir.

## Mutation gate disabled mesajı

Read-only aşamada bu beklenen güvenlik sonucudur. Önce canlı analiz ve hedef sınırını doğrula. Mutation'ı yalnız [kurulum rehberindeki](CANLI_DATAHUB_KURULUMU.md) kontrollü aşamada `true` yap; kanıt biter bitmez tekrar `false` yap.

Fixture modunda **Prepare protected operations** işlemi payload'ları gösterir ama DataHub'ı değiştirmez; state'ler `NOT_RUN` kalmalıdır.

## Run `SUPERSEDED` diyor

Canlı evidence yenilendiğinde eski run kasıtlı olarak `SUPERSEDED` yapılır. Eski run üzerinde karar veya write-back yapılamaz. Arayüzde dönen yeni run ID'sini incele ve yalnız yeni evidence için karar ver.

## Write-back `WRITEBACK_IN_PROGRESS`, `WRITEBACK_FAILED` veya verification failed diyor

- Aynı düğmeye tekrar basma.
- Sayfayı yenileyip yeniden mutation deneme.
- Persist edilen run içindeki mutation receipt'lerini ve read-back durumunu incele.
- Kısmi receipt, bazı dış etkilerin gerçekleşmiş olabileceği anlamına gelir.
- Mutation çağrıları otomatik veya elle tekrar edilmemelidir.

`WRITEBACK_VERIFICATION_FAILED`, mutation receipt'lerinin geçmiş olabileceğini fakat durable read-back'in `PASS` olmadığını söyler. Bunu tam başarı diye anlatma.

## Evidence capture/export reddediliyor

Kontrol et:

1. Mutation ayarı yeniden `false` yapıldı mı?
2. Hedefte iki sentetik sahiplik işareti var mı?
3. En yeni run tam üç başarılı receipt içeriyor mu?
4. Durable read-back `PASS` mi?
5. Request, target, policy, passport veya generated artifact değişti mi?

Hata koşulunu atlamak için JSON dosyasını elle düzenleme. Gerekirse kontrollü kanıt akışını baştan ve yeni bir run ile uygula.

## GitHub Pages 404 veya boş

1. Repository'de **Actions** sekmesini aç.
2. Pages deployment workflow'unu bul.
3. Gönderilecek commit üzerinde yeşil olduğunu doğrula.
4. **Settings → Pages** kaynağının GitHub Actions olduğunu kontrol et.
5. Public URL'yi gizli pencerede tekrar aç.

Pages canlı backend değildir; tarihsel fixture snapshot'ıdır.

## Devpost video bağlantısını kabul etmiyor

1. Videonun visibility değerinin **Public** olduğunu doğrula.
2. Bağlantıyı gizli pencerede aç.
3. YouTube Studio düzenleme URL'si yerine public watch URL'sini kopyala.
4. Videonun 3:00 altında olduğunu kontrol et.
5. Devpost preview'de embed'in açıldığını doğrula.

## Token yanlışlıkla göründü veya commit edildi

1. Kaydı/ekran paylaşımını hemen durdur.
2. O video veya ekran görüntüsünü kullanma.
3. İlgili credential'ı sağlayıcısında derhal iptal et.
4. Yeni ayrı credential üret.
5. `.env` dosyasını yalnız yerelde güncelle.
6. Git'e eklendiyse yalnız son commit'ten silmek yeterli olmayabilir; history temizliği için yardım iste.
7. Token değerini yardım mesajına tekrar yazma.
