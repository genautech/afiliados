export const metadata = { title: 'Termos de Uso' };

export default function TermosDeUso() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'Arial, sans-serif', color: '#222', lineHeight: 1.6 }}>
      <h1>Termos de Uso</h1>
      <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <p>
        Ao acessar este site, você concorda com os termos abaixo. Este é um conteúdo editorial
        independente com finalidade informativa e promocional, que pode conter links de afiliado.
      </p>

      <h2>Divulgação de afiliado</h2>
      <p>
        Este site participa de programas de marketing de afiliados. Podemos ganhar comissão sobre
        compras realizadas através dos links aqui presentes, sem custo adicional para o comprador.
        As opiniões e avaliações expressas são baseadas em pesquisa independente.
      </p>

      <h2>Isenção de responsabilidade</h2>
      <p>
        O conteúdo desta página é fornecido apenas para fins informativos e não substitui orientação
        médica, financeira ou profissional. Resultados individuais podem variar. Consulte um
        profissional qualificado antes de tomar decisões relacionadas à sua saúde.
      </p>

      <h2>Propriedade</h2>
      <p>
        Marcas, produtos e imagens de terceiros mencionados pertencem aos seus respectivos
        proprietários e são citados apenas para fins informativos/comparativos.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas sobre estes termos podem ser enviadas para{' '}
        <a href="mailto:genaujunior@gmail.com">genaujunior@gmail.com</a>.
      </p>
    </main>
  );
}
