import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { FunnelService } from './funnel.service';

@Controller('funnel')
export class FunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  @Get('summary')
  async getSummary(@Res() res: Response) {
    // Evita cache no navegador (os dados não devem ficar expostos via cache do browser)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Aguarda cálculo completo para garantir retorno de dados reais
    const data = await this.funnelService.getSummary();
    return res.json(data);
  }
}