# Canlı DataHub Kurulumu — Acemi Kullanıcı Rehberi

Bu rehber gerçek DataHub bağlantısını kanıtlamak içindir. Komutların ne anlama geldiğini bilmen gerekmiyor. Her adımdan sonra bekle ve beklenen sonucu görmeden ilerleme.

## Bu bilgisayardaki mevcut durum

14 Temmuz 2026 tarihinde aşağıdaki işlemler tamamlandı ve tarihsel kanıt olarak saklandı; bu kayıt final SHA kanıtı değildir:

- DataHub yerel olarak kuruldu ve `http://localhost:9002` adresi yanıt verdi.
- Altı sentetik varlık ve beş bağlantı yüklendi.
- Canlı MCP okuması yapıldı.
- İnsan onayından sonra dört ContextSeal alanı, açıklama ve pasaport belgesi yazıldı.
- Sonuçlar DataHub'dan tekrar okunarak doğrulandı.

Bu yüzden aşağıdaki kurulum adımlarını şimdi yeniden yapma. Bunlar sistemi ileride yeniden kurman gerekirse kullanacağın ayrıntılı başvuru adımlarıdır.

## Başlamadan önce

Şunlar hazır olmalı:

- Docker Desktop açık.
- Sol altta **Engine running** yazıyor.
- İnternet bağlantısı çalışıyor.
- Bilgisayarda en az 8 GB boş bellek olması tercih edilir.
- ContextSeal klasörü mevcut.

## Aşama 1 — Yeni PowerShell aç

1. Başlat menüsüne bas.
2. `PowerShell` yaz.
3. **Windows PowerShell** seçeneğine normal şekilde bas.
4. Mavi pencere açılınca şu komutu çalıştır:

   ```powershell
   python --version
   ```

5. `Python 3.10` veya daha yüksek bir sürüm görmelisin.

## Aşama 2 — DataHub komut aracını kur

PowerShell’e sırayla şu komutları yapıştır. Her komuttan sonra `Enter` tuşuna bas ve bitmesini bekle:

```powershell
python -m pip install --upgrade pip wheel setuptools
```

Ardından:

```powershell
python -m pip install --upgrade acryl-datahub
```

Kontrol:

```powershell
& "$env:APPDATA\Python\Python311\Scripts\datahub.exe" version
```

Bir sürüm numarası görürsen kurulum tamamdır. `datahub komutu bulunamadı` benzeri hata görürsen devam etme ve ekran görüntüsü gönder.

## Aşama 3 — DataHub’ı başlat

1. Docker Desktop’ın açık olduğunu tekrar doğrula.
2. PowerShell’de şunu çalıştır:

   ```powershell
   $env:PYTHONUTF8="1"
   & "$env:APPDATA\Python\Python311\Scripts\datahub.exe" docker quickstart
   ```

3. İlk çalıştırmada birçok dosya indirileceği için uzun sürebilir.
4. PowerShell’i kapatma.
5. Docker Desktop’ta **Containers** bölümünde birden fazla DataHub bileşeni belirmelidir.
6. Komut başarılı tamamlandığında tarayıcıda şu adresi aç:

   ```text
   http://localhost:9002
   ```

7. DataHub giriş veya ana sayfası görünmelidir.
8. Varsayılan kullanıcı bilgisi istenirse güncel Quickstart çıktısında gösterilen bilgiyi kullan. Tahmin etme.

## Aşama 4 — ContextSeal örnek verisini yükle

Yeni bir PowerShell aç. Önce proje klasörüne gir:

```powershell
cd "C:\Users\ASUS 6410\.gemini\antigravity\scratch\ContextSeal"
```

Ardından şunu çalıştır:

```powershell
npm run datahub:seed
```

İşlem tamamlandıktan sonra DataHub sayfasını yenile:

1. Chrome’da DataHub sekmesine geç.
2. Klavyede `Ctrl` ve `R` tuşlarına birlikte bas.
3. Arama alanında `customer` veya `churn` ara.
4. `gold_customers`, `customer_segments` veya `churn_prediction` sonuçlarından birini görmen yüklemenin çalıştığını gösterir.

## Aşama 5 — DataHub erişim anahtarı oluştur

Ekran adları DataHub sürümüne göre biraz değişebilir. Gizli anahtarı hiçbir ekran görüntüsüne alma.

1. DataHub sayfasında sağ üstteki profil işaretine bas.
2. **Settings** veya **Ayarlar** seçeneğini aç.
3. **Access Tokens** ya da **Erişim Anahtarları** bölümünü bul.
4. **Generate new token** veya yeni anahtar oluştur düğmesine bas.
5. Ad alanına şunu yaz:

   ```text
   ContextSeal Local Demo
   ```

6. Mümkünse son kullanma süresini yarışma sonrasındaki kısa bir tarihe ayarla.
7. Anahtarı oluştur.
8. Gösterilen değeri yalnızca geçici olarak Not Defteri’ne kopyala.
9. Bu değeri bana, GitHub’a, Devpost’a veya ekran görüntüsüne gönderme.

## Aşama 6 — ContextSeal ayar dosyasını oluştur

1. Dosya Gezgini’ni aç.
2. Adres çubuğuna şunu yapıştır:

   ```text
   C:\Users\ASUS 6410\.gemini\antigravity\scratch\ContextSeal
   ```

