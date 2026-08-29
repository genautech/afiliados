// Script para Validação de Conexão GCP e Google Agent Studio
// Executar com: npx tsx scripts/test-gcp-connection.ts

import { GoogleAuth } from 'google-auth-library';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis do .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function validateGCPAuth() {
  console.log('=== VALIDAÇÃO DE CONEXÃO GCP & AGENT STUDIO ===\n');

  const agentUrl = process.env.AD_SCOUT_AGENT_URL;
  const agentToken = process.env.AD_SCOUT_AGENT_TOKEN;

  console.log(`- AD_SCOUT_AGENT_URL configurado: ${agentUrl ? 'Sim' : 'Não (Roda em Mock Mode por padrão)'}`);
  if (agentUrl) {
    console.log(`  URL: ${agentUrl}`);
  }
  console.log(`- AD_SCOUT_AGENT_TOKEN configurado: ${agentToken ? 'Sim' : 'Não'}`);

  console.log('\n--- 1. Verificando Autenticação Google SDK (GCP) ---');
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    console.log('Tentando obter o cliente de autenticação...');
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    console.log('✅ Conexão GCP estabelecida com sucesso!');
    console.log(`  GCP Project ID detectado: "${projectId}"`);
    console.log(`  Tipo de Credencial: ${client.constructor.name}`);

    // Obter um access token ativo para fins de teste de conexão
    console.log('Tentando obter token de acesso GCP para teste...');
    const accessTokenResponse = await client.getAccessToken();
    if (accessTokenResponse.token) {
      console.log('✅ Token de acesso obtido com sucesso!');
      console.log(`  Token (primeiros 15 caracteres): ${accessTokenResponse.token.slice(0, 15)}...`);
    } else {
      console.log('⚠️ Token de acesso não retornou no payload, mas não houve erro.');
    }
  } catch (error: any) {
    console.log('❌ Falha na autenticação GCP local:');
    console.log(`  Motivo: ${error.message}`);
    console.log('\n💡 DICA: Certifique-se de que a variável GOOGLE_APPLICATION_CREDENTIALS está apontando para o arquivo JSON da sua Service Account ou que você esteja autenticado via gcloud CLI (`gcloud auth application-default login`).');
  }

  if (agentUrl) {
    console.log('\n--- 2. Testando Ping no Google Agent Studio Endpoint ---');
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (agentToken) {
        headers['Authorization'] = `Bearer ${agentToken}`;
      }

      console.log(`Disparando requisição POST de teste de conexão para: ${agentUrl}...`);
      const start = Date.now();
      const response = await fetch(agentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: 'ping-connection-test-only', productType: 'AFFILIATE' }),
        signal: AbortSignal.timeout(10000), // timeout rápido de 10s para teste de conexão
      });

      const duration = Date.now() - start;
      console.log(`Resposta do Servidor: HTTP ${response.status} em ${duration}ms`);

      if (response.ok) {
        console.log('✅ Conexão direta com o Agent Studio estabelecida e autenticada!');
        const data = await response.json();
        console.log('  Dados retornados:', JSON.stringify(data, null, 2).slice(0, 300) + '...');
      } else {
        const errText = await response.text().catch(() => 'Nenhum corpo de erro retornado');
        console.log(`⚠️ O servidor respondeu com erro HTTP ${response.status}.`);
        console.log(`  Detalhes: ${errText}`);
      }
    } catch (error: any) {
      console.log('❌ Falha ao tentar conectar fisicamente no endpoint do Agent Studio:');
      console.log(`  Erro: ${error.message}`);
    }
  }

  console.log('\n===============================================');
}

validateGCPAuth();
