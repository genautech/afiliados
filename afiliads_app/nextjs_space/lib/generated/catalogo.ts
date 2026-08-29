// GERADO por scripts/build-subsidios.ts a partir de subsidios/catalogo/*.yaml.
// Não edite à mão: edite o YAML e rode `yarn subsidios:build`.
// Cada valor carrega a procedência que o justifica — ver subsidios/catalogo/verticais.yaml.

export type Origem = 'heuristica-interna' | 'dado-proprio' | 'fonte-externa';
export type Confianca = 'baixa' | 'media' | 'alta';

/** Benchmark público que contextualiza o número sem ser a origem dele. */
export interface ReferenciaExterna {
  url: string;
  titulo: string;
  acessado_em: string;
  metrica: string;
  valor_citado: string;
  por_que_nao_substitui: string;
}

export interface Procedencia {
  origem: Origem;
  confianca: Confianca;
  nota?: string;
  amostra?: string;
  url?: string;
  revisar_em?: string;
  referencias?: ReferenciaExterna[];
}

export interface NumeroComProcedencia extends Procedencia { valor: number; unidade: string }
export interface ListaComProcedencia extends Procedencia { termos: string[] }
export interface KeywordsComProcedencia extends Procedencia { A: string[]; B: string[]; C: string[]; D: string[] }

export interface VerticalCatalogo {
  id: string;
  label: string;
  cvr_default: NumeroComProcedencia;
  keywords?: KeywordsComProcedencia;
  negativas: ListaComProcedencia;
}

export interface PlataformaCatalogo { id: string; tipo: string; integracao: string; nota?: string }
export interface CanalCatalogo { id: string; label: string; quando_usar: string }
export interface GeoCatalogo { id: string; label: string; nota?: string }
export interface CatalogoOperacao {
  schema: 1;
  atualizado_em: string;
  plataformas: PlataformaCatalogo[];
  canais: CanalCatalogo[];
  geos: GeoCatalogo[];
}

