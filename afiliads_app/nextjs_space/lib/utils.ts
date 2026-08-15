import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export async function fetcher<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error: any = new Error(response.statusText);
    error.response = response;
    throw error;
  }
  return response.json();
}

export function generateDiff(oldContent: string, newContent: string): string {
  // Implementação de diff simples (pode ser aprimorada com uma lib externa se necessário)
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  let diff = '';

  // Simplificado para demonstração
  // Uma implementação real usaria uma biblioteca de diff (ex: jsdiff ou similar)
  // Para este protótipo, vamos apenas mostrar as linhas diferentes
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';
    if (oldLine !== newLine) {
      if (oldLine) diff += `- ${oldLine}\n`;
      if (newLine) diff += `+ ${newLine}\n`;
    }
  }
  return diff;
}