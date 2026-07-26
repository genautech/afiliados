#!/usr/bin/env node
// Fluxo OAuth único: abre um servidor local, gera a URL de autorização,
// aguarda o redirect com o "code" e troca por um refresh token, salvando em .env.
import http from 'http';
import { URL, fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { getOAuthClient, GMAIL_SCOPES } from '../gmail.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

async function main() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const redirectUri = `http://localhost:${port}`;

  const client = getOAuthClient();
  client.redirectUri = redirectUri;

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    redirect_uri: redirectUri,
  });

  console.log('\nAbra esta URL no navegador e faça login com genaujunior@gmail.com:\n');
  console.log(authUrl);
  console.log('\nAguardando autorização...\n');

  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url, redirectUri);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (error) {
        res.end(`<h1>Erro: ${error}</h1>Pode fechar esta aba.`);
        reject(new Error(error));
      } else {
        res.end('<h1>Autorizado!</h1>Pode fechar esta aba e voltar ao terminal.');
        resolve(code);
      }
    });
  });
  server.close();

  const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });
  if (!tokens.refresh_token) {
    console.error('\nNão veio refresh_token. Provavelmente essa conta já autorizou este app antes.');
    console.error('Revogue o acesso em https://myaccount.google.com/permissions e rode de novo.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const updated = envContent.includes('GMAIL_REFRESH_TOKEN=')
    ? envContent.replace(/GMAIL_REFRESH_TOKEN=.*/g, `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`)
    : `${envContent}\nGMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`;
  fs.writeFileSync(envPath, updated);

  console.log('\nRefresh token salvo em mcp-afiliads/.env. Autorização concluída para genaujunior@gmail.com.');
}

main().catch((err) => {
  console.error('Falha na autorização:', err.message);
  process.exit(1);
});
