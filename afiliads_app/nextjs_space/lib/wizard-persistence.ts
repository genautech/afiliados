function safeApiMessage(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const sanitized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300);
  return sanitized || fallback;
}

export async function requireOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  let message = fallback;
  try {
    const body = await response.json();
    message = safeApiMessage(body?.error, fallback);
  } catch {
    // Corpo de erro inválido/não JSON não deve substituir a mensagem segura local.
  }
  throw new Error(message);
}

export async function requireOkJson<T>(response: Response, fallback: string): Promise<T> {
  await requireOk(response, fallback);
  try {
    return await response.json() as T;
  } catch {
    throw new Error(fallback);
  }
}
