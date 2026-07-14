# Canlı yerel DataHub kurulumu — acemi kullanıcı rehberi

Bu isteğe bağlı yol, repository içindeki kaydedilmiş kanıtı kullan-at bir yerel DataHub üzerinde yeniden üretir. Jürinin iki dakikalık fixture yolu için buna gerek yoktur.

## Önce kanıt sınırını bil

- Kullanılan DataHub Core yereldir ve gerektiğinde silinebilen ayrı bir katalog olmalıdır.
- Seed script'i yalnız ContextSeal'e ait sentetik metadata oluşturur; kaynak veri satırı üretmez.
- Kaydedilmiş proof 10 MCP okuması, tek sayfada tam üç alanlı hedef şeması ve altı exact path içerir.
- Hedefin altında altı native lineage varlığı vardır: iki `Dataset`, iki `DataJob`, iki `Dashboard`.
- MLflow scoring öğesi bir `DataJob` metadata kaydıdır. `MLModel` değildir ve model inference çalıştırılmaz.
- Kaydedilmiş canlı `get_dataset_queries` sonucu sıfırdır. Sıfır bir hata değildir ve `LIVE_QUERY_USAGE` bulgusu üretmez.
- Fixture'daki iki sentetik query örneği canlı query kanıtı değildir.
- Bu akış üretim, müşteri kullanımı, güvenlik sertifikası veya performans kanıtı değildir.

## Gereksinimler

