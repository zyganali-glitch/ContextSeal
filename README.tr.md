# ContextSeal — Türkçe Açıklama

> **Her veri değişikliği güvenle değil, kanıtla yayınlansın.**

ContextSeal; riskli bir kolon değişikliğini DataHub bağlamıyla inceleyen, etkilenecek varlıkları gösteren, güvenli taşıma dosyaları üreten, insan onayı isteyen ve son kararı tekrar DataHub’a kaydeden bir veri değişikliği güvenlik sistemidir.

**[Kurulum gerektirmeyen güvenli gösterimi aç](https://zyganali-glitch.github.io/ContextSeal/)** · [English README](README.md)

**Final başvuru kaydı**

- Canlı demo: <https://zyganali-glitch.github.io/ContextSeal/>
- Final demo videosu: <https://www.youtube.com/watch?v=ckhx5X1QQwo> (gerçek düzenlenmiş süre: yaklaşık 2:05)
- Devpost başvurusu: <https://devpost.com/software/contextseal>
- Repository: <https://github.com/zyganali-glitch/ContextSeal>

## Neden güçlü görünüyor?

- Küçük görünen riskli bir yeniden adlandırma merge olmadan önce durduruluyor.
- DataHub bağlamı aşağı yöndeki etkiyi ve isimlendirilmiş risk bulgularını açıkça gösteriyor.
- İsteğe bağlı AI paneli görünür, sınırlı ve runtime yoksa bunu dürüstçe söylüyor.
- ContextSeal yıkıcı değişikliği değil, güvenli geçiş paketi ve incelemeye hazır PR paketi üretir.
- İnsan onayı sonucunda oluşan pasaport, sonraki insan veya ajan tarafından miras alınabilir.

## Final demo videosunda ne görülüyor?

Gerçek düzenlenmiş final video yaklaşık 2:05 sürüyor ve şunları gösteriyor:

1. Bloke edilen istek ve aşağı yöndeki etki alanı.
2. Deterministik `80 / BLOCKED` kararı ve isimli bulgular.
3. Açıklama amaçlı AI sınırı ve kayıtlı/yerel AI ayrımı.
4. Üretilen beş dosyalık güvenli geçiş paketi ve inceleme handoff'u.
5. Sona doğru insan onayı, pasaport ve fixture write-back hazırlığı.

## Ne problemi çözüyor?

Bir veri tablosundaki kolon yeniden adlandırıldığında yalnızca o tablo etkilenmez. Uzak bir gösterge paneli, başka ekibin veri hattı veya çalışan bir makine öğrenmesi modeli kırılabilir. Normal kod kontrolleri bu bağlantıların tamamını göremez.

ContextSeal DataHub’dan şu bilgileri toplar:

- tablonun şeması,
- aşağı yöndeki bağlantıları,
- sorumlu ekipleri,
- gizlilik ve hassas veri işaretlerini,
- kalite kontrollerini,
- açık olay kayıtlarını,
- fixture bağlamındaki sorgu kanıtlarını; canlı MCP sorgu okuması ise ayrı ham kanıt olarak tutulur.

Sonra değişikliği doğrudan yapmak yerine güvenli bir geçiş planı üretir. Örneğin eski kolonu hemen silmek yerine yeni kolonu ekler, veriyi taşır, kullanan sistemlerin geçmesini bekler ve eski kolonu daha sonraki ayrı bir değişiklikte kaldırır.

## Güvenli denemeyi çalıştırma

PowerShell’de proje klasörüne gir:

```powershell
Set-Location "$HOME\.gemini\antigravity\scratch\ContextSeal"
npm install
npm run validate
npm start
```

Tarayıcıda şu adresi aç:

```text
http://127.0.0.1:4173
```

Ardından sırasıyla:

1. **Analyze change** düğmesine bas.
2. Risk puanını, etkilenen varlıkları, fixture etki yollarını ve Local AI Copilot panelindeki `NOT_ENABLED` durumunu incele.
3. Üretilen güvenli geçiş dosyalarını incele.
4. **Approve safe scope** düğmesine bas.
5. Oluşan pasaport numarasını gör.
6. **Prepare write-back** düğmesine bas.

Bu güvenli deneme modunda gerçek DataHub değiştirilmez. Varsayılan ekran DataHub biçimine uyarlanmış sentetik bağlam kullanır; canlı MCP kanıtı ayrı rehberde gösterilir. Ekranda bunun açıkça yazması bilinçli bir güvenlik özelliğidir.

## İsteğe bağlı yerel AI yardımcısı

Repo artık isteğe bağlı bir yerel Ollama bağdaştırıcısı, görünür bir Local AI Copilot paneli ve incelenebilir AI girdi/çıktı artefaktları içeriyor. Deterministik karar önce hesaplanır. AI kapalıysa veya Ollama yoksa, ContextSeal uydurma metin üretmek yerine `NOT_ENABLED` ya da `UNAVAILABLE` durumu kaydeder.

```powershell
npm run ai:probe
```

Tam sözleşme için [AI Runtime Decision](docs/AI_RUNTIME_DECISION.md) dosyasına bak.

Kayıtlı AI artefaktları:

- `examples/outputs/generated/ai/contextseal-ai-input.json`
- `examples/outputs/generated/ai/contextseal-ai-output.json`
- `examples/outputs/generated/ai/contextseal-ai-output.md`
- `examples/outputs/proofs/ollama-ai-proof.json`

Deterministik demo artefaktları Ollama olmadan tekrarlanabilir kalır. Ayrı `examples/outputs/proofs/ollama-ai-proof.json` dosyası, GitHub Pages yüzeyinde `RECORDED LOCAL OLLAMA PROOF` etiketiyle gösterilen kalıcı yerel-model `PASS` kaydıdır.

## Canlı DataHub modu sözleşmesi

Canlı modda `.env` dosyasında en az şu satırlar bulunmalıdır:

```dotenv
CONTEXTSEAL_MODE=datahub
DATAHUB_MCP_TRANSPORT=stdio
DATAHUB_MCP_COMMAND=uvx
DATAHUB_MCP_ARGS=["mcp-server-datahub@0.6.0"]
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=your-local-token
DATAHUB_MCP_MUTATIONS_ENABLED=false
CONTEXTSEAL_OPERATOR_TOKEN=<generate-a-random-token>
CONTEXTSEAL_ALLOWED_TARGET_URNS=["urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)"]
```

`CONTEXTSEAL_MODE=datahub` altında canlı API ancak `CONTEXTSEAL_OPERATOR_TOKEN` ve boş olmayan JSON `CONTEXTSEAL_ALLOWED_TARGET_URNS` allowlist ile açılır. Her canlı `POST` isteği `Authorization: Bearer <CONTEXTSEAL_OPERATOR_TOKEN>` başlığını göndermeli ve istek hedefi allowlist içinde yer almalıdır.

## Üretilen paket ve PR kanıtı

`npm run validate`, üretilen dosyaları yeniler; manifest-bağlı yerel sandbox kontrolünü ve token gerektirmeyen PR paketi üretimini çalıştırır. Sandbox, paketin hash ve grounding sözleşmesine uyduğunu kanıtlar; üretim veri ambarında SQL çalıştırıldığını iddia etmez.

```powershell
npm run sandbox
npm run pr:bundle
npm run pr:draft -- --dry-run
```

Son komut yalnız GitHub taslak PR isteğini hazırlar. Gerçek PR oluşturma, var olan bir dal ve `GITHUB_TOKEN` gerektiren açık bir işlemdir; dış inceleme veya merge kanıtı değildir.

## Senin için hazırlanmış ayrıntılı rehberler

- [Önce yapman gerekenler](docs/tr/BENIM_YAPMAM_GEREKENLER.md)
- [DataHub canlı bağlantı rehberi](docs/tr/CANLI_DATAHUB_KURULUMU.md)
- [Devpost başvuru rehberi](docs/tr/DEVPOST_BASVURU_REHBERI.md)
- [Demo videosu çekim rehberi](docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md)
- [Sorun çözme rehberi](docs/tr/SORUN_COZME_REHBERI.md)

## Dürüstlük sınırı

- `PASS`: Kontrol gerçekten çalıştı ve geçti.
- `WARN`: İncelenmesi gereken durum var.
- `FAIL`: Kontrol çalıştı ve başarısız oldu.
- `NOT_RUN`: Kontrol çalıştırılmadı.
- `STALE`: Kullanılan bağlam fazla eski.
- `FIXTURE`: Sonuç, yarışma için hazırlanmış yapay örnekten geldi.

ContextSeal çalışmayan bir işlemi çalışmış gibi göstermez.
