# Canlı DataHub Kurulumu — Acemi Kullanıcı Rehberi

Bu rehber canlı DataHub MCP erişimini ve sınırlı geri yazmayı sentetik yerel metadata üzerinde kanıtlamak içindir. Komutların ne anlama geldiğini bilmen gerekmiyor. Her adımdan sonra bekle ve beklenen sonucu görmeden ilerleme. Bu kanıt, varsayılan fixture ekranındaki etki yolunu canlı-normalize grafik haline getirmez.

## Bu bilgisayardaki mevcut durum

Kaydedilmiş yerel kanıtta aşağıdaki işlemler tamamlandı:

- DataHub yerel olarak kuruldu ve `http://localhost:9002` adresi yanıt verdi.
- Altı sentetik varlık ve beş bağlantı yüklendi.
- Beş sınırlı salt-okunur MCP araç tipi çalıştı; kaydedilmiş sorgu okuması hedef için sıfır gözlemlenen sorgu döndürdü ve exact lineage-path okumaları keşfedilen downstream uçlarını doğruladı.
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
Set-Location "$HOME\.gemini\antigravity\scratch\ContextSeal"
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

## Aşama 5 — Gerekirse DataHub erişim anahtarı oluştur

Bu aşama disposable local quickstart için zorunlu değildir. Aşağıdaki komut sorunsuz çalışıyorsa token üretmeden devam et:

```powershell
& "$env:APPDATA\Python\Python311\Scripts\datahub.exe" init --host http://localhost:8080 --username datahub --password datahub --force
```

Cloud veya token-zorunlu bir DataHub ortamına bağlanıyorsan bu aşamayı uygula.

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
   $HOME\.gemini\antigravity\scratch\ContextSeal
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
    DATAHUB_MCP_TRANSPORT=stdio
   DATAHUB_MCP_COMMAND=uvx
    DATAHUB_MCP_ARGS=["mcp-server-datahub@latest"]
    DATAHUB_GMS_URL=http://localhost:8080
   DATAHUB_GMS_TOKEN=
    DATAHUB_MCP_MUTATIONS_ENABLED=false
    ```

11. Disposable local quickstart kullanıyorsan bu satırı boş bırakabilirsin.
12. Cloud veya token-zorunlu kurulum kullanıyorsan boş değeri silip DataHub’ın verdiği anahtarı yapıştır.
13. `Ctrl+S` ile kaydet.
14. Not Defteri’ni kapat.
15. Geçici Not Defteri dosyasındaki anahtarı sil.

`.env` dosyası Git tarafından yok sayılır ve GitHub’a gönderilmez.

## Aşama 7 — ContextSeal alanlarını DataHub’a ekle

PowerShell’de proje klasörüne gir:

```powershell
Set-Location "$HOME\.gemini\antigravity\scratch\ContextSeal"
```

Sonra:

```powershell
& "$env:APPDATA\Python\Python311\Scripts\datahub.exe" init --host http://localhost:8080 --username datahub --password datahub --force
& "$env:APPDATA\Python\Python311\Scripts\datahub.exe" properties upsert -f config/contextseal-structured-properties.yml
```

Başarılı olursa ContextSeal Status, Risk Score, Passport ID ve Valid Until alanları oluşturulur.

## Aşama 8 — MCP bağlantı aracını kur

1. Yeni PowerShell aç.
2. Şu komutu çalıştır:

   ```powershell
   python -m pip install --user --upgrade uv
   ```

3. Bittiğinde şunu çalıştır:

   ```powershell
   & "$env:APPDATA\Python\Python311\Scripts\uvx.exe" --version
   ```

4. Bir sürüm numarası görmelisin. ContextSeal gerektiğinde resmî `mcp-server-datahub` aracını kendisi başlatacak; ayrı bir pencereyi açık tutman gerekmiyor.

İlk bağlantıda yalnız okuma işlemleri açık tutulacak. Şunları kanıtlamadan yazma işlemini açmayacağız:

- hedef varlık okunuyor,
- bağlantılar okunuyor,
 - sorgu kanıtı okunuyor,
- gizli anahtar hiçbir çıktıda görünmüyor.

## Aşama 8A — W-23 kurtarma yardımcısı

Eğer Docker alanı dolduğu için canlı kanıt yolu bloklandıysa, aşağıdaki yardımcı komut Windows tarafındaki toparlamayı ve mümkün olan geri kalan adımları senin yerine yürütür. Gerekirse yönetici izni istemek için kendini yeniden açar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/recover-w23.ps1
```

Yalnız planı görmek istersen:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/recover-w23.ps1 -PlanOnly
```

Yalnız okuma kanıtını tazelemek istersen:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/recover-w23.ps1 -ReadOnly
```

Tam akışta yardımcı script güvenli VHDX compact işlemini dener, Docker Desktop'ı resmî başlangıç yoluyla yeniden başlatır, yerel DataHub CLI erişimini hazırlar, DataHub quickstart'ı ayağa kaldırır, seed işlemini yapar, `live-datahub-read-evidence.json` dosyasını yeniler ve mümkünse `live-datahub-writeback-evidence.json` dosyasını da tekrar üretir.

## Aşama 9 — Yazma kapısını aç

Bu aşamayı yalnız Copilot “canlı okuma kanıtı tamam” dedikten sonra yap.

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

Başarılı MCP araç sonucu yalnız `isError: false` olduğunda `PASS` sayılır. Hazırlanmış mutation, başarılı write-back değildir; üretim veya müşteri verisi üzerinde işlem yapma.