export const CATALOGO_VERTICAIS: { schema: 1; atualizado_em: string; verticais: VerticalCatalogo[] } =
  {
  "schema": 1,
  "atualizado_em": "2026-08-29",
  "verticais": [
    {
      "id": "weight-loss",
      "label": "Weight Loss",
      "cvr_default": {
        "valor": 1.5,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29",
        "referencias": [
          {
            "url": "https://www.dtcpages.com/blog/ecommerce-conversion-rate-benchmarks-2026",
            "titulo": "Ecommerce Conversion Rate Benchmarks 2026 — dados de 21 lojas Shopify",
            "acessado_em": "2026-08-29",
            "metrica": "pedidos / sessões da loja própria, 179M+ sessões, jan/2025 a jun/2026",
            "valor_citado": "mediana 2,07% no geral; 2,42% na faixa de AOV abaixo de US$ 60",
            "por_que_nao_substitui": "Mede tráfego misturado da loja do próprio dono da oferta (orgânico, direto, recorrente). Aqui o número é venda de tráfego pago frio atravessando uma bridge até a página de um terceiro, que converte bem abaixo disso."
          },
          {
            "url": "https://www.fyresite.com/ecommerce-conversion-rate-by-industry-benchmarks/",
            "titulo": "Ecommerce Conversion Rate by Industry — Health & Wellness",
            "acessado_em": "2026-08-29",
            "metrica": "compras / sessões, média combinada de canais e dispositivos",
            "valor_citado": "Health & Wellness entre 1,5% e 2,5%",
            "por_que_nao_substitui": "A própria fonte não declara de onde tirou os números e adverte que a média crua esconde variação por canal. Serve de teto plausível, não de medição."
          }
        ]
      },
      "keywords": {
        "A": [
          "how to lose weight after 40",
          "belly fat problem",
          "why cant I lose weight",
          "stubborn fat causes"
        ],
        "B": [
          "best weight loss supplement",
          "natural way to lose weight",
          "fast metabolism boost",
          "weight loss that works"
        ],
        "C": [
          "weight loss supplement review",
          "supplement vs diet comparison",
          "top rated weight loss 2026",
          "does supplement work"
        ],
        "D": [
          "buy weight loss supplement",
          "official weight loss site",
          "order supplement online",
          "get weight loss solution"
        ],
        "origem": "heuristica-interna",
        "confianca": "media",
        "nota": "Sementes por camada de intenção. A = fundo de funil/comercial, B = comparação/review, C = problema/dor, D = informacional. Não são keywords finais: são o ponto de partida que a pesquisa de keywords expande e o relatório de termos de pesquisa corrige."
      },
      "negativas": {
        "termos": [
          "free",
          "grátis",
          "surgery",
          "reddit",
          "wikipedia",
          "diy",
          "homemade",
          "recipe",
          "exercise only",
          "gym"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    },
    {
      "id": "nutra",
      "label": "Nutra",
      "cvr_default": {
        "valor": 1.2,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29",
        "referencias": [
          {
            "url": "https://www.dtcpages.com/blog/ecommerce-conversion-rate-benchmarks-2026",
            "titulo": "Ecommerce Conversion Rate Benchmarks 2026 — dados de 21 lojas Shopify",
            "acessado_em": "2026-08-29",
            "metrica": "pedidos / sessões da loja própria, 179M+ sessões, jan/2025 a jun/2026",
            "valor_citado": "mediana 2,07% no geral; 2,42% na faixa de AOV abaixo de US$ 60",
            "por_que_nao_substitui": "Mede tráfego misturado da loja do próprio dono da oferta (orgânico, direto, recorrente). Aqui o número é venda de tráfego pago frio atravessando uma bridge até a página de um terceiro, que converte bem abaixo disso."
          },
          {
            "url": "https://www.fyresite.com/ecommerce-conversion-rate-by-industry-benchmarks/",
            "titulo": "Ecommerce Conversion Rate by Industry — Health & Wellness",
            "acessado_em": "2026-08-29",
            "metrica": "compras / sessões, média combinada de canais e dispositivos",
            "valor_citado": "Health & Wellness entre 1,5% e 2,5%",
            "por_que_nao_substitui": "A própria fonte não declara de onde tirou os números e adverte que a média crua esconde variação por canal. Serve de teto plausível, não de medição."
          }
        ]
      },
      "keywords": {
        "A": [
          "joint pain relief",
          "blood sugar problems",
          "energy fatigue causes",
          "digestive issues natural"
        ],
        "B": [
          "best supplement for joints",
          "blood sugar support natural",
          "energy boost supplement",
          "gut health solution"
        ],
        "C": [
          "supplement review 2026",
          "nutra product comparison",
          "does supplement really work",
          "real user results"
        ],
        "D": [
          "buy health supplement",
          "order nutra online",
          "official supplement store",
          "get supplement now"
        ],
        "origem": "heuristica-interna",
        "confianca": "media",
        "nota": "Sementes por camada de intenção. A = fundo de funil/comercial, B = comparação/review, C = problema/dor, D = informacional. Não são keywords finais: são o ponto de partida que a pesquisa de keywords expande e o relatório de termos de pesquisa corrige."
      },
      "negativas": {
        "termos": [
          "free",
          "grátis",
          "prescription",
          "doctor",
          "hospital",
          "side effects lawsuit",
          "recall",
          "fda warning"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    },
    {
      "id": "make-money",
      "label": "Make Money",
      "cvr_default": {
        "valor": 0.8,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29"
      },
      "keywords": {
        "A": [
          "how to make money online",
          "side hustle from home",
          "passive income ideas",
          "quit 9 to 5 job"
        ],
        "B": [
          "best online income method",
          "proven income system",
          "work from home opportunity",
          "digital income guide"
        ],
        "C": [
          "income method review",
          "online business comparison",
          "does method actually work",
          "real results proof"
        ],
        "D": [
          "start earning online",
          "get income system",
          "join program today",
          "access income method"
        ],
        "origem": "heuristica-interna",
        "confianca": "media",
        "nota": "Sementes por camada de intenção. A = fundo de funil/comercial, B = comparação/review, C = problema/dor, D = informacional. Não são keywords finais: são o ponto de partida que a pesquisa de keywords expande e o relatório de termos de pesquisa corrige."
      },
      "negativas": {
        "termos": [
          "free",
          "grátis",
          "scam",
          "golpe",
          "pyramid",
          "mlm",
          "emprego",
          "vaga",
          "salário",
          "job"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    },
    {
      "id": "relationships",
      "label": "Relationships",
      "cvr_default": {
        "valor": 1,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29"
      },
      "keywords": {
        "A": [
          "how to save relationship",
          "get ex back tips",
          "relationship problems help",
          "communication issues couple"
        ],
        "B": [
          "best relationship guide",
          "save marriage program",
          "improve communication partner",
          "relationship coaching"
        ],
        "C": [
          "relationship program review",
          "does guide actually work",
          "real couples results",
          "compare relationship advice"
        ],
        "D": [
          "get relationship guide",
          "buy program access",
          "start coaching today",
          "official program site"
        ],
        "origem": "heuristica-interna",
        "confianca": "media",
        "nota": "Sementes por camada de intenção. A = fundo de funil/comercial, B = comparação/review, C = problema/dor, D = informacional. Não são keywords finais: são o ponto de partida que a pesquisa de keywords expande e o relatório de termos de pesquisa corrige."
      },
      "negativas": {
        "termos": [
          "free",
          "grátis",
          "therapist",
          "counselor",
          "divorce lawyer",
          "legal"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    },
    {
      "id": "health",
      "label": "Health",
      "cvr_default": {
        "valor": 1.3,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29",
        "referencias": [
          {
            "url": "https://www.dtcpages.com/blog/ecommerce-conversion-rate-benchmarks-2026",
            "titulo": "Ecommerce Conversion Rate Benchmarks 2026 — dados de 21 lojas Shopify",
            "acessado_em": "2026-08-29",
            "metrica": "pedidos / sessões da loja própria, 179M+ sessões, jan/2025 a jun/2026",
            "valor_citado": "mediana 2,07% no geral; 2,42% na faixa de AOV abaixo de US$ 60",
            "por_que_nao_substitui": "Mede tráfego misturado da loja do próprio dono da oferta (orgânico, direto, recorrente). Aqui o número é venda de tráfego pago frio atravessando uma bridge até a página de um terceiro, que converte bem abaixo disso."
          },
          {
            "url": "https://www.fyresite.com/ecommerce-conversion-rate-by-industry-benchmarks/",
            "titulo": "Ecommerce Conversion Rate by Industry — Health & Wellness",
            "acessado_em": "2026-08-29",
            "metrica": "compras / sessões, média combinada de canais e dispositivos",
            "valor_citado": "Health & Wellness entre 1,5% e 2,5%",
            "por_que_nao_substitui": "A própria fonte não declara de onde tirou os números e adverte que a média crua esconde variação por canal. Serve de teto plausível, não de medição."
          }
        ]
      },
      "negativas": {
        "termos": [
          "free",
          "grátis",
          "prescription",
          "doctor",
          "hospital",
          "emergency"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    },
    {
      "id": "beauty",
      "label": "Beauty",
      "cvr_default": {
        "valor": 1.4,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29",
        "referencias": [
          {
            "url": "https://www.dtcpages.com/blog/ecommerce-conversion-rate-benchmarks-2026",
            "titulo": "Ecommerce Conversion Rate Benchmarks 2026 — dados de 21 lojas Shopify",
            "acessado_em": "2026-08-29",
            "metrica": "pedidos / sessões da loja própria, 179M+ sessões, jan/2025 a jun/2026",
            "valor_citado": "mediana 2,07% no geral; 2,42% na faixa de AOV abaixo de US$ 60",
            "por_que_nao_substitui": "Mede tráfego misturado da loja do próprio dono da oferta (orgânico, direto, recorrente). Aqui o número é venda de tráfego pago frio atravessando uma bridge até a página de um terceiro, que converte bem abaixo disso."
          },
          {
            "url": "https://www.fyresite.com/ecommerce-conversion-rate-by-industry-benchmarks/",
            "titulo": "Ecommerce Conversion Rate by Industry — Beauty",
            "acessado_em": "2026-08-29",
            "metrica": "compras / sessões, média combinada de canais e dispositivos",
            "valor_citado": "Beauty entre 2,5% e 3,5%",
            "por_que_nao_substitui": "Faixa puxada por recompra e assinatura de marca própria. Afiliado com tráfego frio não herda a base recorrente que produz esse número."
          }
        ]
      },
      "negativas": {
        "termos": [
          "free",
          "grátis",
          "diy",
          "homemade",
          "recipe",
          "salon near me"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    },
    {
      "id": "cursos-br",
      "label": "Cursos BR",
      "cvr_default": {
        "valor": 2,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29",
        "referencias": [
          {
            "url": "https://www.dtcpages.com/blog/ecommerce-conversion-rate-benchmarks-2026",
            "titulo": "Ecommerce Conversion Rate Benchmarks 2026 — dados de 21 lojas Shopify",
            "acessado_em": "2026-08-29",
            "metrica": "pedidos / sessões da loja própria, 179M+ sessões, jan/2025 a jun/2026",
            "valor_citado": "mediana 2,07% no geral; 2,42% na faixa de AOV abaixo de US$ 60",
            "por_que_nao_substitui": "Mede tráfego misturado da loja do próprio dono da oferta (orgânico, direto, recorrente). Aqui o número é venda de tráfego pago frio atravessando uma bridge até a página de um terceiro, que converte bem abaixo disso."
          }
        ]
      },
      "negativas": {
        "termos": [
          "grátis",
          "free",
          "pirata",
          "torrent",
          "download",
          "reclame aqui"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    },
    {
      "id": "outro",
      "label": "Outro",
      "cvr_default": {
        "valor": 1,
        "unidade": "percentual",
        "origem": "heuristica-interna",
        "confianca": "baixa",
        "nota": "Estimativa de CVR de clique-para-venda usada como default da calculadora do wizard. Não foi medida: substitua por dado-proprio assim que houver campanha com volume.",
        "revisar_em": "2026-11-29"
      },
      "negativas": {
        "termos": [
          "free",
          "grátis",
          "scam",
          "golpe"
        ],
        "origem": "heuristica-interna",
        "confianca": "alta",
        "nota": "Negativas preventivas aplicadas antes do primeiro clique. Cada uma existe para barrar um tipo de busca que gasta orçamento sem chance de compra."
      }
    }
  ]
};

export const CATALOGO_OPERACAO: CatalogoOperacao = {
  "schema": 1,
  "atualizado_em": "2026-08-29",
  "plataformas": [
    {
      "id": "ClickBank",
      "tipo": "marketplace",
      "integracao": "nativa",
      "nota": "API de marketplace e hop stats já integradas em lib/clickbank.ts."
    },
    {
      "id": "BuyGoods",
      "tipo": "rede-cpa",
      "integracao": "manual",
      "nota": "Comissão via CPA fixo. Conversão só chega no Google Ads por postback."
    },
    {
      "id": "MaxWeb",
      "tipo": "rede-cpa",
      "integracao": "nativa",
      "nota": "lib/maxwebService.ts. Exige postback S2S configurado — sem ele não há otimização automática."
    },
    {
      "id": "Hotmart",
      "tipo": "marketplace",
      "integracao": "manual",
      "nota": "Mercado BR. Verifique regras de brand bidding na página do produtor."
    },
    {
      "id": "Eduzz",
      "tipo": "marketplace",
      "integracao": "manual",
      "nota": "Mercado BR."
    },
    {
      "id": "Monetizze",
      "tipo": "marketplace",
      "integracao": "manual",
      "nota": "Mercado BR."
    },
    {
      "id": "Kiwify",
      "tipo": "marketplace",
      "integracao": "nativa",
      "nota": "lib/kiwifyService.ts."
    },
    {
      "id": "Digistore24",
      "tipo": "marketplace",
      "integracao": "manual",
      "nota": "Mercado EU/DE forte."
    },
    {
      "id": "Outro",
      "tipo": "outro",
      "integracao": "manual",
      "nota": "Escape hatch: dados entram à mão e não recebem verificação automática."
    }
  ],
  "canais": [
    {
      "id": "SEARCH",
      "label": "Google Search",
      "quando_usar": "Intenção declarada. Primeira escolha quando a vertical permite e o CPC cabe no break-even."
    },
    {
      "id": "YOUTUBE",
      "label": "YouTube",
      "quando_usar": "Vertical em que Search é caro ou proibido pelo produtor. Exige criativo em vídeo."
    },
    {
      "id": "DEMAND_GEN",
      "label": "Demand Gen",
      "quando_usar": "Geração de demanda (Discover, Gmail, YouTube). Topo de funil com criativo visual."
    },
    {
      "id": "PMAX",
      "label": "Performance Max",
      "quando_usar": "Só com conversão confiável já rastreada. Sem histórico, queima orçamento."
    }
  ],
  "geos": [
    {
      "id": "US",
      "label": "Estados Unidos"
    },
    {
      "id": "UK",
      "label": "Reino Unido"
    },
    {
      "id": "AU",
      "label": "Austrália"
    },
    {
      "id": "CA",
      "label": "Canadá"
    },
    {
      "id": "BR",
      "label": "Brasil"
    },
    {
      "id": "DE",
      "label": "Alemanha"
    },
    {
      "id": "FR",
      "label": "França"
    },
    {
      "id": "ES",
      "label": "Espanha"
    },
    {
      "id": "IT",
      "label": "Itália"
    },
    {
      "id": "MX",
      "label": "México"
    },
    {
      "id": "GLOBAL",
      "label": "Global"
    }
  ]
};

export const VERTICAIS: VerticalCatalogo[] = CATALOGO_VERTICAIS.verticais;

export function verticalPorLabel(label: string): VerticalCatalogo | null {
  return VERTICAIS.find((v) => v.label === label) ?? null;
}

/** Procedência de um valor, em texto curto para a UI mostrar ao lado do número. */
export function explicaProcedencia(p: Procedencia): string {
  let base: string;
  if (p.origem === 'dado-proprio') {
    base = 'medido em campanha própria' + (p.amostra ? ' (' + p.amostra + ')' : '');
  } else if (p.origem === 'fonte-externa') {
    base = 'fonte externa' + (p.url ? ' — ' + p.url : '');
  } else {
    base = 'estimativa interna, não medida';
  }
  return base + '; confiança ' + p.confianca;
}
