import { Controller, Get, Render, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProductsService } from './products/products.service';
import { SalesService } from './sales/sales.service';

@Controller()
export class AppController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly salesService: SalesService,
  ) {}

  @Get()
  root(@Res() res: Response) {
    return res.redirect('/dashboard');
  }

  @Get('dashboard')
  @Render('dashboard')
  async getDashboard() {
    const [productsData, salesData, recentSales, lowStockAlerts] = await Promise.all([
      this.productsService.findAll(),
      this.salesService.findAll({ dateRange: 'all' }),
      this.salesService.getRecentSales(6),
      this.productsService.getLowStockProducts(10),
    ]);

    // Today's metrics
    const todaySalesData = await this.salesService.findAll({ dateRange: 'today' });

    return {
      title: 'Store Dashboard',
      currentPage: 'dashboard',
      stats: {
        totalProducts: productsData.stats.totalProducts,
        totalQuantity: productsData.stats.totalQuantity,
        inStockCount: productsData.stats.inStockCount,
        lowStockCount: productsData.stats.lowStockCount,
        soldOutCount: productsData.stats.soldOutCount,
        inventoryValue: productsData.stats.inventoryValue,
        totalRevenue: salesData.stats.totalRevenue,
        totalDiscount: salesData.stats.totalDiscount,
        totalInvoices: salesData.stats.totalSales,
        todayRevenue: todaySalesData.stats.totalRevenue,
        todayInvoices: todaySalesData.stats.totalSales,
      },
      recentSales,
      lowStockAlerts: lowStockAlerts.slice(0, 8),
    };
  }

  @Get('404')
  @Render('404')
  getNotFoundPage(@Res({ passthrough: true }) res: Response) {
    res.status(404);
    return {
      title: '404 - Page Not Found',
      currentPage: '404',
      requestedUrl: '/404',
      shopName: process.env.SHOP_NAME || 'HARDWARE HUB',
    };
  }
}
