import { google } from 'googleapis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Escopos deliberadamente limitados: ler e-mails + criar/editar rascunhos.
// Sem gmail.send — o agente nunca consegue enviar e-mail sozinho, só deixar
// a resposta pronta em Rascunhos para o humano revisar e enviar.
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
];

export function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados em mcp-afiliads/.env');
  }
  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, 'http://localhost');
  if (GMAIL_REFRESH_TOKEN) client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return client;
}

export function gmailClient() {
  const auth = getOAuthClient();
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    throw new Error('GMAIL_REFRESH_TOKEN vazio — rode "node mcp-afiliads/scripts/gmail-auth.mjs" para autorizar a conta e gerar o refresh token.');
  }
  return google.gmail({ version: 'v1', auth });
}

function decodeHeader(headers, name) {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function extractPlainBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  for (const part of payload.parts ?? []) {
    const found = extractPlainBody(part);
    if (found) return found;
  }
  // fallback: primeiro corpo disponível (ex.: só html)
  if (payload.body?.data) return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  return '';
}

export async function listarEmails({ query = 'is:unread', max = 10 } = {}) {
  const gmail = gmailClient();
  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: max });
  const messages = list.data.messages ?? [];
  const out = [];
  for (const m of messages) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
    const headers = msg.data.payload?.headers ?? [];
    out.push({
      id: m.id,
      threadId: m.threadId,
      de: decodeHeader(headers, 'From'),
      assunto: decodeHeader(headers, 'Subject'),
      data: decodeHeader(headers, 'Date'),
      resumo: msg.data.snippet,
    });
  }
  return out;
}

export async function lerEmail(messageId) {
  const gmail = gmailClient();
  const msg = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const headers = msg.data.payload?.headers ?? [];
  return {
    id: msg.data.id,
    threadId: msg.data.threadId,
    de: decodeHeader(headers, 'From'),
    para: decodeHeader(headers, 'To'),
    assunto: decodeHeader(headers, 'Subject'),
    data: decodeHeader(headers, 'Date'),
    corpo: extractPlainBody(msg.data.payload),
  };
}

function buildRawReply({ to, subject, body, threadId, inReplyToMessageId, references }) {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject.startsWith('Re:') ? subject : `Re: ${subject}`}`,
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (inReplyToMessageId) headers.push(`In-Reply-To: ${inReplyToMessageId}`);
  if (references) headers.push(`References: ${references}`);
  const raw = `${headers.join('\r\n')}\r\n\r\n${body}`;
  return Buffer.from(raw).toString('base64url');
}

export async function criarRascunhoResposta({ messageId, corpo }) {
  const gmail = gmailClient();
  const original = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Message-ID', 'References'] });
  const headers = original.data.payload?.headers ?? [];
  const to = decodeHeader(headers, 'From');
  const subject = decodeHeader(headers, 'Subject');
  const msgIdHeader = decodeHeader(headers, 'Message-ID');
  const references = decodeHeader(headers, 'References');
  const raw = buildRawReply({
    to,
    subject,
    body: corpo,
    inReplyToMessageId: msgIdHeader,
    references: [references, msgIdHeader].filter(Boolean).join(' '),
  });
  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw, threadId: original.data.threadId } },
  });
  return { draftId: draft.data.id, para: to, assunto: subject.startsWith('Re:') ? subject : `Re: ${subject}` };
}
