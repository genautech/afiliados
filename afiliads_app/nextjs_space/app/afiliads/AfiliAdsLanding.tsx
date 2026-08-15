'use client';

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './landing.module.css';

const navigation = [
  { id: 'produto', label: 'Ver o produto', detail: 'O fluxo operacional em seis etapas' },
  { id: 'controle', label: 'Entender os controles', detail: 'IA onde há julgamento; código onde há risco' },
  { id: 'publicos', label: 'Encontrar seu caso', detail: 'Iniciantes, operadores e agências' },
  { id: 'espera', label: 'Entrar na lista de espera', detail: 'Acesso antecipado e conversa de descoberta' },
];

const workflow = [
  {
    stage: '1.0',
    title: 'Investigar a oferta.',
    copy: 'Consolide sinais da página de vendas, regras do produtor, concorrência, keywords e risco de canal antes de investir mídia.',
    output: 'Dossiê de produto + restrições verificadas',
  },
  {
    stage: '2.0',
    title: 'Decidir a estratégia.',
    copy: 'Transforme os sinais em canal, funil, orçamento, negativas e hipóteses. Regras determinísticas impedem que o modelo improvise decisões financeiras.',
    output: 'Plano rastreável + gates de readiness',
  },
  {
    stage: '3.0',
    title: 'Construir os ativos.',
    copy: 'Gere presell, estrutura de campanha, grupos, keywords e RSA com contexto compartilhado entre agentes especializados.',
    output: 'Página + campanha PAUSED para revisão',
  },
  {
    stage: '4.0',
    title: 'Verificar antes de publicar.',
    copy: 'Cheque URL, SSL, tracking, políticas, brand bidding e coerência entre anúncio e destino. Falha crítica bloqueia a próxima ação.',
    output: 'Checklist verificável, não uma opinião',
  },
  {
    stage: '5.0',
    title: 'Experimentar com limite.',
    copy: 'Estruture variações controladas, orçamento calculado e lifecycle explícito. Toda mutação sensível exige confirmação vinculada à operação.',
    output: 'Experimento com controle e tratamento',
  },
  {
    stage: '6.0',
    title: 'Aprender com o resultado.',
    copy: 'Sincronize métricas, preserve o que veio da plataforma e devolva a lição para a próxima campanha da mesma vertical.',
    output: 'Memória operacional reaproveitável',
  },
];

const audiences = [
  {
    name: 'Afiliado iniciante',
    tension: 'Precisa de sequência e proteção contra erros caros.',
    gain: 'Um caminho guiado da escolha da oferta à campanha revisada — com o motivo de cada decisão.',
  },
  {
    name: 'Operador avançado',
    tension: 'Precisa rodar muitas hipóteses sem perder rastreabilidade.',
    gain: 'Processos repetíveis, experimentos controlados e memória entre campanhas, produtos e verticais.',
  },
  {
    name: 'Agência',
    tension: 'Precisa padronizar qualidade sem engessar a equipe.',
    gain: 'Uma camada operacional comum para pesquisa, produção, compliance, mídia e aprendizado.',
  },
];

function ProductSurface() {
  return (
    <figure className={styles.productSurface} aria-labelledby="surface-caption">
      <div className={styles.surfaceRail}>
        <span className={styles.surfaceBrand}>A</span>
        <span className={styles.railMark} aria-hidden="true" />
        <span className={styles.railMark} aria-hidden="true" />
        <span className={styles.railMark} aria-hidden="true" />
      </div>
      <div className={styles.surfaceMain}>
        <div className={styles.surfaceHeader}>
          <div>
            <p>Campanha / Oferta Atlas</p>
            <strong>Readiness operacional</strong>
          </div>
          <span className={styles.pausedStatus}>PAUSED · SEGURO</span>
        </div>
        <div className={styles.surfaceProgress} aria-label="Progresso ilustrativo do fluxo">
          <span className={styles.progressDone} />
          <span className={styles.progressDone} />
          <span className={styles.progressDone} />
          <span className={styles.progressDone} />
          <span className={styles.progressDone} />
          <span />
        </div>
        <div className={styles.surfaceBody}>
          <section className={styles.checkPanel}>
            <div className={styles.panelHeading}>
              <span>GATES</span>
              <span>VALIDADOS</span>
            </div>
            {['URL HTTPS verificada', 'Tracking consistente', 'Termos proibidos bloqueados', 'Orçamento dentro do limite'].map(
              (item) => (
                <div className={styles.checkRow} key={item}>
                  <span className={styles.checkGlyph} aria-hidden="true">✓</span>
                  <span>{item}</span>
                </div>
              ),
            )}
          </section>
          <section className={styles.agentPanel}>
            <div className={styles.panelHeading}>
              <span>AGENTE ATIVO</span>
              <span className={styles.liveSignal}>ROTEADO</span>
            </div>
            <p className={styles.agentName}>Compliance Sentinel</p>
            <p className={styles.agentCopy}>Compara copy, página, termos do produtor e política de canal antes de liberar a próxima ação.</p>
            <div className={styles.modelRoute}>
              <span>vertex / gemini</span>
              <span>premium → standard</span>
            </div>
          </section>
        </div>
        <div className={styles.surfaceFooter}>
          <span>Próxima ação</span>
          <strong>Revisar campanha antes de publicar →</strong>
        </div>
      </div>
      <figcaption id="surface-caption">Demonstração conceitual do fluxo — não representa dados de cliente.</figcaption>
    </figure>
  );
}

