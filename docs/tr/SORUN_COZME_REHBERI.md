# Sorun Çözme Rehberi

Bir hata olduğunda aynı komutu art arda çalıştırma. Önce aşağıdaki karşılığı bul. Çözülmezse ekran görüntüsüyle Codex’e bildir.

## Docker “Engine starting” ekranında kalıyor

1. Beş dakika bekle.
2. Docker Desktop’ı kapat.
3. Başlat menüsünden yeniden aç.
4. Yine başlamazsa PowerShell’i yönetici olarak aç ve çalıştır:

   ```powershell
   wsl --shutdown
   ```

5. Docker Desktop’ı yeniden aç.

## “WSL needs updating” görünüyor

PowerShell’i yönetici olarak aç:

```powershell
wsl --update --web-download
```

Kurulum tamamlandıktan sonra bilgisayarı yeniden başlat.

## `gh` komutu bulunamıyor

1. GitHub CLI’nin kurulu olduğunu kontrol et.
2. Codex ve PowerShell’i tamamen kapatıp yeniden aç.
3. Çalıştır:

   ```powershell
   gh --version
   ```

## GitHub TLS veya bağlantı zaman aşımı

1. VPN’i kapat.
2. Tarih ve saatin otomatik olduğunu doğrula.
3. Mümkünse telefon internetini dene.
4. Yeniden çalıştır:

   ```powershell
   gh auth login --hostname github.com --git-protocol https --web
   ```

## `npm` komutu bulunamıyor

Node.js kurulu değildir veya uygulama yeniden başlatılmamıştır. Codex’e bildir; rastgele Node.js sürümü kurma.

## `npm start` sonrasında sayfa açılmıyor

1. PowerShell penceresini kapatmadığını doğrula.
2. Çıktıda şu adrese benzer satır ara:

   ```text
   ContextSeal listening on http://127.0.0.1:4173
   ```

3. Chrome’a tam olarak şunu yaz:

   ```text
   http://127.0.0.1:4173
   ```

4. Başka uygulama aynı adresi kullanıyorsa ekran görüntüsü gönder.

## Canlı mod başlarken `CONTEXTSEAL_OPERATOR_TOKEN` veya `CONTEXTSEAL_ALLOWED_TARGET_URNS` hatası

1. `.env` dosyasını aç.
2. Şu satırların boş olmadığını doğrula:

   ```dotenv
   CONTEXTSEAL_OPERATOR_TOKEN=
   CONTEXTSEAL_ALLOWED_TARGET_URNS=["urn:li:..."]
   ```

3. `CONTEXTSEAL_OPERATOR_TOKEN=` satırına yerelde rastgele uzun bir bearer değer yaz.
4. `CONTEXTSEAL_ALLOWED_TARGET_URNS` tek tırnaklı düz metin değil, köşeli parantezli geçerli JSON dizi olmalıdır.
5. Kaydet ve `npm start` komutunu yeniden çalıştır.

## Canlı API 401 veya 403 dönüyor

1. Canlı modda her istekte `Authorization: Bearer <CONTEXTSEAL_OPERATOR_TOKEN>` başlığının gönderildiğini doğrula.
2. `.env` içindeki token ile istek başlığındaki token aynı olmalıdır.
3. İstekteki hedef URN, `CONTEXTSEAL_ALLOWED_TARGET_URNS` içinde değilse 403 alırsın.

## `uv` veya `uvx` komutu bulunamıyor

PowerShell’de şunu çalıştır:

```powershell
python -m pip install --user --upgrade "acryl-datahub==1.6.0.14" uv
```

Sonra doğrula:

```powershell
uv --version
uvx --version
```

## `npm run validate` kırmızı hata veriyor

Devpost veya video işlemine geçme. PowerShell’deki hatanın başından sonuna ekran görüntüsü al ve Codex’e gönder.

## DataHub sayfası açılmıyor

1. Docker Desktop’ı aç.
2. **Containers** bölümünde DataHub bileşenlerinin çalıştığını kontrol et.
3. PowerShell’de çalıştır:

   ```powershell
   datahub docker check
   ```

4. Hata varsa çıktı gönder.

## DataHub bilgisayarı yavaşlatıyor

DataHub birçok Docker bileşeni çalıştırır. Demo çalışması dışında kapatabilirsin:

```powershell
datahub docker quickstart --stop
```

Komut sürümünde `--stop` desteklenmezse Docker Desktop içinden DataHub grubunun durdurma düğmesine bas. Silme düğmesine basma.

## `.env` dosyası görünmüyor

Windows gizli/uzantılı dosyaları saklıyor olabilir:

1. Dosya Gezgini’ni aç.
2. Üst menüde **Görünüm** seçeneğine bas.
3. **Göster → Dosya adı uzantıları** seçeneğini işaretle.
4. Gerekirse **Gizli öğeler** seçeneğini de işaretle.

## Yanlışlıkla token’ı ekranda gösterdim

1. Kaydı hemen durdur.
2. O video dosyasını kullanma.
3. Token’ı DataHub’dan iptal et.
4. Yeni token oluştur.
5. `.env` dosyasını güncelle.
6. GitHub’a token gönderildiyse hemen Codex’e bildir.

## GitHub Pages boş veya 404

1. GitHub deposunda **Actions** sekmesini aç.
2. **Deploy Judge Demo** çalışmasını bul.
3. Yeşil onay yoksa ekran görüntüsü al.
4. **Settings → Pages** bölümünde kaynak olarak GitHub Actions seçili olmalıdır.
5. Ayar değiştirmeden önce Codex’e bildir.

## Devpost video bağlantısını kabul etmiyor

1. YouTube görünürlüğünün **Public** olduğunu doğrula.
2. Videoyu gizli Chrome penceresinde aç.
3. Adres çubuğundaki tam `youtube.com/watch?...` bağlantısını kopyala.
4. YouTube Studio düzenleme bağlantısını Devpost’a yapıştırma.
