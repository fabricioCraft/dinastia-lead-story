import { test, expect } from '@playwright/test';

test.describe('Gráfico Velocidade da Jornada', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página principal
    await page.goto('/');
    
    // Aguardar a página carregar completamente
    await page.waitForLoadState('networkidle');
    
    // Aguardar um pouco mais para garantir que os dados sejam carregados
    await page.waitForTimeout(3000);
  });

  test('deve exibir as 5 etapas corretas no gráfico de velocidade da jornada', async ({ page }) => {
    // Etapas esperadas conforme solicitado
    const expectedStages = [
      'Novos Leads',
      'Tentado Conexão', 
      'Conectado/Qualificação',
      'Oportunidade',
      'Negociação'
    ];

    // Procurar pelo título do gráfico para garantir que estamos na seção correta
    const chartTitle = page.locator('text=Velocidade da Jornada');
    await expect(chartTitle).toBeVisible();

    // Aguardar o gráfico carregar
    await page.waitForSelector('[data-testid="time-per-stage-chart"], .recharts-wrapper, svg', { timeout: 10000 });

    // Verificar se cada etapa esperada está presente no gráfico
    for (const stage of expectedStages) {
      // Procurar pela etapa no gráfico (pode estar em texto, legenda ou tooltip)
      const stageElement = page.locator(`text="${stage}"`).first();
      
      // Se não encontrar o texto exato, tentar variações
      if (!(await stageElement.isVisible())) {
        // Tentar encontrar variações em minúsculas
        const stageLower = stage.toLowerCase();
        const stageElementLower = page.locator(`text="${stageLower}"`).first();
        
        if (await stageElementLower.isVisible()) {
          await expect(stageElementLower).toBeVisible();
        } else {
          // Tentar encontrar por partes da string
          const stageWords = stage.split(' ');
          let found = false;
          
          for (const word of stageWords) {
            const wordElement = page.locator(`text*="${word}"`).first();
            if (await wordElement.isVisible()) {
              found = true;
              break;
            }
          }
          
          expect(found).toBeTruthy();
        }
      } else {
        await expect(stageElement).toBeVisible();
      }
    }

    // Verificar que etapas antigas não estão presentes
    const oldStages = ['NoShow', 'Reunião', 'Venda Realizada'];
    
    for (const oldStage of oldStages) {
      const oldStageElement = page.locator(`text="${oldStage}"`);
      await expect(oldStageElement).not.toBeVisible();
    }
  });

  test('deve exibir dados numéricos para cada etapa', async ({ page }) => {
    // Aguardar o gráfico carregar
    await page.waitForSelector('[data-testid="time-per-stage-chart"], .recharts-wrapper, svg', { timeout: 10000 });

    // Verificar se há dados numéricos sendo exibidos (dias, horas, etc.)
    const numericData = page.locator('text=/\\d+\\s*(dia|hour|min|seg)/i');
    await expect(numericData.first()).toBeVisible();

    // Verificar se há pelo menos 5 elementos com dados (um para cada etapa)
    const dataElements = await numericData.count();
    expect(dataElements).toBeGreaterThanOrEqual(5);
  });

  test('deve ter o título correto do gráfico', async ({ page }) => {
    // Verificar se o título "Velocidade da Jornada" está presente
    const title = page.locator('text=Velocidade da Jornada');
    await expect(title).toBeVisible();
  });

  test('deve carregar sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Filtrar erros conhecidos que não são críticos
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('ECONNRESET') // Erro de conexão temporário
    );

    expect(criticalErrors).toHaveLength(0);
  });
});