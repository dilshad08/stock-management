import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from './sale.schema';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PdfService } from './pdf.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema }]),
    ProductsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, PdfService],
  exports: [SalesService, PdfService, MongooseModule],
})
export class SalesModule {}