3. `Enter` tuşuna bas.
4. `.env.example` dosyasını bul.
5. Dosyaya sağ tıkla ve **Kopyala** seçeneğini seç.
6. Boş alana sağ tıkla ve **Yapıştır** seçeneğini seç.
7. Oluşan kopyanın adını `.env` yap.
8. Uzantı uyarısı çıkarsa **Evet** de.
9. `.env` dosyasına sağ tıkla, **Birlikte aç → Not Defteri** seç.
10. Şu satırları bul ve değerleri aşağıdaki hale getir:

    ```dotenv
    CONTEXTSEAL_MODE=datahub
   CONTEXTSEAL_HOST=127.0.0.1
   DATAHUB_MCP_TRANSPORT=stdio
   DATAHUB_MCP_COMMAND=uvx
   DATAHUB_MCP_ARGS=["mcp-server-datahub@0.6.0"]
    DATAHUB_GMS_URL=http://localhost:8080
    DATAHUB_GMS_TOKEN=BURAYA_KENDI_GIZLI_ANAHTARIN
    DATAHUB_MCP_MUTATIONS_ENABLED=false
   CONTEXTSEAL_OPERATOR_TOKEN=
   CONTEXTSEAL_ALLOWED_TARGET_URNS=["urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)"]
    ```

11. `BURAYA_KENDI_GIZLI_ANAHTARIN` bölümünü silip DataHub’ın verdiği anahtarı yapıştır.
12. `Ctrl+S` ile kaydet.
13. Not Defteri’ni kapat.
14. Geçici Not Defteri dosyasındaki anahtarı sil.

`.env` dosyası Git tarafından yok sayılır ve GitHub’a gönderilmez.

Sunucu canlı modda ancak `.env` içindeki `CONTEXTSEAL_OPERATOR_TOKEN` boş değilse ve `CONTEXTSEAL_ALLOWED_TARGET_URNS` boş olmayan bir JSON dizi ise açılır. Canlı API çağrılarında `Authorization: Bearer <CONTEXTSEAL_OPERATOR_TOKEN>` başlığı zorunludur.

## Aşama 7 — ContextSeal alanlarını DataHub’a ekle

PowerShell’de proje klasörüne gir:

```powershell
cd "C:\Users\ASUS 6410\.gemini\antigravity\scratch\ContextSeal"
```

Sonra:

```powershell
npm run datahub:properties
```

Bu komut yalnız ön kontrol yapar ve alanda neyin değişeceğini gösterir. Gerçek uygulama için aynı PowerShell penceresinde şu değişkenleri ayarla:

```powershell
$env:DATAHUB_MCP_MUTATIONS_ENABLED="true"
$env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION="I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
$env:CONTEXTSEAL_PROPERTIES_CONFIRMATION="UPSERT_CONTEXTSEAL_STRUCTURED_PROPERTIES_V1"
$env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256="BURAYA_PREFLIGHT_HASHINI_YAPISTIR"
npm run datahub:properties:apply
```

Başarılı olursa ContextSeal Status, Risk Score, Passport ID ve Valid Until alanları oluşturulur.

## Aşama 8 — MCP bağlantı aracını kur

1. Yeni PowerShell aç.
2. Şu komutu çalıştır:

   ```powershell
   python -m pip install --user --upgrade "acryl-datahub==1.6.0.14" uv
   ```

3. Bittiğinde şunu çalıştır:

   ```powershell
   & "$env:APPDATA\Python\Python311\Scripts\uvx.exe" --version
   ```

4. Bir sürüm numarası görmelisin. ContextSeal gerektiğinde resmî `mcp-server-datahub` aracını kendisi başlatacak; ayrı bir pencereyi açık tutman gerekmiyor.

`npm run datahub:seed` ve `npm run datahub:properties` komutları arka planda sabitlenmiş ücretsiz yol olan `uv run --with acryl-datahub==1.6.0.14` kullanır.

İlk bağlantıda yalnız okuma işlemleri açık tutulacak. Şu beş araç sözleşmesinin tamamını kanıtlamadan yazma işlemini açmayacağız:

- `get_entities` ile hedef varlık okunuyor,
- sayfalanmış `list_schema_fields` ile tam şema görüntüsü ve alan kısıtları okunuyor,
- `get_lineage` ile aşağı akış hedefleri bulunuyor,
- her hedef için `get_lineage_paths_between` ile tam yol okunuyor,
- `get_dataset_queries` ile sorgu kanıtı okunuyor; sıfır sonuç da dürüstçe kaydediliyor,
- gizli anahtar hiçbir çıktıda görünmüyor.

## Aşama 9 — Yazma kapısını aç

Bu aşamayı yalnız Codex “canlı okuma kanıtı tamam” dedikten sonra yap.

1. `.env` dosyasını Not Defteri ile aç.
2. Şu satırı bul:

   ```dotenv
   DATAHUB_MCP_MUTATIONS_ENABLED=false
   ```

3. `false` yerine `true` yaz:

   ```dotenv
   DATAHUB_MCP_MUTATIONS_ENABLED=true
   ```

4. Kaydet ve kapat.
5. ContextSeal uygulamasını yeniden başlat.
6. Yalnız yarışma için hazırlanmış güvenli örnek varlık üzerinde işlem yap.

## Aşama 10 — Kanıt ekranları

Demo videosundan önce şu ekranları ayrı ayrı kaydet:

1. DataHub arama sonucu.
2. Hedef varlığın lineage görünümü.
3. ContextSeal’de **LIVE DATAHUB MCP** rozeti.
4. Risk bulguları.
5. İnsan onayı.
6. Pasaport numarası.
7. DataHub’da ContextSeal structured properties.
8. DataHub’daki pasaport belgesi.

Gizli anahtarın, `.env` dosyasının veya kişisel bilgilerin ekranda bulunmadığını her görüntüde kontrol et.
