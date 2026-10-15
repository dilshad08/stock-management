import { Injectable } from '@nestjs/common';
import { SalesService } from '../sales/sales.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly salesService: SalesService,
    private readonly productsService: ProductsService,
  ) {}

  async getSalesReport(dateRange: string = 'all') {
    const reportData = await this.salesService.getProductSalesReport(dateRange);
    return reportData;
  }
}
