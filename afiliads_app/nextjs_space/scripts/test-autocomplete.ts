import { getAutocompleteIntentMap } from '../lib/autocompleteService';

async function main() {
  console.log('🤖 Inicializando teste do Google Search Autocomplete Crawler...');
  const keyword = 'diet caps';
  console.log(`🔍 Pesquisando intenções de busca para a palavra-chave: "${keyword}" (EN)...`);
  
  const startTime = Date.now();
  const result = await getAutocompleteIntentMap(keyword, 'en');
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Pesquisa concluída em ${duration}s!`);
  console.log(`📍 Palavra-chave: ${result.keyword}`);
  console.log(`📊 Total de sugestões capturadas: ${result.intentMap.all.length}`);
  
  console.log('\n--- ❓ PERGUNTAS (Questions) ---');
  console.log(result.intentMap.questions.slice(0, 5));

  console.log('\n--- 💰 INTENÇÃO COMERCIAL (Commercial) ---');
  console.log(result.intentMap.commercial.slice(0, 5));

  console.log('\n--- 📖 INFORMAÇÕES (Informational) ---');
  console.log(result.intentMap.informational.slice(0, 5));

  console.log('\n--- 🏷️ MARCA (Brand) ---');
  console.log(result.intentMap.brand.slice(0, 5));
}

main().catch(err => {
  console.error('❌ Erro no teste do autocomplete:', err);
  process.exit(1);
});
