import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SalesModule } from '../sales/sales.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [SalesModule, ProductsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
