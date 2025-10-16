const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWhatsAppColumns() {
  console.log('🔍 Verificando colunas de WhatsApp nas tabelas...\n');

  try {
    // Verificar estrutura da tabela leads2 - foco em chatid
    console.log('📋 Verificando tabela leads2 (coluna chatid):');
    const { data: leads2Sample, error: leads2Error } = await supabase
      .from('leads2')
      .select('chatid, data_do_agendamento')
      .not('chatid', 'is', null)
      .neq('chatid', '')
      .not('data_do_agendamento', 'is', null)
      .neq('data_do_agendamento', '')
      .limit(5);

    if (leads2Error) {
      console.error('❌ Erro ao consultar leads2:', leads2Error);
    } else {
      console.log(`✅ Encontrados ${leads2Sample?.length || 0} registros com chatid e data_do_agendamento`);
      if (leads2Sample && leads2Sample.length > 0) {
        console.log('📄 Amostra de dados leads2:');
        leads2Sample.forEach((record, index) => {
          console.log(`  ${index + 1}. chatid: "${record.chatid}" | data_do_agendamento: "${record.data_do_agendamento}"`);
        });
      }
    }

    console.log('\n📋 Verificando tabela MR_base_leads (coluna whatsapp):');
    const { data: mrBaseSample, error: mrBaseError } = await supabase
      .from('MR_base_leads')
      .select('whatsapp, data_do_agendamento')
      .not('whatsapp', 'is', null)
      .neq('whatsapp', '')
      .not('data_do_agendamento', 'is', null)
      .neq('data_do_agendamento', '')
      .limit(5);

    if (mrBaseError) {
      console.error('❌ Erro ao consultar MR_base_leads:', mrBaseError);
    } else {
      console.log(`✅ Encontrados ${mrBaseSample?.length || 0} registros com whatsapp e data_do_agendamento`);
      if (mrBaseSample && mrBaseSample.length > 0) {
        console.log('📄 Amostra de dados MR_base_leads:');
        mrBaseSample.forEach((record, index) => {
          console.log(`  ${index + 1}. whatsapp: "${record.whatsapp}" | data_do_agendamento: "${record.data_do_agendamento}"`);
        });
      }
    }

    // Análise de formatos de WhatsApp
    console.log('\n🔍 Análise de formatos de WhatsApp:');
    
    if (leads2Sample && leads2Sample.length > 0) {
      console.log('\n📱 Formatos de chatid em leads2:');
      leads2Sample.forEach((record, index) => {
        const chatid = record.chatid;
        const normalized = chatid.replace(/\D/g, '');
        console.log(`  ${index + 1}. Original: "${chatid}" → Normalizado: "${normalized}"`);
      });
    }

    if (mrBaseSample && mrBaseSample.length > 0) {
      console.log('\n📱 Formatos de whatsapp em MR_base_leads:');
      mrBaseSample.forEach((record, index) => {
        const whatsapp = record.whatsapp;
        const normalized = whatsapp.replace(/\D/g, '');
        console.log(`  ${index + 1}. Original: "${whatsapp}" → Normalizado: "${normalized}"`);
      });
    }

    // Verificar se existem possíveis duplicatas entre as tabelas
    console.log('\n🔍 Verificando possíveis duplicatas entre tabelas...');
    
    if (leads2Sample && mrBaseSample && leads2Sample.length > 0 && mrBaseSample.length > 0) {
      const leads2Normalized = leads2Sample.map(r => r.chatid.replace(/\D/g, ''));
      const mrBaseNormalized = mrBaseSample.map(r => r.whatsapp.replace(/\D/g, ''));
      
      const duplicates = leads2Normalized.filter(phone => mrBaseNormalized.includes(phone));
      
      if (duplicates.length > 0) {
        console.log(`⚠️  Encontradas ${duplicates.length} possíveis duplicatas entre as tabelas:`);
        duplicates.forEach(phone => console.log(`  📞 ${phone}`));
      } else {
        console.log('✅ Nenhuma duplicata encontrada na amostra');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkWhatsAppColumns();