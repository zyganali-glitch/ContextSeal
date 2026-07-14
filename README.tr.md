# ContextSeal — Türkçe açıklama

> **Her veri değişikliği güvenle değil, kanıtla yayınlansın.**

ContextSeal, riskli şema değişiklikleri için DataHub tabanlı bir sertifikasyon ajanıdır. DataHub bağlamını okur, aşağı yöndeki etki yollarını çıkarır, güvensiz isteği deterministik kurallarla engeller, geri alınabilir bir dbt geçiş paketi üretir, kapsamı açık insan onayı ister, kararı DataHub'a yazar ve kalıcı sonucu tekrar okuyarak doğrular.

**[Kurulum gerektirmeyen fixture gösterimini aç](https://zyganali-glitch.github.io/ContextSeal/)** · **[İki dakikalık jüri yolu](docs/JUDGE_TEST_PATH.md)** · [English README](README.md)

Bu proje [Build with DataHub: The Agent Hackathon](https://datahub.devpost.com/) için temiz odada geliştirildi.

## İki dakikada yerel deneme

Gereksinim: Node.js 20 veya daha yeni bir sürüm. Bu yol için DataHub veya token gerekmez.

Proje klasörünü Dosya Gezgini'nde aç. Adres çubuğuna `powershell` yazıp `Enter` tuşuna bas; ardından:

```powershell
npm install
npm run validate
npm start
```

[http://127.0.0.1:4173](http://127.0.0.1:4173) adresini aç ve şu sırayı izle:

1. **Run local certification** düğmesine bas.
2. Doğrudan `customer_email → contact_email` isteğinin `80` risk puanıyla `BLOCKED` olduğunu gör.
3. Beş aşağı yönlü fixture varlığını ve tam yollarını incele; en derin fixture yolu dört adımdır.
4. İki sorgu işaretinin açıkça sentetik fixture verisi olduğunu doğrula.
5. dbt modeli, YAML testleri, ayrı rollback ve etkilenen sahipler özetini önizle.
6. **Approve safe plan** ile yalnız güvenli expand–migrate–contract kapsamını onayla.
7. `csp_...` pasaportunu, manifest/context hash'lerini ve geçerlilik zamanını incele.
8. **Prepare protected operations** düğmesine bas; üç DataHub işleminin de fixture modunda `NOT_RUN` kaldığını doğrula.

Bu yol gerçek ContextSeal API'sini, durum makinesini, risk motorunu, dosya üretimini, onayı ve mutation sınırını çalıştırır. Canlı DataHub, üretim verisi, warehouse SQL çalıştırması veya müşteri etkisi kanıtlamaz.

## Üç dürüst ürün yüzeyi

| Yüzey | Ne çalışır? | Kanıt sınırı |
| --- | --- | --- |
| GitHub Pages | Kaydedilmiş demo çıktısını oynatır | Backend yoktur; tarihsel `FIXTURE` gösterimidir |
| Yerel fixture | Gerçek uygulama ve API, sentetik bağlamla çalışır | DataHub okuma/yazma işlemleri `NOT_RUN` |
| DataHub modu | Resmî MCP okumaları, deterministik analiz, kapılı yazma ve read-back | ContextSeal'e ait sentetik metadata içeren kullan-at yerel DataHub kanıtı veya operatör ortamı |

Arayüz, yalnız “DataHub için ayarlandı” diye canlı kanıt iddia etmez. `LIVE_DATAHUB_MCP_NORMALIZED` bağlamı, ham kanıt hash'i ve `PASS` bağlam kontrolü birlikte gerekir.

## Neden bir ajan?

ContextSeal sohbet botu değildir. Bir değişiklik niyeti verildiğinde:

- izinli DataHub MCP araçlarını seçer;
- keşfedilen her aşağı yönlü hedef için tam yol ister;
- ham yanıtları hash'ler ve normalize edilmiş bağlamı yeniden üretir;
- sürümlü politikayla açıklanabilir risk kararı verir;
- güvenli ve geri alınabilir teslim dosyaları üretir;
- kapsamı belli insan yetkisi sınırında durur;
- yalnız bağımsız mutation kapısı açıksa onaylı dış işlemi yapar;
- DataHub'da kalıcı olan sonucu ayrıca doğrular.

```text
bağlamı oku → karar ver → güvenli işi üret → insan onayı/ret
             → pasaport → DataHub'a yaz → read-back doğrula
```

Deterministik doğrulama otoritedir. Gelecekte bir model açıklama üretebilir; kanıtı veya politika kararını değiştiremez.

## Canlı yerel DataHub kanıtının gerçek kapsamı

Depodaki kaydedilmiş canlı kanıt, yalnız ContextSeal'e ait sentetik metadata içeren kullan-at bir DataHub Core üzerinde üretildi:

- çalıştırıcı paket `mcp-server-datahub@0.6.0` sürümüne sabittir; kaydedilmiş MCP handshake ayrıca protocol `2025-03-26` ve `serverInfo` `datahub`/`3.4.4` bildirir; bunlar aynı sürüm alanı değildir;
- hedefin aşağısında altı yerel varlık vardır;
- bunlar iki `Dataset`, iki `DataJob` ve iki `Dashboard` varlığıdır;
- güncel kanıt 10 MCP okuması, tek sayfada üç alanlı tam hedef şeması ve altı hedefe ait altı exact path içerir;
- MLflow scoring varlığı bir `DataJob` metadata kaydıdır; `MLModel` değildir ve inference çalıştırıldığı iddia edilmez;
- canlı `get_dataset_queries` çağrısı sıfır kayıt döndürmüştür; ContextSeal sıfırı dürüstçe sıfır olarak korur;
- doğrudan istek deterministik olarak `70 / BLOCKED` kalmış; onaylanan güvenli alternatif tam üç `PASS` mutation receipt'i ve ayrıca `PASS` durable read-back üretmiştir;
- fixture içindeki iki sentetik sorgu örneği canlı sorgu kanıtı değildir;
- kaynak veri satırı, üretim verisi veya müşteri verisi kullanılmamıştır.

İki kanıt yüzeyindeki ML etkisi bilinçli olarak farklı modellenir: aşağı yönde beş varlık içeren fixture, deterministik jüri hikâyesi için açıkça sentetik bir `ML_MODEL` düğümü içerir; canlı yerel seed ise MLflow scoring metadata'sını native `DataJob` olarak temsil eder ve inference çalıştırıldığı iddiasında bulunmaz. Bu iki yüzeyin sayıları ve varlık türleri birbirine karıştırılmaz.

`examples/outputs/generated/` altındaki dört fiziksel dosya fixture run'ına aittir. Canlı yerel run'ın ayrı dört artifact içeriği ve hash'i `live-datahub-writeback-evidence.json` içinde bağlıdır; fixture risk/sorgu/varlık türü gerçekleri canlı run'a aktarılmaz.

Canlı kurulum ve yeniden üretim için [acemi kullanıcı rehberini](docs/tr/CANLI_DATAHUB_KURULUMU.md) izle.

## Güvenlik kapıları

DataHub modu başlamadan önce iki bağımsız ayar zorunludur:

- DataHub credential'ından farklı, rastgele bir ContextSeal operator token'ı;
- yalnız izin verilen hedefleri içeren tam `CONTEXTSEAL_ALLOWED_TARGET_URNS` listesi.

Tarayıcıdaki operator token yalnız açık sekmenin belleğinde tutulur; run, kanıt dosyası veya browser storage içine yazılmaz. Yazma için ayrıca canlı kanıt, güncel ve onaylı pasaport, değişmemiş politika/dosyalar, replay veya superseded durumunun bulunmaması ve `DATAHUB_MCP_MUTATIONS_ENABLED=true` gerekir.

Mutation çağrıları tekrar denenmez. Yalnız eventual consistency için read-only doğrulama sınırlı sayıda tekrar edilebilir. Canlı kanıt tamamlanınca mutation ayarı tekrar `false` yapılır.

Bootstrap yardımcıları da fail-closed çalışır. Aşağıdaki varsayılan komutlar
yalnız read-only preflight yapar ve `mutationState: NOT_RUN` bırakır:

```powershell
npm run datahub:seed
npm run datahub:properties
```

Yazma yapan `datahub:seed:apply` ve `datahub:properties:apply` komutlarının her
biri; en son preflight'in exact plan hash'ini, generic ve işlem-özel terminal
onayını ve yalnız o komut süresince `DATAHUB_MCP_MUTATIONS_ENABLED=true`
olmasını ister. Helper'lar varsayılan olarak yalnız loopback GMS kabul eder,
işaretsiz aynı-URN varlığını overwrite etmez ve remote bootstrap için ayrıca
exact HTTPS endpoint ile eksiksiz URN allowlist ister. Mutation kapısını apply
biter bitmez yeniden `false` yap. Kopyalanacak güvenli PowerShell akışı
[canlı kurulum rehberindedir](docs/tr/CANLI_DATAHUB_KURULUMU.md).

## Kanıt durumları

| Durum | Tam anlamı |
| --- | --- |
| `PASS` | Adı verilen kontrol veya işlem çalıştı ve başarı koşulu doğrulandı |
| `WARN` | Kanıt var, fakat eksik veya insan incelemesi gerekiyor |
| `FAIL` | Kontrol çalıştı ve başarı koşulu karşılanmadı |
| `NOT_RUN` | Kontrol veya işlem çalışmadı; hazırlanmış payload da bu durumda kalır |
| `STALE` | Kanıt veya sertifika aktif tazelik süresini aştı |
| `FIXTURE` | Sonuç deterministik sentetik fixture'dan geldi |

Bir mutation receipt'inin `PASS` olması, kalıcı read-back de `PASS` olmadıkça tam doğrulama değildir.

## Doğrulama

```powershell
npm run validate
```

Bu komut repository/link/credential kontrollerini, kaydedilmiş kanıtın yapısal doğrulamasını, Node testlerini, deterministik demo kontrolünü ve gerçek bir fixture sunucu smoke akışını çalıştırır. CI aynı akışı Node 20 ve 24 üzerinde tekrarlar ve container'ı smoke-test eder.

CI ayrıca bootstrap URL, confirmation, exact kapsam, sahiplik ve contract-hash
kapıları için Python 3.11 üzerinde `npm run datahub:safety:test` çalıştırır. Bu
standard-library suite, Node-only jüri `validate` yoluna Python bağımlılığı
eklememek için ayrı tutulur.

## Türkçe adım adım belgeler

- [Benim yapmam gerekenler](docs/tr/BENIM_YAPMAM_GEREKENLER.md)
- [Canlı DataHub kurulumu](docs/tr/CANLI_DATAHUB_KURULUMU.md)
- [Demo videosu çekim rehberi](docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md)
- [Devpost başvuru rehberi](docs/tr/DEVPOST_BASVURU_REHBERI.md)
- [Sorun çözme rehberi](docs/tr/SORUN_COZME_REHBERI.md)

Başvuruya yapıştırılacak nihai metin Türkçe rehber değil, [İngilizce Devpost metnidir](docs/DEVPOST_SUBMISSION.md). Video da [İngilizce kesin anlatım](docs/DEMO_SCRIPT.md) ve [shot list](docs/VIDEO_SHOT_LIST.md) ile aynı kalmalıdır.

## Dürüst sınırlamalar

ContextSeal bir hackathon prototipidir. Warehouse SQL çalıştırdığını, kodu birleştirip dağıttığını, DataHub lineage'ının eksiksiz olduğunu, üretime hazır veya güvenlik sertifikalı olduğunu, müşteri kullanımını ya da ölçülmüş olay azalmasını iddia etmez. Tam document body byte eşitliği yerine, `save_document` receipt'inin döndürdüğü tam belge URN/title'ı ve pasaport, manifest, hedef literal bağlarını doğrular.

Apache License 2.0. Ayrıntılar için [LICENSE](LICENSE).
