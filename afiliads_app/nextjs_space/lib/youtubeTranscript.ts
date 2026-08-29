export async function getYoutubeVideoId(urlOrId: string): Promise<string> {
  const clean = urlOrId.trim();
  if (clean.length === 11 && !clean.includes('/') && !clean.includes('.')) {
    return clean;
  }
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?]|$)/,
    /youtu\.be\/([0-9A-Za-z_-]{11})/,
    /embed\/([0-9A-Za-z_-]{11})/,
    /shorts\/([0-9A-Za-z_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) return match[1];
  }
  throw new Error(`Não foi possível extrair um Video ID válido da URL do YouTube: ${urlOrId}`);
}

function extractJsonData(html: string, key: string): any {
  const index = html.indexOf(key);
  if (index === -1) return null;

  const startIndex = html.indexOf('{', index);
  if (startIndex === -1) return null;

  let braceCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < html.length; i++) {
    const char = html[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          const jsonString = html.substring(startIndex, i + 1);
          try {
            return JSON.parse(jsonString);
          } catch (e) {
            console.error('[youtube-extractor] Falha ao fazer parse do JSON balanceado:', e);
            return null;
          }
        }
      }
    }
  }
  return null;
}

export async function fetchYoutubeTranscript(videoUrl: string): Promise<{ text: string; title: string }> {
  const videoId = await getYoutubeVideoId(videoUrl);
  console.log(`[youtube-extractor] Buscando transcrição oficial para o vídeo ID: ${videoId}...`);

  try {
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!videoPageResponse.ok) {
      throw new Error(`YouTube retornou status ${videoPageResponse.status}`);
    }

    const html = await videoPageResponse.text();

    // Extrair título do vídeo
    let title = `YouTube Video ${videoId}`;
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(' - YouTube', '').trim();
    }

    // Tentar primeiro obter de "ytInitialPlayerResponse"
    let captionsData = null;
    const playerResponse = extractJsonData(html, 'ytInitialPlayerResponse =');
    if (playerResponse && playerResponse.captions && playerResponse.captions.playerCaptionsTracklistRenderer) {
      captionsData = playerResponse.captions.playerCaptionsTracklistRenderer;
    } else {
      // Fallback para buscar diretamente no HTML caso o playerResponse não tenha sido extraído
      captionsData = extractJsonData(html, '"playerCaptionsTracklistRenderer"');
    }

    if (!captionsData) {
      throw new Error('Nenhuma legenda pública ou transcrição disponível para este vídeo (captionsData nulo).');
    }

    const captionTracks = captionsData.captionTracks;
    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error('Nenhuma faixa de legenda encontrada nas configurações do vídeo.');
    }

    // Tentar selecionar primeiro pt-BR, depois pt, depois en, depois es, ou a primeira disponível
    const track = captionTracks.find((t: any) => t.vssId?.includes('pt-BR') || t.languageCode === 'pt-BR')
      || captionTracks.find((t: any) => t.vssId?.includes('pt') || t.languageCode === 'pt')
      || captionTracks.find((t: any) => t.languageCode === 'en')
      || captionTracks.find((t: any) => t.languageCode === 'es')
      || captionTracks[0];

    const baseUrl = track.baseUrl;
    if (!baseUrl) {
      throw new Error('URL da faixa de legenda indisponível.');
    }

    // Buscar o arquivo de legenda (XML) do YouTube
    const transcriptResponse = await fetch(baseUrl, { signal: AbortSignal.timeout(10000) });
    if (!transcriptResponse.ok) {
      throw new Error(`Falha ao obter conteúdo da legenda: HTTP ${transcriptResponse.status}`);
    }

    const xml = await transcriptResponse.text();
    
    // Parse simples do XML de legendas do YouTube usando Expressão Regular para obter o texto
    const textMatches = xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g);
    const textBlocks: string[] = [];

    for (const match of textMatches) {
      // Decodificar entidades HTML comuns
      let text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, '/')
        .trim();
      
      if (text) {
        textBlocks.push(text);
      }
    }

    if (textBlocks.length === 0) {
      throw new Error('Nenhum texto de legenda pôde ser extraído do XML.');
    }

    const fullText = textBlocks.join(' ');
    return { text: fullText, title };

  } catch (error) {
    console.error(`[youtube-extractor] Falha ao extrair transcrição de ${videoId}:`, error);
    throw error;
  }
}