function CommandPalette() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return navigation;
    return navigation.filter((item) => `${item.label} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(normalized));
  }, [query]);

  const openPalette = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setQuery('');
    setActive(0);
    dialog.showModal();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  function closePalette() {
    dialogRef.current?.close();
  }

  function selectResult(id: string) {
    closePalette();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (results.length ? (current + 1) % results.length : 0));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (results.length ? (current - 1 + results.length) % results.length : 0));
    }
    if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      selectResult(results[active].id);
    }
  }

  useEffect(() => {
    function onShortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        openPalette();
      }
    }
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [openPalette]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [active, results.length]);

  return (
    <>
      <button className={styles.searchPill} type="button" onClick={openPalette} aria-label="Navegar pela página">
        <span className={styles.searchIcon} aria-hidden="true" />
        <span className={styles.searchText}>Navegar…</span>
        <kbd>⌘ K</kbd>
      </button>
      <dialog
        ref={dialogRef}
        className={styles.commandDialog}
        onClick={(event) => {
          if (event.currentTarget === event.target) closePalette();
        }}
        onClose={() => setQuery('')}
      >
        <div className={styles.commandPanel}>
          <div className={styles.commandField}>
            <span className={styles.searchIcon} aria-hidden="true" />
            <label className={styles.visuallyHidden} htmlFor="command-search">Navegar pela página</label>
            <input
              id="command-search"
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeys}
              placeholder="Digite produto, controles ou lista…"
              autoComplete="off"
            />
            <button type="button" onClick={closePalette} aria-label="Fechar navegação">ESC</button>
          </div>
          <div className={styles.commandResults} role="listbox" aria-label="Destinos da página">
            {results.length ? (
              results.map((item, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? styles.commandActive : undefined}
                  key={item.id}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => selectResult(item.id)}
                >
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </button>
              ))
            ) : (
              <p className={styles.commandEmpty}>Nenhuma seção corresponde a essa busca.</p>
            )}
          </div>
          <p className={styles.commandHint}>↑ ↓ para navegar · Enter para abrir · Esc para fechar</p>
        </div>
      </dialog>
    </>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const isValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const showError = touched && !isValid && state !== 'success';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setState('loading');

    window.setTimeout(() => {
      const subject = encodeURIComponent('Lista de espera — AfiliAds');
      const body = encodeURIComponent(
        `Quero entrar na lista de espera do AfiliAds.\n\nEmail: ${email.trim()}\nOrigem: landing /afiliads`,
      );
      window.location.assign(`mailto:genaujunior@gmail.com?subject=${subject}&body=${body}`);
      setState('success');
    }, 350);
  }

  return (
    <form className={styles.waitlistForm} onSubmit={submit} noValidate>
      <div className={styles.fieldGroup}>
        <label htmlFor="waitlist-email">Email profissional</label>
        <div className={`${styles.fieldRow} ${showError ? styles.fieldRowError : ''} ${state === 'success' ? styles.fieldRowSuccess : ''}`}>
          <input
            id="waitlist-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (state === 'success') setState('idle');
            }}
            onBlur={() => setTouched(true)}
            placeholder="voce@empresa.com"
            autoComplete="email"
            aria-required="true"
            aria-invalid={showError}
            aria-describedby="waitlist-help"
          />
          <span className={styles.fieldState} aria-hidden="true">
            {state === 'loading' ? <span className={styles.spinner} /> : state === 'success' ? '✓' : showError ? '!' : ''}
          </span>
          <button type="submit" disabled={state === 'loading'}>
            {state === 'loading' ? 'Preparando…' : 'Entrar na lista →'}
          </button>
        </div>
        <p id="waitlist-help" className={showError ? styles.fieldError : styles.fieldHelp} aria-live="polite">
          {showError
            ? 'Esse email não está completo. Revise o endereço e tente novamente.'
            : state === 'success'
              ? 'Seu aplicativo de email foi aberto com a mensagem pronta. Envie para confirmar o interesse.'
              : 'Abriremos uma mensagem pronta no seu aplicativo de email. Nenhum dado é salvo nesta página.'}
        </p>
      </div>
    </form>
  );
}

export function AfiliAdsLanding() {
  return (
    <main className={`afiliadsLanding ${styles.page}`}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <a className={styles.wordmark} href="#top" aria-label="AfiliAds — início">
            Afili<span>Ads</span><i aria-hidden="true" />
          </a>
          <CommandPalette />
          <a className={styles.navCta} href="#espera">Lista de espera →</a>
        </div>
      </header>

      <section className={styles.hero} id="top" aria-labelledby="hero-title">
        <div className={`${styles.heroCopy} ${styles.heroReveal}`}>
          <p className={styles.heroLabel}>SISTEMA OPERACIONAL PARA MÍDIA DE AFILIADOS</p>
          <h1 id="hero-title">Campanhas de afiliados, sob controle.</h1>
          <p className={styles.heroLede}>
            Da análise da oferta ao aprendizado de campanha: agentes de IA, regras determinísticas e Google Ads em um único fluxo verificável.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryCta} href="#espera">Entrar na lista →</a>
            <a className={styles.textLink} href="#produto">Ver como opera ↓</a>
          </div>
          <p className={styles.heroNote}>Beta em construção · acesso antecipado para operadores e agências</p>
        </div>
        <div className={`${styles.heroVisual} ${styles.heroRevealDelayed}`}>
          <ProductSurface />
        </div>
      </section>

      <section className={styles.proof} aria-label="Prova de execução técnica">
        <div><strong>14</strong><span>agentes especializados</span></div>
        <div><strong>58</strong><span>rotas de produto</span></div>
        <div><strong>474</strong><span>testes no repositório</span></div>
        <div><strong>v25</strong><span>Google Ads API</span></div>
        <p>Contagem auditada no código em agosto de 2026. Prova de execução técnica — não representa clientes, receita ou tração.</p>
      </section>

      <section className={styles.problem}>
        <div className={styles.problemStatement}>
          <p>A operação fragmenta antes de escalar.</p>
          <h2>Oferta, copy, tracking, mídia e aprendizado vivem em ferramentas diferentes.</h2>
        </div>
        <div className={styles.problemDetail}>
          <p>O resultado é retrabalho, campanhas sem memória e risco escondido em decisões que parecem pequenas: uma keyword de marca, uma URL não validada, uma promessa incompatível com a página.</p>
          <p>O AfiliAds organiza essa cadeia como um sistema: cada etapa produz uma saída verificável para a seguinte.</p>
        </div>
      </section>

      <section className={styles.workflowSection} id="produto" aria-labelledby="workflow-title">
        <div className={styles.sectionHead}>
          <h2 id="workflow-title">Um fluxo inteiro. Seis decisões explícitas.</h2>
          <p>Menos troca de contexto. Mais clareza sobre o que foi decidido, por quê e com qual evidência.</p>
        </div>
        <ol className={styles.workflow}>
          {workflow.map((step) => (
            <li key={step.stage}>
              <span className={styles.stage}>{step.stage}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
              <p className={styles.output}>{step.output}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.controlBand} id="controle" aria-labelledby="control-title">
        <div className={styles.controlIntro}>
          <h2 id="control-title">IA para julgar. Código para limitar.</h2>
          <p>O sistema separa raciocínio probabilístico de decisões que precisam ser reproduzíveis.</p>
        </div>
        <div className={styles.architecture} role="img" aria-label="Fluxo entre dados, agentes, regras e plataformas">
          <div>
            <span>DADOS</span>
            <strong>Oferta · mercado · campanha</strong>
          </div>
          <span className={styles.archArrow} aria-hidden="true">→</span>
          <div className={styles.archActive}>
            <span>AGENTES</span>
            <strong>Vertex AI · Gemini · roteamento</strong>
          </div>
          <span className={styles.archArrow} aria-hidden="true">→</span>
          <div>
            <span>GUARDS</span>
            <strong>Readiness · orçamento · confirmação</strong>
          </div>
          <span className={styles.archArrow} aria-hidden="true">→</span>
          <div>
            <span>EXECUÇÃO</span>
            <strong>Google Ads · presell · métricas</strong>
          </div>
        </div>
        <dl className={styles.controlList}>
          <div><dt>LLMs</dt><dd>Analisam contexto, formulam hipóteses e produzem ativos.</dd></div>
          <div><dt>Funções determinísticas</dt><dd>Calculam orçamento, validam estados e impedem mutações fora do contrato.</dd></div>
          <div><dt>Confirmação humana</dt><dd>Permanece no caminho das ações com impacto financeiro ou operacional.</dd></div>
        </dl>
      </section>

      <section className={styles.audienceSection} id="publicos" aria-labelledby="audience-title">
        <div className={styles.sectionHead}>
          <h2 id="audience-title">Uma base. Três níveis de operação.</h2>
          <p>O mesmo rigor atende quem precisa aprender a sequência e quem precisa multiplicá-la.</p>
        </div>
        <div className={styles.audiences}>
          {audiences.map((audience, index) => (
            <article key={audience.name} className={index === 1 ? styles.audienceFeatured : undefined}>
              <span>0{index + 1}</span>
              <h3>{audience.name}</h3>
              <p>{audience.tension}</p>
              <strong>{audience.gain}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.specSection} aria-labelledby="spec-title">
        <h2 id="spec-title">O que entra. O que sai.</h2>
        <div className={styles.specTable} role="table" aria-label="Entradas e saídas do AfiliAds">
          <div role="row" className={styles.specHeader}>
            <span role="columnheader">Camada</span><span role="columnheader">Entrada</span><span role="columnheader">Saída verificável</span>
          </div>
          {[
            ['Pesquisa', 'URL da oferta + rede', 'Dossiê, risco e tese de canal'],
            ['Produção', 'Estratégia aprovada', 'Presell, keywords e RSA'],
            ['Publicação', 'Ativos + checklist', 'Campanha PAUSED e revisável'],
            ['Aprendizado', 'Métricas sincronizadas', 'Decisão e memória por vertical'],
          ].map((row) => (
            <div role="row" key={row[0]}>
              <strong role="cell">{row[0]}</strong><span role="cell">{row[1]}</span><span role="cell">{row[2]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.founderSection} id="fundador" aria-labelledby="founder-title">
        <div className={styles.founderLabel}>
          <span>FOUNDER PROOF</span>
          <strong>Produto novo. Capacidade de execução comprovada.</strong>
        </div>
        <div className={styles.founderStory}>
          <h2 id="founder-title">Construído por quem já precisou transformar tecnologia em empresa.</h2>
          <p>
            Genau Lopes fundou a Yoobe, conduziu sua mudança de B2C para B2B e teve a empresa selecionada pelo Google for Startups Black Founders Fund. O AfiliAds nasce dessa experiência em produto, operação e adaptação — aplicada agora a um workflow digital e mensurável.
          </p>
          <div className={styles.founderLinks}>
            <a href="https://startup.google.com/intl/pt-BR_ALL/alumni/stories/yoobe/" target="_blank" rel="noreferrer">
              História da Yoobe no Google for Startups ↗
            </a>
            <a href="https://blog.google/intl/pt-br/novidades/iniciativas/novo-investimento-para-startups-fundadas-por-pessoas-negras-google-startups-brasil-anuncia-mais-r85-milhoes-para-o-black-founders-fund/" target="_blank" rel="noreferrer">
              Anúncio oficial do Black Founders Fund ↗
            </a>
          </div>
          <small>Referências públicas do Google, 2022. A seleção da Yoobe não representa investimento ou parceria do Google com o AfiliAds.</small>
        </div>
      </section>

      <section className={styles.waitlist} id="espera" aria-labelledby="waitlist-title">
        <div>
          <p className={styles.waitlistKicker}>ACESSO ANTECIPADO</p>
          <h2 id="waitlist-title">Entre antes da próxima campanha.</h2>
          <p>Estamos conversando com afiliados e agências que querem operar mais campanhas sem multiplicar o caos. Deixe seu email para participar da lista e da descoberta do produto.</p>
        </div>
        <WaitlistForm />
      </section>

      <footer className={styles.footer}>
        <p>Campanha boa não é a que nasceu rápido. É a que consegue explicar cada decisão.</p>
        <div>
          <a className={styles.wordmark} href="#top">Afili<span>Ads</span><i aria-hidden="true" /></a>
          <span>Produto brasileiro · IA nativa · 2026</span>
          <a href="mailto:genaujunior@gmail.com">genaujunior@gmail.com</a>
        </div>
      </footer>
    </main>
  );
}
