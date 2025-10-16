const axios = require('axios');

async function analyzeUtmSources() {
  try {
    console.log('Analisando dados do cache local...');
    
    // Buscar dados do nosso endpoint
    const response = await axios.get('http://localhost:3001/dashboard/utm-origin-summary');
    const cacheData = response.data;
    
    console.log(`\n=== DADOS DO CACHE ===`);
    console.log(`Total de leads: ${cacheData.kpis.totalLeads}`);
    console.log(`Última atualização: ${cacheData.lastUpdated}`);
    
    console.log(`\n=== DISTRIBUIÇÃO POR ORIGEM ===`);
    cacheData.leadsByOrigin.forEach(item => {
      const percentage = ((item.count / cacheData.kpis.totalLeads) * 100).toFixed(2);
      console.log(`${item.origin}: ${item.count} leads (${percentage}%)`);
    });
    
    // Agora vamos tentar analisar os dados brutos do webhook
    console.log('\n=== TENTANDO ANALISAR DADOS BRUTOS ===');
    try {
      const webhookResponse = await axios.get('https://n8n.dinastia.uk/webhook/leads1');
      const webhookData = webhookResponse.data;
      
      console.log(`Total de registros no webhook: ${webhookData.leadsRecords.length}`);
      
      // Analisar primeiros 20 registros
      console.log('\n=== AMOSTRA DOS PRIMEIROS 20 REGISTROS ===');
      webhookData.leadsRecords.slice(0, 20).forEach((record, index) => {
        const directUtm = record._pxa_first_utm_source;
        const metaUtm = record.meta?._pxa_first_utm_source;
        
        console.log(`${index + 1}. Direct: "${directUtm}" | Meta: "${metaUtm}"`);
      });
      
      // Contar valores únicos de UTM source
      const utmValues = new Map();
      webhookData.leadsRecords.forEach(record => {
        let utmSource = record._pxa_first_utm_source || record.meta?._pxa_first_utm_source;
        if (!utmSource) utmSource = 'null/undefined';
        
        utmValues.set(utmSource, (utmValues.get(utmSource) || 0) + 1);
      });
      
      console.log('\n=== TOP 30 VALORES ÚNICOS DE UTM SOURCE ===');
      const sortedUtm = Array.from(utmValues.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);
      
      sortedUtm.forEach(([value, count]) => {
        const percentage = ((count / webhookData.leadsRecords.length) * 100).toFixed(2);
        console.log(`"${value}": ${count} (${percentage}%)`);
      });
      
    } catch (webhookError) {
      console.log('Webhook não acessível no momento:', webhookError.message);
    }
    
  } catch (error) {
    console.error('Erro ao analisar dados:', error.message);
  }
}

analyzeUtmSources();