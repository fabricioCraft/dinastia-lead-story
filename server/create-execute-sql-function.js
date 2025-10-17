const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function createExecuteSqlFunction() {
  console.log('🔧 Criando função execute_sql no Supabase...');
  
  const sql = `
    CREATE OR REPLACE FUNCTION public.execute_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        -- Executar a query e retornar o resultado como JSON
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
        
        -- Se o resultado for null (nenhuma linha), retornar array vazio
        IF result IS NULL THEN
            result := '[]'::json;
        END IF;
        
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Em caso de erro, retornar um JSON com informações do erro
            RETURN json_build_object(
                'error', true,
                'message', SQLERRM,
                'code', SQLSTATE
            );
    END;
    $$;
    
    -- Conceder permissões necessárias
    GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO anon;
    GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;
  `;

  try {
    // Tentar criar a função usando RPC exec
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Erro ao criar função execute_sql:', error);
      console.log('\n📋 SQL para executar manualmente no Supabase Dashboard:');
      console.log('='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
    } else {
      console.log('✅ Função execute_sql criada com sucesso!');
      
      // Testar a função
      console.log('🧪 Testando a função execute_sql...');
      const testResult = await supabase.rpc('execute_sql', { 
        query: 'SELECT 1 as test_value, NOW() as test_timestamp' 
      });
      
      if (testResult.error) {
        console.error('❌ Erro ao testar função:', testResult.error);
      } else {
        console.log('✅ Função testada com sucesso!');
        console.log('Resultado do teste:', testResult.data);
      }
    }
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

createExecuteSqlFunction().then(() => {
  console.log('🏁 Processo concluído');
  process.exit(0);
});