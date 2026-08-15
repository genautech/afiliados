export function validateJson(text: string, validate?: (data: any, text: string) => string | null): string | null {
  try {
    const data = JSON.parse(text);
    if (validate) return validate(data, text);
    return null;
  } catch (e: any) {
    return e?.message ?? String(e);
  }
}
