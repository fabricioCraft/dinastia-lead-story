import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClickUpService {
  private baseUrl = 'https://api.clickup.com/api/v2';
  private logger = new Logger(ClickUpService.name);

  async getTasksFromList(listId: string): Promise<any[]> {
    const token = process.env.CLICKUP_API_TOKEN;
    if (!token) {
      throw new Error('CLICKUP_API_TOKEN not configured');
    }
    const url = `${this.baseUrl}/list/${listId}/task`;
    const headers = { Authorization: token };

    // Paginação para retornar todos os itens (API limita 100 por página)
    const fetchAll = async (archived: boolean) => {
      const all: any[] = [];
      let page = 0;
      while (true) {
        try {
          this.logger.log(`ClickUp getTasksFromList(${listId}) -> buscando page=${page} archived=${archived}`);
          const res = await axios.get(url, {
            headers,
            params: { archived, include_subtasks: true, page },
          });
          const batch = res.data?.tasks ?? [];
          this.logger.log(`ClickUp getTasksFromList(${listId}) -> page=${page} archived=${archived} count=${batch.length}`);
          all.push(...batch);
          if (batch.length < 100) break; // última página
          page += 1;
        } catch (error: any) {
          this.logger.error(`Erro ao buscar ClickUp page=${page} archived=${archived}: ${error?.message ?? error}`);
          break;
        }
      }
      return all;
    };

    this.logger.log(`ClickUp getTasksFromList(${listId}) -> iniciando coleta paginada`);
    const active = await fetchAll(false);
    const archivedTasks = await fetchAll(true);
    const total = active.length + archivedTasks.length;
    this.logger.log(`ClickUp getTasksFromList(${listId}) -> ativos=${active.length}, arquivados=${archivedTasks.length}, total=${total}`);
    return [...active, ...archivedTasks];
  }
}