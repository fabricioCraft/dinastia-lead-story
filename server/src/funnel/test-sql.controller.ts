import { Controller, Get, Post, Logger, Body } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { KommoService } from '../services/kommo.service';

@Controller('test-sql')
export class TestSqlController {
  private readonly logger = new Logger(TestSqlController.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly kommoService: KommoService
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
      const snapshots = await this.supabaseService.getAllKommoLeadsSnapshot();
      return {
        success: true,
        count: snapshots.length,
        sample: snapshots.slice(0, 3), // Primeiros 3 registros como amostra
        message: 'Snapshot table accessed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Failed to access snapshot table'
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
        .from('kommo_leads_snapshot')
        .select('lead_id, current_status_name, ts_novos_leads, ts_tentado_conexao, ts_conectado_qualificacao, ts_noshow, ts_reuniao, ts_oportunidade, ts_negociacao, ts_venda_realizada')
        .or('ts_novos_leads.not.is.null,ts_tentado_conexao.not.is.null,ts_conectado_qualificacao.not.is.null,ts_noshow.not.is.null,ts_reuniao.not.is.null,ts_oportunidade.not.is.null,ts_negociacao.not.is.null,ts_venda_realizada.not.is.null')
        .limit(10);

      return {
        success: true,
        data: result.data,
        count: result.data?.length || 0,
        message: 'Valid timestamps found'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Failed to find valid timestamps'
      };
    }
  }

