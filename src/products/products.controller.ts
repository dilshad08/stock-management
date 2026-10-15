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
import { ProductsService } from './products.service';
import { DEFAULT_CATEGORIES } from './products.constants';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Render('products/index')
  async listProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'all' | 'in_stock' | 'low_stock' | 'sold_out',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('success') success?: string,
    @Query('error') error?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit || '10', 10) || 10));

    const data = await this.productsService.findAll({
      search,
      category,
      status: status || 'all',
      page: pageNum,
      limit: limitNum,
    });

    return {
      title: 'Products Inventory',
      currentPage: 'products',
      products: data.products,
      categories: data.categories,
      stats: data.stats,
      pagination: data.pagination,
      currentFilter: {
        search: search || '',
        category: category || 'all',
        status: status || 'all',
      },
      successMessage: success || null,
      errorMessage: error || null,
    };
  }


  @Get('new')
  @Render('products/add')
  async addProductPage(
    @Query('error') error?: string,
  ) {
    const { categories } = await this.productsService.findAll();
    const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).sort();
    const autoSku = await this.productsService.generateUniqueSku();
    return {
      title: 'Add New Product',
      currentPage: 'products',
      categories: allCategories,
      autoSku,
      errorMessage: error || null,
    };
  }

  @Post()
  async createProduct(@Body() body: any, @Res() res: Response) {
    try {
      if (!body.name || !body.unitPrice) {
        throw new BadRequestException('Product Name and Unit Price are required.');
      }

      await this.productsService.create({
        name: body.name,
        sku: body.sku,
        category: body.category?.trim() || 'General Hardware',
        costPrice: Number(body.costPrice) || 0,
        unitPrice: Number(body.unitPrice) || 0,
        quantity: Number(body.quantity) || 0,
        unit: body.unit || 'pcs',
        minStockThreshold: Number(body.minStockThreshold) || 10,
        description: body.description || '',
      });

      return res.redirect('/products?success=Product added successfully to inventory');
    } catch (err: any) {
      return res.redirect(`/products/new?error=${encodeURIComponent(err.message || 'Failed to add product')}`);
    }
  }

  @Get(':id/edit')
  @Render('products/edit')
  async editProductPage(@Param('id') id: string, @Query('error') error?: string) {
    const product = await this.productsService.findOne(id);
    const { categories } = await this.productsService.findAll();
    const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories, product.category])).filter(Boolean).sort();
    return {
      title: `Edit ${product.name}`,
      currentPage: 'products',
      product,
      categories: allCategories,
      errorMessage: error || null,
    };
  }

  @Post(':id/edit')
  async updateProduct(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      await this.productsService.update(id, {
        name: body.name,
        category: body.category?.trim() || 'General Hardware',
        costPrice: Number(body.costPrice),
        unitPrice: Number(body.unitPrice),
        quantity: Number(body.quantity),
        unit: body.unit,
        description: body.description,
      });

      return res.redirect('/products?success=Product updated successfully');
    } catch (err: any) {
      return res.redirect(`/products/${id}/edit?error=${encodeURIComponent(err.message || 'Failed to update product')}`);
    }
  }

  @Post(':id/restock')
  async restockProduct(
    @Param('id') id: string,
    @Body('quantity') quantity: string,
    @Res() res: Response,
  ) {
    try {
      const qty = Number(quantity);
      if (!qty || qty <= 0) {
        throw new BadRequestException('Please enter a valid positive quantity.');
      }
      await this.productsService.restock(id, qty);
      return res.redirect('/products?success=Stock updated successfully');
    } catch (err: any) {
      return res.redirect(`/products?error=${encodeURIComponent(err.message || 'Failed to restock product')}`);
    }
  }

  @Post(':id/delete')
  async deleteProduct(@Param('id') id: string, @Res() res: Response) {
    try {
      await this.productsService.delete(id);
      return res.redirect('/products?success=Product deleted successfully');
    } catch (err: any) {
      return res.redirect(`/products?error=${encodeURIComponent(err.message || 'Failed to delete product')}`);
    }
  }

  // JSON API for POS live item search
  @Get('api/search')
  async apiSearchProducts(@Query('q') query: string, @Res() res: Response) {
    const { products } = await this.productsService.findAll({ search: query || '' });
    return res.status(HttpStatus.OK).json(products);
  }
}
