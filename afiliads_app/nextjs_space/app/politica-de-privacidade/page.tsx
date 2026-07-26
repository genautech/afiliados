export const metadata = { title: 'Política de Privacidade' };

export default function PoliticaDePrivacidade() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'Arial, sans-serif', color: '#222', lineHeight: 1.6 }}>
      <h1>Política de Privacidade</h1>
      <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <p>
        Este site é uma página de conteúdo e divulgação (advertorial) que participa de programas de
        marketing de afiliados. Podemos receber comissão por compras feitas através de links
        presentes nesta página, sem custo adicional para você.
      </p>

      <h2>Dados coletados</h2>
      <p>
        Coletamos dados de navegação de forma anônima (como páginas visitadas e origem do tráfego)
        através de ferramentas de analytics (Google Analytics / Google Ads) para medir o desempenho
        do conteúdo. Não coletamos dados pessoais sensíveis nesta página. Se você prosseguir para o
        site do produto anunciado, a política de privacidade daquele site próprio se aplica aos dados
        que ele coletar.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos cookies de terceiros (Google) para mensurar cliques e conversões dos nossos anúncios.
        Você pode desativar cookies nas configurações do seu navegador a qualquer momento.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas sobre esta política podem ser enviadas para{' '}
        <a href="mailto:genaujunior@gmail.com">genaujunior@gmail.com</a>.
      </p>
    </main>
  );
}
