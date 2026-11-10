# Minhas NFS-e

Portal interno simples para **criar** e **consultar** NFS-e Nacional (Emissor Nacional / SEFIN + ADN), com dashboard, API REST (n8n) e arquivos XML/PDF em volume.

## SDK via submodule (não npm público)

Usamos o fork local, não o pacote npm publicado:

- Submodule: [`GabrielRozendo/gerador-nfse-nacional-bun`](https://github.com/GabrielRozendo/gerador-nfse-nacional-bun)
- Dependência: `"nfse-nacional": "file:gerador-nfse-nacional-bun"`

Isso reduz o risco de supply-chain: atualizações só entram quando você sincroniza o submodule e revisa o diff.

```bash
git submodule update --init --recursive
npm install          # roda build:sdk (tsup) no submodule
npm run submodule:update   # puxa remote do fork (revise antes de merge)
```

## O que faz

- Emitir NFS-e via certificado A1
- Histórico local + sync ADN (cooldown 1h)
- Templates parametrizados + duplicar
- Persistir **XML** e **PDF (DANFSe)** em `./files`
- API REST para automação

## PDF oficial vs local

1. `PDF_TRY_OFFICIAL=true` tenta `GET /nfse/{chave}/pdf` na SEFIN (API oficial — **frequentemente suspensa**)
2. Se falhar, gera **DANFSe local** via Puppeteer (HTML → PDF) a partir do XML
3. PDF fica em `files/pdf/{chave}.pdf` e a API devolve o binário

## Segurança do certificado e anti-ban

1. Certificado só via volume/path + senha em env
2. Ambiente padrão = homologação
3. Idempotency-Key obrigatória
4. `verificarDps` antes de reenviar
5. Validação local antes do POST SEFIN
6. ADN sync serial + cooldown ≥ 1h
7. Circuit breaker
8. Healthcheck não chama gov.br

## Setup

```bash
git submodule update --init --recursive
cp .env.example .env
cp /caminho/certificado.pfx ./certs/certificado.pfx
npm install
npm run dev
```

### Docker

```bash
docker compose up -d --build
```

Volumes:

| Host | Container | Uso |
|---|---|---|
| `./data` | `/data` | SQLite |
| `./certs` | `/certs` (ro) | A1 `.pfx` |
| `./files` | `/files` | `xml/` + `pdf/` (fileserver) |

## API

Com `AUTH_ENABLED=true`, use `Authorization: Bearer $API_KEY`.

### PDF / arquivos

```http
GET  /api/v1/notas/{chave}/pdf
POST /api/v1/notas/{chave}/arquivos
```

`GET .../pdf` retorna `application/pdf` (header `X-Pdf-Source: cache|gov|local`).

Exemplo n8n: HTTP Request → Binary → anexar e-mail.

### Emissão mensal (n8n)

```http
POST /api/v1/templates/{TEMPLATE_ID}/emit
Authorization: Bearer SEU_API_KEY
Idempotency-Key: mensal-2026-11
Content-Type: application/json

{
  "params": {
    "competencia": "2026-11-01",
    "valor": 1500,
    "discriminacao": "Mensalidade — novembro/2026",
    "tomadorNome": "CLIENTE LTDA",
    "tomadorDoc": "12345678000199"
  }
}
```

Depois: `GET /api/v1/notas/{chave}/pdf`.

## Checklist homologação → produção

1. `NFSE_AMBIENTE=homologacao`
2. Template + `dryRun: true`
3. Emitir 1 nota de teste
4. Confirmar PDF em `./files/pdf`
5. Só então `producao` + `AUTH_ENABLED=true` se exposto

## Estrutura

```
gerador-nfse-nacional-bun/   # submodule (fork)
src/lib/nfse/                # provider, ADN, PDF, guards
files/xml|pdf/               # artefatos em disco
certs/ data/
```
