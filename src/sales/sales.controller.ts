import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Render,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { SalesService } from './sales.service';
import { PdfService } from './pdf.service';
import { ProductsService } from '../products/products.service';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly pdfService: PdfService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @Render('sales/index')
  async listSales(
    @Query('search') search?: string,
    @Query('dateRange') dateRange?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('success') success?: string,
    @Query('error') error?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit || '10', 10) || 10));

    const data = await this.salesService.findAll({
      search,
      dateRange,
      page: pageNum,
      limit: limitNum,
    });
    return {
      title: 'Sales & Invoices',
      currentPage: 'sales',
      sales: data.sales,
      stats: data.stats,
      pagination: data.pagination,
      currentFilter: {
        search: search || '',
        dateRange: dateRange || 'all',
      },
      successMessage: success || null,
      errorMessage: error || null,
    };
  }

  @Get('new')
  @Render('sales/new')
  async newSalePage(@Query('error') error?: string) {
    // Get all available products for POS selection
    const { products } = await this.productsService.findAll();
    return {
      title: 'New Sale / Billing Counter',
      currentPage: 'new-sale',
      products,
      errorMessage: error || null,
    };
  }

  @Post()
  async processSale(@Body() body: any, @Res() res: Response) {
    try {
      let items = [];
      if (typeof body.items === 'string') {
        try {
          items = JSON.parse(body.items);
        } catch {
          throw new BadRequestException('Invalid items format.');
        }
      } else if (Array.isArray(body.items)) {
        items = body.items;
      } else if (body.productId && body.quantity) {
        // Single item form fallback
        items = [{ productId: body.productId, quantity: Number(body.quantity) }];
      }

      if (!items || items.length === 0) {
        throw new BadRequestException('Please add at least one product to the sale.');
      }

      const sale = await this.salesService.createSale({
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        paymentMethod: body.paymentMethod || 'Cash',
        discountPercentage: Number(body.discountPercentage) || 0,
        taxPercentage: Number(body.taxPercentage) || 0,
        notes: body.notes,
        items,
      });

      // If AJAX request, return JSON with redirect URL
      if (body.isAjax || body.ajax) {
        return res.status(HttpStatus.CREATED).json({
          success: true,
          saleId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          redirectUrl: `/sales/${sale._id}?success=Sale+completed+successfully`,
        });
      }

      return res.redirect(`/sales/${sale._id}?success=Sale+completed+successfully`);
    } catch (err: any) {
      if (body.isAjax || body.ajax) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: err.message || 'Failed to complete sale.',
        });
      }
      return res.redirect(`/sales/new?error=${encodeURIComponent(err.message || 'Sale failed')}`);
    }
  }

  @Get(':id')
  @Render('sales/view')
  async viewSale(
    @Param('id') id: string,
    @Query('success') success?: string,
    @Query('error') error?: string,
  ) {
    const sale = await this.salesService.findOne(id);
    return {
      title: `Bill ${sale.invoiceNumber}`,
      currentPage: 'sales',
      sale,
      successMessage: success || null,
      errorMessage: error || null,
    };
  }

  @Get(':id/edit')
  @Render('sales/edit')
  async editSalePage(
    @Param('id') id: string,
    @Query('error') error?: string,
  ) {
    const sale = await this.salesService.findOne(id);
    return {
      title: `Edit Bill ${sale.invoiceNumber} / Return Items`,
      currentPage: 'sales',
      sale,
      errorMessage: error || null,
    };
  }

  @Post(':id/edit')
  async updateSale(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      let items: any[] = [];
      if (typeof body.items === 'string') {
        try {
          items = JSON.parse(body.items);
        } catch {
          throw new BadRequestException('Invalid items format.');
        }
      } else if (Array.isArray(body.items)) {
        items = body.items;
      }

      if (!items || items.length === 0) {
        throw new BadRequestException('At least one item must remain on the bill.');
      }

      const updated = await this.salesService.updateSale(id, {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        paymentMethod: body.paymentMethod,
        discountPercentage: Number(body.discountPercentage) || 0,
        taxPercentage: Number(body.taxPercentage) || 0,
        notes: body.notes,
        items,
      });

      let totalReturnedCount = 0;
      if (updated.items) {
        for (const it of updated.items) {
          if (it.returnedQuantity && it.returnedQuantity > 0) {
            totalReturnedCount += it.returnedQuantity;
          }
        }
      }

      let successMsg = 'Bill updated and inventory adjusted successfully.';
      if (totalReturnedCount > 0) {
        successMsg = `Return processed successfully! ${totalReturnedCount} returned item(s) added back to inventory.`;
        if (updated.refundAmount > 0) {
          successMsg += ` Refund payable to customer: ₹${updated.refundAmount.toFixed(2)}`;
        }
      } else if (updated.refundAmount > 0) {
        successMsg += ` Refund payable to customer: ₹${updated.refundAmount.toFixed(2)}`;
      }

      return res.redirect(
        `/sales/${id}?success=${encodeURIComponent(successMsg)}`,
      );
    } catch (err: any) {
      return res.redirect(
        `/sales/${id}/edit?error=${encodeURIComponent(err.message || 'Failed to update bill')}`,
      );
    }
  }

  @Post(':id/delete')
  async deleteSale(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      await this.salesService.deleteSale(id);
      return res.redirect(
        `/sales?success=${encodeURIComponent('Sale voided and all items restored to inventory.')}`,
      );
    } catch (err: any) {
      return res.redirect(
        `/sales?error=${encodeURIComponent(err.message || 'Failed to void sale')}`,
      );
    }
  }

  @Get(':id/pdf')
  async downloadInvoicePdf(@Param('id') id: string, @Res() res: Response) {
    const sale = await this.salesService.findOne(id);
    const pdfDoc = this.pdfService.generateInvoicePdf(sale);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${sale.invoiceNumber}.pdf"`,
    );

    pdfDoc.pipe(res);
    pdfDoc.end();
  }

  @Get(':id/pdf/view')
  async streamInvoicePdfInline(@Param('id') id: string, @Res() res: Response) {
    const sale = await this.salesService.findOne(id);
    const pdfDoc = this.pdfService.generateInvoicePdf(sale);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${sale.invoiceNumber}.pdf"`,
    );

    pdfDoc.pipe(res);
    pdfDoc.end();
  }
}
