# Minhas NFS-e

> **Vibe coded.** Projeto simples, criado originalmente para uso pessoal: emitir e consultar NFS-e Nacional com templates + automação via n8n. Não é um produto SaaS, ERP ou contabilidade completa — é uma ferramenta interna direta ao ponto.

Portal (dashboard + API) para **Create/Read** de NFS-e no **Emissor Nacional** (SEFIN/ADN), com certificado A1, templates parametrizados e arquivos XML/PDF em volume Docker.

## Para que serve

- Emitir nota pelo portal ou pela API
- Guardar histórico local + sync ADN (com cooldown)
- Templates por cliente (mesmo CNPJ) com campos amigáveis: **valor**, **competência**, **descrição**
- Agendar no n8n: `POST /templates/{id}/emit` com esses params
- Baixar PDF (DANFSe local; tenta oficial se habilitado)

## Aviso

Uso por conta e risco. Valide sempre em **homologação** antes de produção. Respeite os limites da API gov.br (idempotência, sem polling agressivo). Revise o submodule do SDK antes de atualizar.

## SDK via submodule (não npm público)

```text
gerador-nfse-nacional-bun/  → fork próprio
"nfse-nacional": "file:gerador-nfse-nacional-bun"
```

```bash
git submodule update --init --recursive
npm install
```

## Setup

```bash
cp .env.example .env
cp /caminho/certificado.pfx ./certs/certificado.pfx
npm install
npm run dev
```

Docker:

```bash
docker compose up -d --build
```

Volumes: `./data` (SQLite), `./certs` (A1), `./files` (xml/pdf).

## Templates (CRUD)

No dashboard (**Templates**): criar / editar / excluir com formulário — sem JSON na cara.

1. Cadastre o **tomador** (CNPJ fixo) e o **serviço**
2. Defina parâmetros variáveis (padrão: data, valor, descrição)
3. Emita no painel ou no n8n só passando os params

### n8n (mensal)

```http
POST /api/v1/templates/{TEMPLATE_ID}/emit
Authorization: Bearer SEU_API_KEY
Idempotency-Key: mensal-2026-11
Content-Type: application/json

{
  "params": {
    "competencia": "2026-11-01",
    "valor": 1500,
    "discriminacao": "Mensalidade — novembro/2026"
  }
}
```

PDF depois: `GET /api/v1/notas/{chave}/pdf`

## API rápida

| Método | Rota | Uso |
|---|---|---|
| GET/POST | `/api/v1/notas` | listar / emitir |
| GET | `/api/v1/notas/{chave}/pdf` | PDF |
| GET/POST/PATCH/DELETE | `/api/v1/templates`… | CRUD templates |
| POST | `/api/v1/templates/{id}/emit` | emitir por template |
| POST | `/api/v1/adn/sync` | sync ADN (cooldown 1h) |

## Segurança

- Certificado só em volume + env
- Ambiente padrão: `homologacao`
- `Idempotency-Key` obrigatória na emissão
- Circuit breaker + cooldown ADN

## Escopo (de propósito)

Sem cancelamento/substituição multi-empresa, sem ERP. Se precisar disso, use um sistema fiscal completo.
