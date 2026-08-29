# Dados de campanha

Aqui entra número medido: CPC real, CVR real, EPC por keyword, resultado de
experimento. É o material que substitui heurística por evidência no catálogo.

## Regra

Todo `<nome>.yaml` precisa de um `<nome>.origem.yaml` irmão. O build
(`yarn subsidios:build`) falha sem ele. Formato:

```yaml
schema: 1
fonte: dado-proprio        # dado-proprio | fonte-externa | heuristica-interna
conta: "123-456-7890"      # dado-proprio: conta, periodo e amostra obrigatórios
periodo: "2026-07-01..2026-08-15"
amostra: "4 campanhas, 812 conversões"
responsavel: genau@yoobe.co
nota: opcional
```

Para `fonte-externa`, `url` e `acessado_em` no lugar de conta/periodo/amostra.

## Por que separado do catálogo

`subsidios/catalogo/` guarda a heurística que decide antes de existir dado.
Quando um número daqui tiver amostra suficiente, ele promove o valor do
catálogo — trocando `origem: heuristica-interna` por `origem: dado-proprio`
com a amostra citada. O catálogo nunca recebe número sem essa passagem.
