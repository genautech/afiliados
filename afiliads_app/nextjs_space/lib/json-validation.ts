// Modelos frequentemente devolvem o JSON dentro de uma cerca ```json ou com texto ao redor.
// Antes de 2026-08-15 esse saneamento existia em llm.ts (parseAgentJson) e foi perdido na
// migração para `json: true`; sem ele um JSON perfeitamente válido cercado por ``` custa uma
// chamada extra de correção — ou derruba a cadeia inteira para o próximo provider.
export function parseAgentJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/) ?? cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

export function validateJson(text: string, validate?: (data: any, text: string) => string | null): string | null {
  const data = parseAgentJson(text);
  if (data === null || data === undefined) return 'Resposta não é JSON válido (nem dentro de cerca de código).';
  if (validate) return validate(data, text);
  return null;
}