- Docker Desktop ve çalışan Docker engine
- Node.js 20 veya daha yeni
- Python 3.11 veya daha yeni
- [`uv` ve `uvx`](https://docs.astral.sh/uv/getting-started/installation/) komutlarının `PATH` üzerinde olması
- DataHub Quickstart için yeterli disk/bellek

ContextSeal yardımcıları `acryl-datahub==1.6.0.14`, resmî açık kaynak MCP çalıştırıcı paketi ise `mcp-server-datahub@0.6.0` sürümüne sabitlenmiştir. Kaydedilmiş handshake ayrıca protocol `2025-03-26` ve `serverInfo` ad/sürüm `datahub`/`3.4.4` bildirir; bunlar paket sürümünden ayrı provenance alanlarıdır.

Mevcut ve değerli bir DataHub kataloğunu bu demo için silme veya üzerine seed etme.

## 1. Proje terminalini doğru klasörde aç

1. Dosya Gezgini'nde `ContextSeal` klasörünü aç.
2. Adres çubuğuna `powershell` yaz.
3. `Enter` tuşuna bas.
4. Şunları kontrol et:

   ```powershell
   node --version
   python --version
   uvx --version
   docker version
   ```

Node çıktısı en az 20, Python çıktısı en az 3.11 olmalıdır. Bir komut bulunamıyorsa [sorun çözme rehberine](SORUN_COZME_REHBERI.md) geç.

## 2. DataHub Core'u başlat

Resmî [DataHub Quickstart](https://docs.datahub.com/) yönergelerini kullan. Tipik temiz kurulum:

```powershell
python -m pip install --upgrade pip wheel setuptools
python -m pip install --upgrade acryl-datahub
datahub docker quickstart
```

İlk indirme uzun sürebilir. İşlem bitince:

- DataHub UI: [http://localhost:9002](http://localhost:9002)
- GMS health/API: [http://localhost:8080](http://localhost:8080)

Quickstart giriş bilgisi isterse yalnız o kurulumun güncel çıktısındaki değeri kullan; tahmin etme ve rehbere credential yazma.

## 3. Yerel ayar dosyasını oluştur

Proje terminalinde:

```powershell
Copy-Item .env.example .env
```

Ayrı bir ContextSeal operator token'ı üret. Aşağıdaki komut değeri ekrana yazdırmaz; yalnız clipboard'a koyar:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$operatorToken = -join ($bytes | ForEach-Object { $_.ToString('x2') })
Set-Clipboard $operatorToken
Write-Host "Yeni ContextSeal operator token clipboard'a kopyalandı."
```

`.env` dosyasını aç:

```powershell
notepad .env
```

Dosyanın ilgili bölümü şu yapıda olmalıdır. Güvenlik nedeniyle bu belgede token değerleri boş bırakılmıştır:

```dotenv
CONTEXTSEAL_MODE=datahub
CONTEXTSEAL_HOST=127.0.0.1
CONTEXTSEAL_OPERATOR_TOKEN=
CONTEXTSEAL_ALLOWED_TARGET_URNS=["urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)"]

DATAHUB_MCP_TRANSPORT=stdio
DATAHUB_MCP_COMMAND=uvx
DATAHUB_MCP_ARGS=["mcp-server-datahub@0.6.0"]
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=
DATAHUB_MCP_MUTATIONS_ENABLED=false
```

Yerel `.env` dosyasında operator satırının `=` işaretinden sonrasına clipboard'daki rastgele değeri yapıştır. Bu değer DataHub veya GitHub token'ı değildir.

DataHub Core kurulumunda token tabanlı kimlik doğrulama devre dışıysa `DATAHUB_GMS_TOKEN` satırını boş bırakmak doğrudur. UI'daki token oluşturma düğmesinin kapalı olması da bu durumda beklenebilir. Kurulumun kimlik doğrulama istiyorsa yalnız yerel `.env` içine least-privilege bir DataHub credential'ı koy. Operator token ile aynı değeri kullanma; ContextSeal aynı değeri başlangıçta reddeder.

`.env` Git tarafından ignore edilir. Yine de `git status --short` çıktısında görünmediğini kontrol et. Dosyayı, içeriğini veya token ekranını paylaşma.

## 4. Sentetik bootstrap planını sertifikalandır ve uygula

`datahub:seed` ve `datahub:properties` varsayılan olarak yalnız read-only
preflight yapar; hiçbir metadata yazmaz. Tam GMS endpoint'ini ve sabit kapsamı
inceler, aynı URN'de iki ContextSeal sahiplik işareti bulunmayan mevcut bir
varlığı conflict sayar ve deterministik bir certification plan hash'i üretir.
Seed planı endpoint'i, 13 olası upsert/cleanup URN'sini ve seed/güvenlik
script'lerinin tüm byte'larını bağlar. Property planı endpoint'i, dört exact
property URN'sini, YAML tanımını ve iki helper script'i bağlar. Bunlardan biri
değişirse hash de değişir ve eski onay kullanılamaz.

Mutation kapısı kapalıyken seed preflight'i çalıştır ve çıktıyı incele:

```powershell
npm run datahub:seed:scope
$seedPreflight = npm run --silent datahub:seed | ConvertFrom-Json
$seedPreflight | Select-Object status, mutationState, endpointBoundary, scopeUrnCount, certificationPlanSha256
if ($seedPreflight.status -ne "PASS" -or $seedPreflight.mutationState -ne "NOT_RUN") {
  throw "Seed preflight read-only olarak geçmedi. Apply yapma."
}
```

Yalnız bu exact planı mevcut PowerShell oturumu için onayla. Runtime mutation
kapısını tek komutluk kısa pencere için aç ve `finally` ile mutlaka kapat:

```powershell
$env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION = "I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
$env:CONTEXTSEAL_SEED_CONFIRMATION = "SEED_CONTEXTSEAL_SYNTHETIC_METADATA_V1"
$env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 = $seedPreflight.certificationPlanSha256
$env:DATAHUB_MCP_MUTATIONS_ENABLED = "true"
try {
  npm run datahub:seed:apply
  if ($LASTEXITCODE -ne 0) { throw "Seed apply başarısız. Körlemesine tekrar deneme." }
}
finally {
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  Remove-Item Env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_SEED_CONFIRMATION -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION -ErrorAction SilentlyContinue
}
```

Structured-property tanımları için ayrı preflight ve ayrı exact onay kullan:

```powershell
npm run datahub:properties:scope
$propertyPreflight = npm run --silent datahub:properties | ConvertFrom-Json
$propertyPreflight | Select-Object status, mutationState, endpointBoundary, scopeUrnCount, certificationPlanSha256
if ($propertyPreflight.status -ne "PASS" -or $propertyPreflight.mutationState -ne "NOT_RUN") {
  throw "Property preflight read-only olarak geçmedi. Apply yapma."
}
$env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION = "I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
$env:CONTEXTSEAL_PROPERTIES_CONFIRMATION = "UPSERT_CONTEXTSEAL_STRUCTURED_PROPERTIES_V1"
$env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 = $propertyPreflight.certificationPlanSha256
$env:DATAHUB_MCP_MUTATIONS_ENABLED = "true"
try {
  npm run datahub:properties:apply
  if ($LASTEXITCODE -ne 0) { throw "Property apply başarısız. Körlemesine tekrar deneme." }
}
finally {
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  Remove-Item Env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_PROPERTIES_CONFIRMATION -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION -ErrorAction SilentlyContinue
}
```

Mevcut property tanımı dosyayla birebir aynıysa üzerine yazılmaz; idempotent
apply bu yüzden dürüstçe `mutationState: NOT_RUN` döndürebilir. İlk bootstrap
için bu hash-bağlı preflight/onay, henüz var olmayan sentetik test kataloğunun
provisioning sertifikasıdır; sonraki şema değişikliği pasaportundan ayrıdır.
İşaretsiz aynı-URN varlığı "ilk kurulum" sayılmaz ve asla overwrite edilmez.
Bağlantı/apply yarıda kesilirse sonucu kısmi kabul et, DataHub'ı incele ve karar
vermeden önce yeniden yalnız read-only preflight çalıştır.
Başarılı apply sonrasında seed helper güncel sahiplik işaretlerini ve cleanup
URN'lerinin yokluğunu; property helper ise dört exact tanımı yeniden okur. Bu
bootstrap read-back'i lineage kanıtı değildir. Tam grafik 5. adımda MCP ile
ayrıca doğrulanmadan şema-değişikliği mutation'ı açılmaz.

Beklenen seed özeti:

- bir Snowflake hedef `Dataset`;
- iki aşağı yönlü Snowflake `Dataset`;
- iki `DataJob`: Airflow dönüşümü ve MLflow scoring metadata kaydı;
- iki `Dashboard`: Looker ve Power BI;
- hedef dışında toplam altı aşağı yönlü lineage varlığı;
- varlıklarda `contextseal_fixture=true` ve `evidence_boundary=synthetic-local` işaretleri.

DataHub'da `gold_customers` araması yap. Hedefi ve lineage grafiğini görebilmelisin.

## 5. Önce yalnız okuma doğrulaması yap

Mutation ayarı bu aşamada kesinlikle `false` kalmalıdır:

```dotenv
DATAHUB_MCP_MUTATIONS_ENABLED=false
```

Sunucuyu başlat:

```powershell
npm start
```

1. [http://127.0.0.1:4173](http://127.0.0.1:4173) adresini aç.
2. **ContextSeal operator token** alanına aynı rastgele değeri yapıştır.
3. **Use for this tab** düğmesine bas. Değer yalnız bu sekmenin belleğinde tutulur; browser storage, run veya evidence içine yazılmaz.
4. **Verify DataHub and analyze** düğmesine bas.
5. Arayüz ancak doğrulama geçince **DATAHUB CONTEXT · VERIFIED** durumuna geçmelidir.
6. Şunları kontrol et:

   - hedef URN allowlist ile aynı;
   - kaynak `customer_email` alanı hedef şemada var;
   - toplam 10 MCP okuması ve tek sayfada tam üç alanlı hedef şeması var;
   - altı aşağı yönlü varlık ve her hedef için tam yol var;
   - native türler iki Dataset, iki DataJob, iki Dashboard;
   - canlı query sayısı `0`;
   - doğrudan istek sonucu `70 / BLOCKED`;
   - ham MCP kanıt hash'i ve `LIVE_DATAHUB_MCP_NORMALIZED` sınırı var;
   - yazma ve read-back durumları `NOT_RUN`.

Token yanlışsa API `401` verir ve arayüz yeniden giriş ister. Hedef allowlist dışında ise analiz başlamadan reddedilir.

Sunucuyu `Ctrl+C` ile durdur.

## 6. Mutation kapısını kısa süreli aç

Bu aşamaya yalnız read-only sonuçlarının tamamı doğruysa geç. `.env` güvenli
varsayılanında kalsın:

```dotenv
DATAHUB_MCP_MUTATIONS_ENABLED=false
```

Kapıyı yalnız bu terminalde ve tek server process'inin ömrü boyunca aç.
Server'ı `Ctrl+C` ile durdurduğunda `finally` override'ı kapatıp temizler:

```powershell
$env:DATAHUB_MCP_MUTATIONS_ENABLED = "true"
try {
  npm start
}
finally {
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  Remove-Item Env:DATAHUB_MCP_MUTATIONS_ENABLED -ErrorAction SilentlyContinue
}
```

Server çalışırken:

1. Operator token'ı tarayıcı alanına yeniden gir; yeni sekmede hafıza boştur.
2. İzinli hedef için **taze** bir analiz oluştur.
3. Risk, yollar ve dört generated artifact'i incele.
4. Reviewer ve note alanlarında yalnız bu güvenli manifest kapsamını onayla.
5. **Approve safe plan** düğmesine bas.
6. Pasaport ID'si, hash'ler ve son geçerlilik zamanını kontrol et.
7. **Execute certified write-back** düğmesine yalnız **bir kez** bas.
8. Üç mutation receipt'inin ayrı ayrı `PASS` olduğunu doğrula:

   - `add_structured_properties`
   - append modunda `update_description`
   - `save_document`

9. Durable read-back durumunun ayrıca `PASS` olduğunu doğrula.

ContextSeal mutation çağrılarını tekrar denemez. Aynı pasaport üzerindeki tekrar, eşzamanlı istek veya superseded run engellenir. Kısmi/başarısız sonuçta düğmeye tekrar basma; receipt'ler kalıcı run durumunda saklanır ve önce incelenmelidir.

Read-only read-back, DataHub indeksleme gecikmesi için sınırlı sayıda tekrar yapabilir. Bu, mutation'ın yeniden çağrıldığı anlamına gelmez.

## 7. DataHub'da kalıcı sonucu incele

Sentetik hedefte şunları kontrol et:

- ContextSeal Status
- ContextSeal Risk Score
- ContextSeal Passport ID
- ContextSeal Valid Until
- açıklamaya eklenen passport referansı
- ilgili decision document

Belge kanıtı, `save_document` receipt'inin döndürdüğü exact URN/title ile pasaport ID, manifest hash ve hedef URN literal bağlarını arar. Tam document body'nin byte-for-byte eşit olduğunu iddia etmez.

## 8. Mutation kapısını hemen kapat ve kanıtı dışa aktar

Önce sunucuyu `Ctrl+C` ile durdur. Kalıcı ayarın hâlâ güvenli olduğunu ve shell
override'ının kalmadığını doğrula:

```powershell
Remove-Item Env:DATAHUB_MCP_MUTATIONS_ENABLED -ErrorAction SilentlyContinue
Select-String -Path .env -Pattern '^DATAHUB_MCP_MUTATIONS_ENABLED=false$'
```

Sonra:

```powershell
npm run datahub:capture
npm run datahub:export
npm run evidence:check
npm run validate
```

Script'ler şu durumlarda export'u reddeder:

- mutation kapısı hâlâ açıksa;
- sentetik sahiplik işaretleri yoksa;
- ham ve normalize kanıt birbirini tutmuyorsa;
- tam üç başarılı mutation receipt'i yoksa;
- durable read-back `PASS` değilse;
- request, target, policy, passport, artifact veya hash drift'i varsa.

## 9. Güvenli sıfırlama

- `.env` içinde mutation ayarının `false` olduğunu bir kez daha kontrol et.
- PowerShell değişkenini ve clipboard'u temizle:

  ```powershell
  $operatorToken = $null
  Set-Clipboard ""
  ```

- Bütün bootstrap onaylarını ve remote istisnaları terminalden temizle:

  ```powershell
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  $bootstrapVariables = @(
    "CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION",
    "CONTEXTSEAL_SEED_CONFIRMATION",
    "CONTEXTSEAL_PROPERTIES_CONFIRMATION",
    "CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256",
    "CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP",
    "CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS",
    "CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
    "CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS"
  )
  $bootstrapVariables | ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
  ```

- `.env` dosyasının untracked kaldığını doğrula.
- Ekran paylaşmadan önce canlı sekmeleri kapat.
- Kanıt ekranında token, `.env`, terminal, browser profile veya kişisel sekme bulunmadığını kontrol et.

## İstisnai remote bootstrap

Yeniden üretilebilir kanıt loopback GMS kullanır; önerilen sınır budur. Read-only
preflight remote bir HTTPS GMS'yi inceleyebilir. `--apply` ise ayrıca yalnız bir
exact canonical endpoint ve script'in ürettiği eksiksiz URN kapsamını ister:

```powershell
# Bu placeholder'ı ortamındaki exact HTTPS DATAHUB_GMS_URL ile değiştir.
$exactRemoteGms = "https://YOUR_GMS_HOST/api/gms"
$seedScope = npm run --silent datahub:seed:scope | ConvertFrom-Json
$propertyScope = npm run --silent datahub:properties:scope | ConvertFrom-Json
$env:CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP = "I_ACCEPT_REMOTE_DATAHUB_BOOTSTRAP_RISK"
$env:CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS = ConvertTo-Json -InputObject @($exactRemoteGms) -Compress
$env:CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS = $seedScope | ConvertTo-Json -Compress
$env:CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS = $propertyScope | ConvertTo-Json -Compress
```

Sonra 4. adımdaki her read-only preflight'i yeniden çalıştır ve yeni plan
hash'ini ayrıca onayla. URL farkı, remote HTTP, eksik/fazla URN, wildcard veya
eksik confirmation varsa DataHub client oluşturulmadan işlem reddedilir.
Least-privilege service identity kullan. Bu repository remote bootstrap
çalıştırıldığını veya doğrulandığını iddia etmez.

## DataHub Cloud seçeneği

ContextSeal streamable HTTP MCP'yi de destekler:

```dotenv
DATAHUB_MCP_TRANSPORT=http
DATAHUB_MCP_URL=https://YOUR_TENANT.acryl.io/integrations/ai/mcp/
DATAHUB_GMS_TOKEN=
```

Yalnız HTTPS, scoped service account ve exact target allowlist kullan. Bu repository DataHub Cloud kanıtı iddia etmez.

Resmî kaynaklar:

- [DataHub MCP](https://docs.datahub.com/docs/features/feature-guides/mcp)
- [Açık kaynak MCP sunucusu v0.6.0](https://github.com/acryldata/mcp-server-datahub/releases/tag/v0.6.0)
- [DataHub Quickstart](https://docs.datahub.com/)
