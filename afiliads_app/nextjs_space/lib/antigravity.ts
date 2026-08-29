import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MAX_OUTPUT_BYTES = 512 * 1024;
const PROCESS_TIMEOUT_MS = 120_000;

export type ScriptRunResult = {
  ok: boolean;
  mode: 'LIVE' | 'MOCK';
  stdout: string;
  stderr: string;
  code: number | null;
};

export function projectRoot(): string {
  return process.env.AFILIADS_ROOT
    ? path.resolve(process.env.AFILIADS_ROOT)
    : path.resolve(process.cwd(), '..', '..');
}

function safeSlug(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return slug || 'campaign';
}

export function campaignWorkspace(campaignName: string): string {
  return path.join(projectRoot(), 'campaigns_data', 'low_ticket', safeSlug(campaignName));
}

export function researchDir(campaignName: string): string {
  return path.join(campaignWorkspace(campaignName), '01_research');
}

export function draftsDir(campaignName: string): string {
  return path.join(campaignWorkspace(campaignName), '02_drafts');
}

export function manifestPath(campaignName: string): string {
  return path.join(campaignWorkspace(campaignName), 'manifest.json');
}

function appendCapped(current: string, chunk: Buffer | string): string {
  const next = current + chunk.toString();
  return next.length > MAX_OUTPUT_BYTES ? next.slice(0, MAX_OUTPUT_BYTES) : next;
}

export function runScript(
  scriptName: string,
  args: string[],
): Promise<ScriptRunResult> {
  const scriptPath = path.join(projectRoot(), 'scripts', scriptName);
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn('python3', [scriptPath, ...args], {
      cwd: projectRoot(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });
    const timer = setTimeout(() => child.kill('SIGTERM'), PROCESS_TIMEOUT_MS);

    const finish = (result: ScriptRunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    child.stdout.on('data', (chunk: Buffer) => { stdout = appendCapped(stdout, chunk); });
    child.stderr.on('data', (chunk: Buffer) => { stderr = appendCapped(stderr, chunk); });
    child.on('error', (error) => {
      finish({ ok: false, mode: 'LIVE', stdout, stderr: appendCapped(stderr, error.message), code: null });
    });
    child.on('close', (code) => finish({ ok: code === 0, mode: 'LIVE', stdout, stderr, code }));
  });
}

export async function runWithMockFallback(
  scriptName: string,
  args: string[],
): Promise<ScriptRunResult> {
  const live = await runScript(scriptName, args);
  if (live.ok) return live;
  const mock = await runScript(scriptName, [...args, '--mock']);
  return { ...mock, mode: 'MOCK', stderr: [live.stderr, mock.stderr].filter(Boolean).join('\n') };
}

export async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(filePath, 'utf8');
  if (Buffer.byteLength(raw, 'utf8') > 5 * 1024 * 1024) throw new Error('Arquivo de pesquisa excede o limite permitido');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON de pesquisa inválido');
  return value as Record<string, unknown>;
}

export async function writeTextAtomic(filePath: string, contents: string): Promise<void> {
  if (Buffer.byteLength(contents, 'utf8') > 10 * 1024 * 1024) throw new Error('Rascunho excede o limite permitido');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, contents, { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temporary, filePath);
}

export async function updateManifest(
  campaignName: string,
  updater: (manifest: Record<string, unknown>) => Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const filePath = manifestPath(campaignName);
  let manifest: Record<string, unknown> = {};
  try {
    manifest = await readJsonFile(filePath);
  } catch {
    // A workspace may be created by this request if the external initializer
    // has not run yet; the manifest remains a normal JSON artifact on disk.
  }
  const updated = updater(manifest);
  updated.updated_at = new Date().toISOString();
  await writeTextAtomic(filePath, JSON.stringify(updated, null, 2));
  return updated;
}
