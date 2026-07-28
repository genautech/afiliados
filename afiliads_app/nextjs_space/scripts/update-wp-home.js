const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

async function updateHomePage() {
  const sites = JSON.parse(process.env.WP_SITES_JSON || '{}');
  const site = sites['orangepeelmorning.com'];
  if (!site) {
    console.error('Domínio orangepeelmorning.com não configurado em WP_SITES_JSON');
    return;
  }

  const auth = Buffer.from(`${site.user}:${site.applicationPassword}`).toString('base64');

  const homeHtml = `<style>
  :root {
    --primary: #21435f;
    --primary-light: #3a5a78;
    --accent: #d97706;
    --bg-light: #f8fafc;
    --text: #334155;
    --border: #e2e8f0;
  }
  .opm-home { font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text); background: #fff; line-height: 1.6; }
  .opm-header { background: var(--primary); color: #fff; padding: 28px 20px; text-align: center; border-bottom: 4px solid var(--accent); }
  .opm-header h1 { font-family: 'Source Serif 4', Georgia, serif; margin: 0; font-size: 32px; font-weight: 700; color: #fff; }
  .opm-header p { margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 0.05em; text-transform: uppercase; }
  
  .opm-container { max-width: 900px; margin: 0 auto; padding: 36px 20px; }
  
  .opm-hero-card { background: var(--bg-light); border: 1px solid var(--border); border-left: 6px solid var(--primary); border-radius: 8px; padding: 32px; margin-bottom: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
  .opm-badge { background: var(--primary-light); color: #fff; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 12px; }
  .opm-hero-card h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: 26px; color: var(--primary); margin: 0 0 12px; }
  .opm-hero-card p { font-size: 16px; margin: 0 0 20px; color: #475569; }
  .opm-btn { display: inline-block; background: var(--primary); color: #fff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; transition: background 0.2s; }
  .opm-btn:hover { background: var(--primary-light); }

  .opm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-bottom: 40px; }
  .opm-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 20px; transition: transform 0.2s; }
  .opm-card h3 { font-family: 'Source Serif 4', Georgia, serif; font-size: 18px; color: var(--primary); margin: 0 0 10px; }
  .opm-card p { font-size: 14px; color: #64748b; margin: 0 0 14px; }
  .opm-card a { color: var(--primary-light); font-weight: 600; font-size: 14px; text-decoration: none; }
  .opm-card a:hover { text-decoration: underline; }

  .opm-footer { background: var(--bg-light); border-top: 1px solid var(--border); padding: 32px 20px; font-size: 13px; color: #64748b; text-align: center; }
  .opm-footer-links { display: flex; justify-content: center; gap: 20px; margin-bottom: 16px; }
  .opm-footer-links a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .opm-disclaimer { max-width: 760px; margin: 0 auto; line-height: 1.5; font-size: 12px; }
</style>

<div class="opm-home">
  <div class="opm-header">
    <h1>Orange Peel Morning</h1>
    <p>Women's Health & Clinical Wellness Journal</p>
  </div>

  <div class="opm-container">
    <div class="opm-hero-card">
      <span class="opm-badge">Featured Clinical Review</span>
      <h2>Special Report: Female Pelvic Floor & Bladder Support Guide (2026)</h2>
      <p>An in-depth editorial review evaluating natural botanical compounds, pelvic muscle support nutrients, and real customer observations for daily bladder health.</p>
      <a href="https://orangepeelmorning.com/femicore-advertorial-advertorial-3/" class="opm-btn">Read Full Review & Analysis &rarr;</a>
    </div>

    <h2 style="font-family: 'Source Serif 4', serif; color: #21435f; font-size: 22px; margin-bottom: 20px;">Latest Health & Wellness Articles</h2>
    
    <div class="opm-grid">
      <div class="opm-card">
        <h3>Female Pelvic & Bladder Support Review</h3>
        <p>Comprehensive review on pelvic muscle tone, natural extracts, and urinary control support.</p>
        <a href="https://orangepeelmorning.com/femicore-advertorial-advertorial-3/">Read Article &rarr;</a>
      </div>
      <div class="opm-card">
        <h3>Authority Pelvic Health Guide</h3>
        <p>Scientific breakdown of botanical ingredients supporting women's bladder comfort.</p>
        <a href="https://orangepeelmorning.com/female-pelvic-bladder-support-authority-review/">Read Guide &rarr;</a>
      </div>
      <div class="opm-card">
        <h3>Natural Botanical Extracts</h3>
        <p>Exploring plant-based nutrients designed for feminine wellness and daily comfort.</p>
        <a href="https://orangepeelmorning.com/female-pelvic-bladder-support-authority-review/">Read Insights &rarr;</a>
      </div>
    </div>
  </div>

  <div class="opm-footer">
    <div class="opm-footer-links">
      <a href="https://orangepeelmorning.com/privacy-policy/">Privacy Policy</a>
      <a href="https://orangepeelmorning.com/terms-of-use/">Terms of Use</a>
      <a href="https://orangepeelmorning.com/contact/">Contact Us</a>
    </div>
    <div class="opm-disclaimer">
      <p><strong>Editorial Disclosure:</strong> Orange Peel Morning is an independent educational publication. We participate in affiliate marketing programs, which means we may earn a commission on editorially chosen products purchased through our links.</p>
      <p><strong>Medical Disclaimer:</strong> Content on this website is for informational purposes only and is not intended as medical advice. Always consult a qualified healthcare professional regarding any medical condition.</p>
    </div>
  </div>
</div>`;

  const res = await fetch('https://orangepeelmorning.com/wp-json/wp/v2/pages/22', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`
    },
    body: JSON.stringify({
      title: 'Orange Peel Morning - Women\'s Health Journal',
      content: homeHtml,
      status: 'publish'
    })
  });

  const data = await res.json();
  if (res.ok) {
    console.log('✅ Página de Entrada (Home) atualizada com sucesso no WordPress!');
    console.log('Link:', data.link);
  } else {
    console.error('❌ Erro ao atualizar Home no WP:', data.message);
  }
}

updateHomePage();
