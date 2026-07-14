# Benim Yapmam Gerekenler

Bu belge proje sahibinin yapması gereken işleri, yapılma sırasına göre anlatır. Kod yazman veya teknik karar vermen gerekmiyor. Bir adımda hata görürsen sonraki adıma geçme; ekran görüntüsü al ve Codex’e gönder.

## Şu anda tamamlananlar

- [x] GitHub CLI kuruldu.
- [x] GitHub hesabı bağlandı.
- [x] Docker Desktop kuruldu.
- [x] WSL güncellendi.
- [x] Docker motoru çalışıyor.
- [x] GitHub’da herkese açık `ContextSeal` deposu açıldı.
- [x] Yerel ContextSeal klasörü oluşturuldu.
- [x] Yerel DataHub kuruldu ve sağlık kontrolü geçti.
- [x] Sentetik ContextSeal verileri DataHub'a yüklendi.
- [x] Canlı MCP okuma ve sınırlı geri yazma kanıtı oluşturuldu.

## Senin yapacağın işler — kısa liste

1. Devpost yarışmasına katıl.
2. Yerel uygulamanın açıldığını birlikte doğrula.
3. Hazır DataHub kanıt ekranlarını kontrol et.
4. Son canlı gösterim çalışmasını aç ve ekran görüntülerini al.
5. Proje için kısa bir kullanıcı denemesi yaptır.
6. Demo videosunu rehbere göre çek.
7. Videoyu YouTube’a yükle.
8. Devpost başvurusunu taslak olarak doldur.
9. Son kontrol listesini tamamla.
10. Başvuruyu son tarihten önce gönder.

## 1. Devpost yarışmasına katıl

Bu işlem başvurunun oluşturulabilmesi için zorunludur.

1. Chrome’u aç.
2. Adres çubuğuna şunu yapıştır:

   ```text
   https://datahub.devpost.com/
   ```

3. Sayfada **Join hackathon** yazan düğmeye bas.
4. Devpost hesabın varsa giriş yap. Yoksa ücretsiz hesap oluştur.
5. Hesap oluştururken kullandığın e-posta adresinin gelen kutusunu kontrol et ve doğrulama bağlantısına bas.
6. Yarışma sayfasına geri dön.
7. Katıldığını belirten bir mesaj veya proje oluşturma seçeneği görmelisin.
8. Bu aşamada başvuruyu gönderme. Yalnız yarışmaya katıl.

Tamamlandığında ekran görüntüsü al.

## 2. GitHub deposunun herkese açık olduğunu kontrol et

1. Chrome’da şu adresi aç:

   ```text
   https://github.com/zyganali-glitch/ContextSeal
   ```

2. Repo adının yanında **Public** yazdığını doğrula.
3. Sağ taraftaki **About** bölümünde dişli işaretine bas.
4. Açıklama alanına daha sonra şu metni koyacağız:

   ```text
   Graph-backed certification for high-risk data changes, powered by DataHub MCP.
   ```

5. Website alanına şu canlı gösterim bağlantısını yapıştır:

   ```text
   https://zyganali-glitch.github.io/ContextSeal/
   ```
6. **Releases**, **Packages** ve **Deployments** kutularına dokunma.

## 3. Uygulamayı yerelde doğrula

Codex geliştirmeyi tamamlayıp sana “yerel denemeye hazır” dediğinde:

1. Docker Desktop’ın açık olduğunu doğrula.
2. Başlat menüsünü aç.
3. `PowerShell` yaz ve normal şekilde aç. Yönetici olarak açmana gerek yok.
4. Şu komutu yapıştır:

   ```powershell
   cd "C:\Users\ASUS 6410\.gemini\antigravity\scratch\ContextSeal"
   ```

5. `Enter` tuşuna bas.
6. Ardından:

   ```powershell
   npm install
   ```

7. İşlem bittiğinde:

   ```powershell
   npm run validate
   ```

8. Çıktının sonunda `PASS` ifadeleri görmelisin. Kırmızı hata varsa devam etme.
9. Sonra:

   ```powershell
   npm start
   ```

10. PowerShell penceresini kapatma.
11. Chrome’u aç ve şu adresi yaz:

    ```text
    http://127.0.0.1:4173
    ```

12. ContextSeal ana ekranı görünmelidir.

## 4. Canlı DataHub kanıtı

Bu bölüm yarışmadaki en önemli kullanıcı görevidir. Ayrıntılar [Canlı DataHub Kurulumu](CANLI_DATAHUB_KURULUMU.md) belgesindedir. Bu işi yalnız yapmaya çalışma; her ekranı Codex ile birlikte ilerlet.

Canlı kanıt tamamlandığında elimizde şunlar olmalı:

- DataHub ana sayfasının ekran görüntüsü,
- hedef veri varlığının ekran görüntüsü,
- ContextSeal canlı mod rozeti,
- gerçek lineage sonucu,
- onay ekranı,
- DataHub’a eklenen ContextSeal alanları,
- DataHub’a kaydedilen Change Passport belgesi,
- gizli anahtar içermeyen çalışma kayıt dosyası.

## 5. Basit kullanıcı denemesi

Yarışma anlatısını güçlendirmek için bir arkadaşından veya tanıdığından beş dakikalık deneme iste.

1. Kişiye kodu anlatma.
2. Yalnız şu görevi ver:

   > “Bu ekranda bir kolon değişikliğinin neden tehlikeli olduğunu ve güvenli planın ne olduğunu bulmaya çalış.”

3. Nerede zorlandığını izle.
4. Şu üç soruyu sor:

   - Değişikliğin riskli olduğunu anlayabildin mi?
   - Hangi sistemlerin etkileneceğini görebildin mi?
   - Onayladığın şeyin doğrudan silme değil, güvenli geçiş olduğunu anladın mı?

5. Kişinin adını, e-posta adresini veya özel bilgisini kaydetme.
6. Yalnız anonim kısa not tut:

   ```text
   Deneme tarihi:
   Kişinin teknik seviyesi: teknik değil / başlangıç / deneyimli
   Anlaşılmayan bölüm:
   Yapılan iyileştirme:
   ```

7. Gerçek kullanıcı sayısı veya başarı yüzdesi uydurma.

## 6. Yarışma takvimi

- Son başvuru: 10 Ağustos 2026, 17:00 ABD Doğu saati.
- İstanbul karşılığı: 11 Ağustos 2026, 00:00.
- Güvenli hedefimiz: her şeyi 8 Ağustos akşamına kadar bitirmek.
- 9 Ağustos: yalnız video, bağlantı ve yazım kontrolü.
- 10 Ağustos: yedek gün. Yeni özellik eklenmeyecek.

## 7. Son gönderimden önce asla yapma

- Gizli anahtarı GitHub’a yükleme.
- DataHub token’ını ekran görüntüsünde gösterme.
- Çalıştırılmamış işlemi çalışmış gibi anlatma.
- Ücretli araç satın alma.
- Demo videosuna telifli müzik ekleme.
- Son gün yeni büyük özellik isteme.
- Devpost’taki **Submit** düğmesine son kontrol yapılmadan basma.
