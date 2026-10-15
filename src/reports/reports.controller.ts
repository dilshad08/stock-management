import { Controller, Get, Query, Render } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @Render('reports/sales')
  async salesReport(@Query('dateRange') dateRange?: string) {
    const activeRange = dateRange || 'all';
    const report = await this.reportsService.getSalesReport(activeRange);

    return {
      title: 'Sales & Product Performance Report',
      currentPage: 'reports',
      productSales: report.productSales,
      summary: report.summary,
      dateRange: activeRange,
    };
  }
}