  @Get('test-direct-sql')
  async testDirectSql() {
    try {
      // Testar uma query simples primeiro
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const result = await client
        .from('kommo_leads_snapshot')
        .select('count(*)')
        .not('ts_tentado_conexao', 'is', null);

      return {
        success: true,
        data: result.data,
        message: 'Direct SQL test successful'
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
      // Executar o SQL para criar a nova função
      const sqlFunction = `
        CREATE OR REPLACE FUNCTION calculate_stage_durations_with_ongoing()
        RETURNS TABLE(stage_name TEXT, avg_duration_seconds NUMERIC) AS $$
        BEGIN
          RETURN QUERY
          
          -- Duração em 'Tentado Conexão' = (Tempo de entrada em 'Conectado/Qualificação' OU AGORA) - (Tempo de entrada em 'Tentado Conexão')
          SELECT 
            'Tentado Conexão'::TEXT as stage_name,
            COALESCE(
              AVG(EXTRACT(EPOCH FROM (COALESCE(ts_conectado_qualificacao, NOW()) - ts_tentado_conexao))),
              0
            )::NUMERIC as avg_duration_seconds
          FROM kommo_leads_snapshot 
          WHERE ts_tentado_conexao IS NOT NULL;

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
        // Buscar dados do Kommo
        const leadsFromKommo = await this.kommoService.getLeadsFromPipeline();
        
        // Buscar dados do snapshot
        const snapshotData = await this.supabaseService.getAllKommoLeadsSnapshot();
        
        return {
          success: true,
          kommo: {
            count: leadsFromKommo.length,
            sample: leadsFromKommo.slice(0, 2)
          },
          snapshot: {
            count: snapshotData.length,
            sample: snapshotData.slice(0, 2)
          }
        };
       } catch (error) {
         return {
           success: false,
           error: error instanceof Error ? error.message : 'Erro desconhecido'
         };
       }
   }

   @Get('debug-pipelines')
   async debugPipelines() {
     try {
       // Usar método público do KommoService para acessar informações de pipelines
       const pipelinesInfo = await this.kommoService.getPipelinesInfo();
       
       return pipelinesInfo;
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Erro desconhecido'
       };
     }
    }

    @Get('debug-status-endpoints')
    async debugStatusEndpoints() {
      try {
        const results: any[] = [];
        
        // Tentar diferentes endpoints para buscar status
        try {
          const pipelinesWithStatus = await (this.kommoService as any).apiClient.get('/leads/pipelines', {
            params: { with: 'statuses' }
          });
          results.push({
            endpoint: '/leads/pipelines?with=statuses',
            success: true,
            data: pipelinesWithStatus.data._embedded?.pipelines?.map(p => ({
              id: p.id,
              name: p.name,
              statusCount: p.statuses?.length || 0
            })) || []
          });
        } catch (error) {
          results.push({
            endpoint: '/leads/pipelines?with=statuses',
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }

        // Tentar endpoint específico de status
        try {
          const statusResponse = await (this.kommoService as any).apiClient.get('/leads/statuses');
          results.push({
            endpoint: '/leads/statuses',
            success: true,
            data: statusResponse.data
          });
        } catch (error) {
          results.push({
            endpoint: '/leads/statuses',
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }

        // Tentar buscar um pipeline específico
        try {
          const pipelineId = (this.kommoService as any).pipelineId;
          const specificPipeline = await (this.kommoService as any).apiClient.get(`/leads/pipelines/${pipelineId}`);
          results.push({
            endpoint: `/leads/pipelines/${pipelineId}`,
            success: true,
            data: {
              id: specificPipeline.data.id,
              name: specificPipeline.data.name,
              statusCount: specificPipeline.data.statuses?.length || 0,
              statuses: specificPipeline.data.statuses?.map(s => ({ id: s.id, name: s.name })) || []
            }
          });
        } catch (error) {
          results.push({
            endpoint: `/leads/pipelines/${(this.kommoService as any).pipelineId}`,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }

        return {
          success: true,
          results
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
     }

     @Get('debug-lead-structure')
     async debugLeadStructure() {
       try {
         // Buscar alguns leads com mais detalhes
         const leadsResponse = await (this.kommoService as any).apiClient.get('/leads', {
           params: {
             limit: 3,
             with: 'custom_fields,pipeline,status',
             filter: {
               pipeline_id: (this.kommoService as any).pipelineId
             }
           }
         });

         const leads = leadsResponse.data._embedded?.leads || [];
         
         return {
           success: true,
           totalLeads: leads.length,
           leadsStructure: leads.map(lead => ({
             id: lead.id,
             status_id: lead.status_id,
             pipeline_id: lead.pipeline_id,
             name: lead.name,
             // Verificar se há informações de status em outros campos
             allFields: Object.keys(lead),
             // Verificar se há dados embedded
             embedded: lead._embedded ? Object.keys(lead._embedded) : null,
             // Verificar se há links
             links: lead._links ? Object.keys(lead._links) : null
           }))
         };
       } catch (error) {
         return {
           success: false,
           error: error.message
         };
       }
      }

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

      @Get('debug-upsert-process')
      async debugUpsertProcess() {
        try {
          // Buscar alguns leads do Kommo
          const leadsFromKommo = await this.kommoService.getLeadsFromPipeline();
          const sampleLeads = leadsFromKommo.slice(0, 3); // Apenas 3 leads para teste
          
          // Tentar fazer upsert manual
          this.logger.log('🧪 Testando upsert manual de 3 leads...');
          const upsertResult = await this.supabaseService.upsertKommoLeadsSnapshot(sampleLeads);
          
          // Verificar se foram inseridos
          const afterUpsert = await this.supabaseService.getAllKommoLeadsSnapshot();
          
          return {
            success: true,
            sampleLeads,
            upsertResult,
            afterUpsertCount: afterUpsert.length,
            afterUpsertSample: afterUpsert.slice(0, 3)
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            stack: error.stack
          };
        }
      }

      @Get('debug-table-structure')
      async debugTableStructure() {
        try {
          // Tentar uma consulta simples para verificar se a tabela existe
          const { data: testData, error: testError } = await (this.supabaseService as any).client
            .from('kommo_leads_snapshot')
            .select('*')
            .limit(1);

          // Tentar inserir um registro de teste para ver qual erro específico ocorre
          const testRecord = {
            lead_id: 999999,
            status_name: 'Test Status',
            pipeline_id: 123456,
            updated_at: new Date().toISOString()
          };

          const { data: insertData, error: insertError } = await (this.supabaseService as any).client
            .from('kommo_leads_snapshot')
            .insert([testRecord])
            .select();

          // Se inseriu com sucesso, deletar o registro de teste
          if (!insertError) {
            await (this.supabaseService as any).client
              .from('kommo_leads_snapshot')
              .delete()
              .eq('lead_id', 999999);
          }

          return {
            success: true,
            tableExists: !testError,
            selectError: testError?.message || null,
            insertError: insertError?.message || null,
            insertSuccess: !insertError,
            message: insertError ? 'Problema na estrutura da tabela' : 'Tabela funcionando corretamente'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          };
        }
      }

      @Post('fix-table-structure')
      async fixTableStructure() {
        try {
          // Adicionar coluna pipeline_id que está faltando
          const { data: alterData, error: alterError } = await (this.supabaseService as any).client
            .rpc('exec_sql', {
              sql: 'ALTER TABLE public.kommo_leads_snapshot ADD COLUMN IF NOT EXISTS pipeline_id integer;'
            });

          if (alterError) {
            return {
              success: false,
              error: `Erro ao adicionar coluna pipeline_id: ${alterError.message}`
            };
          }

          // Testar inserção após adicionar a coluna
          const testRecord = {
            lead_id: 999998,
            status_name: 'Test Status After Fix',
            pipeline_id: 123456,
            updated_at: new Date().toISOString()
          };

          const { data: insertData, error: insertError } = await (this.supabaseService as any).client
            .from('kommo_leads_snapshot')
            .insert([testRecord])
            .select();

          // Se inseriu com sucesso, deletar o registro de teste
          if (!insertError) {
            await (this.supabaseService as any).client
              .from('kommo_leads_snapshot')
              .delete()
              .eq('lead_id', 999998);
          }

          return {
            success: true,
            alterSuccess: !alterError,
            insertAfterFix: !insertError,
            insertError: insertError?.message || null,
            message: insertError ? 'Coluna adicionada mas ainda há problemas' : 'Tabela corrigida com sucesso'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          };
        }
      }

  /**
   * Endpoint para consultar dados da tabela kommo_leads_snapshot
   */
  @Get('debug-snapshot-data')
  async debugSnapshotData() {
    try {
      const { data, error } = await this.supabaseService
        .selectFromTable('kommo_leads_snapshot', 10);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        count: data?.length || 0,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Endpoint para descobrir a estrutura real da tabela kommo_leads_snapshot
   */
  @Get('discover-table-structure')
  async discoverTableStructure() {
    try {
      // Vamos tentar inserir registros com diferentes estruturas para descobrir quais colunas existem
      const testStructures = [
        // Estrutura 1: apenas lead_id
        { lead_id: 999991 },
        
        // Estrutura 2: com current_status_name
        { lead_id: 999992, current_status_name: 'Test' },
        
        // Estrutura 3: com timestamp columns
        { 
          lead_id: 999993, 
          current_status_name: 'Test',
          ts_leads_novos: new Date().toISOString()
        },
        
        // Estrutura 4: com todas as colunas esperadas
        { 
          lead_id: 999994, 
          current_status_name: 'Test',
          ts_leads_novos: new Date().toISOString(),
          ts_closers_em_contato: null,
          ts_agendados: null,
          ts_call_realizada: null,
          ts_vendas: null,
          updated_at: new Date().toISOString()
        }
      ];

      const results: Array<{
        structure: number;
        success: boolean;
        error?: string;
        data?: any;
        columns: string[];
      }> = [];
      
      for (let i = 0; i < testStructures.length; i++) {
        const testRecord = testStructures[i];
        
        try {
          const { data: insertData, error: insertError } = await this.supabaseService
            .insertTestRecord('kommo_leads_snapshot', testRecord);

          if (insertError) {
            results.push({
              structure: i + 1,
              success: false,
              error: insertError.message,
              columns: Object.keys(testRecord)
            });
          } else {
            results.push({
              structure: i + 1,
              success: true,
              data: insertData,
              columns: Object.keys(testRecord)
            });
            
            // Deletar o registro de teste
            await this.supabaseService
              .deleteTestRecord('kommo_leads_snapshot', 'lead_id', testRecord.lead_id);
          }
        } catch (error) {
          results.push({
            structure: i + 1,
            success: false,
            error: error.message,
            columns: Object.keys(testRecord)
          });
        }
      }

      return {
        success: true,
        message: 'Teste de estruturas concluído',
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  @Get('check-data')
  async checkData() {
    try {
      // Buscar todos os registros da tabela
      const allSnapshots = await this.supabaseService.getAllKommoLeadsSnapshot();
      
      // Filtrar registros que têm timestamps preenchidos
      const recordsWithTimestamps = allSnapshots.filter(record => 
        record.ts_novos_leads || 
        record.ts_tentado_conexao || 
        record.ts_conectado_qualificacao ||
        record.ts_noshow ||
        record.ts_reuniao ||
        record.ts_oportunidade ||
        record.ts_negociacao
      );

      return {
        success: true,
        totalRecords: allSnapshots.length,
        sampleRecords: allSnapshots.slice(0, 5),
        recordsWithTimestamps: recordsWithTimestamps.slice(0, 5),
        timestampStats: {
          total: recordsWithTimestamps.length,
          percentage: allSnapshots.length > 0 ? (recordsWithTimestamps.length / allSnapshots.length * 100).toFixed(2) + '%' : '0%'
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
            'kommo_leads_snapshot', 
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

  @Post('test-simple-insert')
  async testSimpleInsert() {
    try {
      const testId = Math.floor(Math.random() * 1000000);
      
      // Teste 1: Inserção básica
      const basicRecord = {
        lead_id: testId,
        current_status_name: 'Leads Novos',
        created_at: new Date().toISOString()
      };

      console.log('🔍 Tentando inserir registro básico:', basicRecord);

      const { data: basicData, error: basicError } = await this.supabaseService
        .insertTestRecord('kommo_leads_snapshot', basicRecord);

      if (basicError) {
        console.error('❌ Erro na inserção básica:', basicError);
        return {
          success: false,
          error: `Inserção básica falhou: ${basicError.message}`,
          testRecord: basicRecord
        };
      }

      console.log('✅ Inserção básica bem-sucedida:', basicData);

      // Teste 2: Inserção com timestamp
      const timestampRecord = {
        lead_id: testId + 1,
        current_status_name: 'Leads Novos',
        created_at: new Date().toISOString(),
        ts_novos_leads: new Date().toISOString()
      };

      console.log('🔍 Tentando inserir registro com timestamp:', timestampRecord);

      const { data: timestampData, error: timestampError } = await this.supabaseService
        .insertTestRecord('kommo_leads_snapshot', timestampRecord);

      if (timestampError) {
        console.error('❌ Erro na inserção com timestamp:', timestampError);
        return {
          success: false,
          error: `Inserção com timestamp falhou: ${timestampError.message}`,
          testRecord: timestampRecord
        };
      }

      console.log('✅ Inserção com timestamp bem-sucedida:', timestampData);

      // Limpar dados de teste
      await this.supabaseService
        .deleteTestRecords('kommo_leads_snapshot', 'lead_id', [testId, testId + 1]);

      return {
        success: true,
        message: 'Ambas as inserções foram bem-sucedidas',
        basicResult: basicData,
        timestampResult: timestampData
      };

    } catch (error) {
      console.error('Erro no teste de inserção:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('check-table-schema')
  async checkTableSchema() {
    try {
      // Verificar schema da tabela usando query SQL
      const { data, error } = await this.supabaseService.executeRawQuery(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'kommo_leads_snapshot'`);

      if (error) {
        console.error('❌ Erro ao verificar schema:', error);
        
        // Tentar abordagem alternativa - fazer select sem dados
        const { data: emptyData, error: emptyError } = await this.supabaseService.getTableSchema('kommo_leads_snapshot');

        if (emptyError) {
          return {
            success: false,
            error: `Erro ao verificar schema: ${emptyError.message}`
          };
        }

        return {
          success: true,
          message: 'Schema verificado via select vazio',
          columns: 'Não foi possível obter lista de colunas'
        };
      }

      return {
        success: true,
        columns: data
      };

    } catch (error) {
      console.error('Erro ao verificar schema:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('test-minimal-insert')
  async testMinimalInsert() {
    try {
      const testId = Math.floor(Math.random() * 1000000);
      
      // Teste com apenas as colunas essenciais
      const minimalRecord = {
        lead_id: testId,
        current_status_name: 'Leads Novos'
      };

      console.log('🔍 Tentando inserir registro mínimo:', minimalRecord);

      const { data, error } = await this.supabaseService.insertTestRecord('kommo_leads_snapshot', minimalRecord);

      if (error) {
        console.error('❌ Erro na inserção mínima:', error);
        return {
          success: false,
          error: `Inserção mínima falhou: ${error.message}`,
          testRecord: minimalRecord
        };
      }

      console.log('✅ Inserção mínima bem-sucedida:', data);

      // Limpar dados de teste
      await this.supabaseService.deleteTestRecord('kommo_leads_snapshot', 'lead_id', testId);

      return {
        success: true,
        message: 'Inserção mínima bem-sucedida',
        result: data
      };

    } catch (error) {
      console.error('Erro no teste de inserção mínima:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

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
        // Para outras queries, tentar RPC
        const rpcResult = await client.rpc('exec', { sql });
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