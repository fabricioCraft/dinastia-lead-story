import { Controller, Get, Post, Logger, Body } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';

@Controller('test-sql')
export class TestSqlController {
  private readonly logger = new Logger(TestSqlController.name);

  constructor(
    private readonly supabaseService: SupabaseService
  ) {}

  @Get('test-timestamp-function')
  async testTimestampFunction() {
    try {
      const result = await this.supabaseService.getAverageTimeInStageFromTimestamps();
      return {
        success: true,
        data: result,
        message: 'Function executed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Function execution failed'
      };
    }
  }

  @Get('check-snapshot-table')
  async checkSnapshotTable() {
    try {
      // Verificar tabela leads2 do Supabase
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }
      const { data, error } = await client
        .from('leads2')
        .select('*')
        .limit(3);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        count: data?.length || 0,
        sample: data || [],
        message: 'leads2 table accessed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Failed to access leads2 table'
      };
    }
  }

  @Get('test-new-timestamp-function')
  async testNewTimestampFunction() {
    try {
      const result = await this.supabaseService.getAverageTimeInStageWithOngoing();
      return {
        success: true,
        data: result,
        message: 'New function executed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'New function execution failed'
      };
    }
  }

  @Get('check-valid-timestamps')
  async checkValidTimestamps() {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const result = await client
        .from('leads2')
        .select('id, email, datacriacao')
        .not('datacriacao', 'is', null)
        .limit(10);

      return {
        success: true,
        data: result.data,
        count: result.data?.length || 0,
        message: 'Valid timestamps found in leads2'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Failed to find valid timestamps in leads2'
      };
    }
  }

  @Get('test-direct-sql')
  async testDirectSql() {
    try {
      // Testar uma query simples na tabela leads2
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const result = await client
        .from('leads2')
        .select('count(*)')
        .not('datacriacao', 'is', null);

      return {
        success: true,
        data: result.data,
        message: 'Direct SQL test successful with leads2'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Direct SQL test failed'
      };
    }
  }

  @Get('create-new-function')
  async createNewFunction() {
    try {
      // Executar o SQL para criar a nova função baseada em lead_stage_history
      const sqlFunction = `
        CREATE OR REPLACE FUNCTION calculate_stage_durations_with_ongoing()
        RETURNS TABLE(stage_name TEXT, avg_duration_seconds NUMERIC) AS $$
        BEGIN
          RETURN QUERY
          
          -- Calcular duração média por estágio baseado no histórico
          SELECT 
            lsh.stage_name::TEXT as stage_name,
            COALESCE(
              AVG(EXTRACT(EPOCH FROM (COALESCE(lsh.exited_at, NOW()) - lsh.entered_at))),
              0
            )::NUMERIC as avg_duration_seconds
          FROM lead_stage_history lsh
          WHERE lsh.entered_at IS NOT NULL
          GROUP BY lsh.stage_name;

        END;
        $$ LANGUAGE plpgsql;
      `;

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const result = await client.rpc('exec', { sql: sqlFunction });

      return {
        success: true,
        data: result.data,
        message: 'Function created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Function creation failed'
      };
    }
  }

  @Get('debug-sync-data')
  async debugSyncData() {
    try {
        // Buscar dados das tabelas principais
        const client = this.supabaseService.getClient();
        if (!client) {
          throw new Error('Cliente Supabase não inicializado');
        }
        
        const { data: leadsData, error: leadsError } = await client
          .from('leads2')
          .select('*')
          .limit(2);
        
        const { data: stageData, error: stageError } = await client
          .from('lead_stage_history')
          .select('*')
          .limit(2);
        
        return {
          success: true,
          leads2: {
            count: leadsData?.length || 0,
            sample: leadsData || [],
            error: leadsError?.message
          },
          stage_history: {
            count: stageData?.length || 0,
            sample: stageData || [],
            error: stageError?.message
          }
        };
       } catch (error) {
         return {
           success: false,
           error: error instanceof Error ? error.message : 'Erro desconhecido'
         };
       }
   }

   // Métodos relacionados ao Kommo removidos - não utilizamos mais essa integração

    //     return {
    //       success: true,
    //       results
    //     };
    //   } catch (error) {
    //     return {
    //       success: false,
    //       error: error instanceof Error ? error.message : 'Erro desconhecido'
    //     };
    //   }
    //  }

     // @Get('debug-lead-structure')
     // async debugLeadStructure() {
     //   try {
     //     // Buscar alguns leads com mais detalhes
     //     const leadsResponse = await (this.kommoService as any).apiClient.get('/leads', {
     //       params: {
     //         limit: 3,
     //         with: 'custom_fields,pipeline,status',
     //         filter: {
     //           pipeline_id: (this.kommoService as any).pipelineId
     //         }
     //       }
     //     });

     //     const leads = leadsResponse.data._embedded?.leads || [];
     //     
     //     return {
     //       success: true,
     //       totalLeads: leads.length,
     //       leadsStructure: leads.map(lead => ({
     //         id: lead.id,
     //         status_id: lead.status_id,
     //         pipeline_id: lead.pipeline_id,
     //         name: lead.name,
     //         // Verificar se há informações de status em outros campos
     //         allFields: Object.keys(lead),
     //         // Verificar se há dados embedded
     //         embedded: lead._embedded ? Object.keys(lead._embedded) : null,
     //         // Verificar se há links
     //         links: lead._links ? Object.keys(lead._links) : null
     //       }))
     //     };
     //   } catch (error) {
     //     return {
     //       success: false,
     //       error: error.message
     //     };
     //   }
     //  }

      @Get('check-lead-stage-durations-table')
      async checkLeadStageDurationsTable() {
        try {
          const client = this.supabaseService.getClient();
          if (!client) {
            throw new Error('Cliente Supabase não inicializado');
          }

          const { data, error } = await client
            .from('lead_stage_durations')
            .select('*')
            .limit(1);
          
          if (error) {
            return {
              success: false,
              exists: false,
              error: error.message
            };
          }
          
          return {
            success: true,
            exists: true,
            message: 'Tabela lead_stage_durations existe e está acessível'
          };
        } catch (error) {
          return {
            success: false,
            exists: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          };
        }
      }

      // Método debugUpsertProcess removido - não utilizamos mais Kommo nem px_leads

      // Métodos debugTableStructure e fixTableStructure removidos - não utilizamos mais kommo_leads_snapshot

      // Métodos relacionados ao kommo_leads_snapshot removidos - não utilizamos mais essa tabela

  @Get('check-data')
  async checkData() {
    try {
      // Buscar todos os leads da tabela leads2
      const allLeads = await this.supabaseService.selectFromTable('leads2', 100);
      
      // Filtrar registros que têm dados válidos
      const recordsWithData = allLeads.data?.filter(record => 
        record.datacriacao || 
        record.origem || 
        record.email ||
        record.telefone
      ) || [];

      return {
        success: true,
        totalRecords: allLeads.data?.length || 0,
        sampleRecords: allLeads.data?.slice(0, 5) || [],
        recordsWithData: recordsWithData.slice(0, 5),
        dataStats: {
          total: recordsWithData.length,
          percentage: allLeads.data?.length > 0 ? (recordsWithData.length / allLeads.data.length * 100).toFixed(2) + '%' : '0%'
        },
        message: 'Dados verificados com sucesso'
      };
    } catch (error) {
      console.error('Erro ao verificar dados:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('discover-all-columns')
  async discoverAllColumns() {
    try {
      const testId = Math.floor(Math.random() * 1000000);
      
      // Lista de todas as possíveis colunas para testar
      const possibleColumns = [
        'lead_id',
        'current_status_name', 
        'status_name',
        'pipeline_id',
        'updated_at',
        'created_at',
        'origin',
        'ts_novos_leads',
        'ts_tentado_conexao', 
        'ts_conectado_qualificacao',
        'ts_noshow',
        'ts_reuniao',
        'ts_oportunidade',
        'ts_negociacao',
        'ts_leads_novos',
        'ts_closers_em_contato',
        'ts_qualificacao',
        'ts_proposta',
        'ts_fechamento',
        'ts_perdido'
      ];

      const existingColumns: string[] = [];
      const missingColumns: string[] = [];
      
      for (const column of possibleColumns) {
        try {
          let testData = { lead_id: testId + possibleColumns.indexOf(column) };
          
          // Adicionar valor apropriado para cada tipo de coluna
          if (column.startsWith('ts_') || column.includes('_at')) {
            testData[column] = new Date().toISOString();
          } else if (column === 'pipeline_id') {
            testData[column] = 123456;
          } else if (column.includes('status') || column === 'origin') {
            testData[column] = 'teste';
          } else {
            testData[column] = 'teste';
          }
          
          const columnExists = await this.supabaseService.testColumnExists(
            'leads2', 
            column, 
            testData[column]
          );
          
          if (columnExists) {
            existingColumns.push(column);
            console.log(`✅ Coluna ${column} existe`);
          } else {
            missingColumns.push(column);
            console.log(`❌ Coluna ${column} não existe`);
          }
        } catch (error) {
          missingColumns.push(column);
          console.log(`❌ Coluna ${column} erro no teste: ${error.message}`);
        }
      }

      return {
        success: true,
        existingColumns: existingColumns.sort(),
        missingColumns: missingColumns.sort(),
        totalTested: possibleColumns.length,
        message: 'Descoberta de colunas concluída'
      };
    } catch (error) {
      console.error('Erro ao descobrir colunas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Métodos testSimpleInsert e checkTableSchema removidos - não utilizamos mais kommo_leads_snapshot

  // Método testMinimalInsert removido - não utilizamos mais kommo_leads_snapshot

  @Post('execute-sql')
  async executeSql(@Body() body: { sql: string }) {
    try {
      const { sql } = body;
      
      if (!sql || sql.trim().length === 0) {
        return {
          success: false,
          error: 'SQL query is required'
        };
      }

      console.log('🚀 Executando SQL:', sql.substring(0, 100) + '...');

      const client = this.supabaseService.getClient();
      if (!client) {
        return {
          success: false,
          error: 'Supabase client not initialized'
        };
      }

      // Tentar diferentes métodos de execução SQL
      let data, error;
      
      // Método 1: Tentar usar from() para CREATE TABLE
      if (sql.trim().toUpperCase().startsWith('CREATE TABLE')) {
        try {
          // Para CREATE TABLE, vamos usar uma abordagem diferente
          // Vamos tentar inserir um registro de teste para verificar se a tabela existe
          const tableName = sql.match(/CREATE TABLE.*?(\w+)\s*\(/i)?.[1];
          if (tableName) {
            const testResult = await client.from(tableName).select('*').limit(1);
            if (testResult.error && testResult.error.message.includes('does not exist')) {
              return {
                success: false,
                error: `Tabela ${tableName} não existe. Execute o SQL manualmente no Supabase Dashboard.`,
                sql_to_execute: sql
              };
            } else {
              return {
                success: true,
                message: `Tabela ${tableName} já existe`,
                data: testResult.data
              };
            }
          }
        } catch (e) {
          error = e;
        }
      } else {
        // Para outras queries, executar via função RPC existente execute_sql
        const rpcResult = await client.rpc('execute_sql', { query: sql });
        data = rpcResult.data;
        error = rpcResult.error;
      }

      if (error) {
        console.error('❌ Erro ao executar SQL:', error.message);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ SQL executado com sucesso');
      return {
        success: true,
        data,
        message: 'SQL executed successfully'
      };

    } catch (error) {
      console.error('Erro ao executar SQL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}