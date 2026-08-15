import { describe, expect, it } from 'vitest';
import { requireOk, requireOkJson } from './wizard-persistence';

describe('wizard persistence HTTP contract', () => {
  it('rejeita resposta não-2xx usando a mensagem segura da API', async () => {
    const response = new Response(JSON.stringify({ error: 'Payload inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(requireOk(response, 'Erro ao salvar')).rejects.toThrow('Payload inválido');
  });

  it('retorna JSON somente quando a resposta é 2xx e válida', async () => {
    const response = new Response(JSON.stringify({ id: 'campaign-1' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(requireOkJson<{ id: string }>(response, 'Erro ao criar')).resolves.toEqual({ id: 'campaign-1' });
  });

  it('rejeita sucesso com corpo JSON inválido', async () => {
    const response = new Response('', { status: 200 });

    await expect(requireOkJson(response, 'Resposta inválida')).rejects.toThrow('Resposta inválida');
  });
});
