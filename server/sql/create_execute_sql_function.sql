-- Função execute_sql para executar consultas SQL dinâmicas
-- Esta função é necessária para o dashboard funcionar corretamente

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

-- Comentário para documentação
COMMENT ON FUNCTION public.execute_sql(text) IS 'Executa consultas SQL dinâmicas e retorna o resultado como JSON. Necessária para o dashboard funcionar corretamente.';

-- Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;