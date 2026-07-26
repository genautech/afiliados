export const metadata = { title: 'Contato' };

export default function Contato() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'Arial, sans-serif', color: '#222', lineHeight: 1.6 }}>
      <h1>Contato</h1>
      <p>
        Para dúvidas, solicitações ou questões relacionadas ao conteúdo desta página, entre em
        contato:
      </p>
      <p>
        <a href="mailto:genaujunior@gmail.com">genaujunior@gmail.com</a>
      </p>
    </main>
  );
}
