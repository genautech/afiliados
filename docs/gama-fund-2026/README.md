# AfiliAds — Gama Fund 2026

Sala de investimento estática e documentos de trabalho da candidatura.

## Executar localmente

```sh
node build-documents.mjs
python3 -m http.server 8765 --bind 127.0.0.1
```

Acesse `http://127.0.0.1:8765/index.html#google`.

## Validar

```sh
node --test tests/portal-smoke.mjs
```

Os PDFs com `rascunho` no nome não são materiais finais. Antes do envio, ainda é necessário completar os dados do fundador, confirmar duas referências, validar as premissas e congelar as métricas técnicas em um commit com a suíte verde.
