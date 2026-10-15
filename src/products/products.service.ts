import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';

export interface ProductFilterOptions {
  search?: string;
  category?: string;
  status?: 'all' | 'in_stock' | 'low_stock' | 'sold_out';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async generateUniqueSku(): Promise<string> {
    let sku = '';
    let exists = true;
    while (exists) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      sku = `SKU-${randomSuffix}`;
      const found = await this.productModel.findOne({ sku });
      if (!found) {
        exists = false;
      }
    }
    return sku;
  }

  async create(data: Partial<Product>): Promise<ProductDocument> {
    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      throw new BadRequestException('Product Name is required.');
    }

    // Enforce unique product name check (case-insensitive)
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingName = await this.productModel.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });
    if (existingName) {
      throw new BadRequestException(
        `A product with the name "${trimmedName}" already exists in inventory (SKU: ${existingName.sku}). Product Name must be unique.`,
      );
    }

    let sku = (data.sku || '').toUpperCase().trim();
    if (!sku) {
      sku = await this.generateUniqueSku();
    } else {
      const existing = await this.productModel.findOne({ sku });
      if (existing) {
        sku = await this.generateUniqueSku();
      }
    }

    const product = new this.productModel({
      ...data,
      name: trimmedName,
      sku,
      quantity: Number(data.quantity) || 0,
      unitPrice: Number(data.unitPrice) || 0,
      costPrice: Number(data.costPrice) || 0,
      minStockThreshold: Number(data.minStockThreshold) || 10,
    });
    return await product.save();
  }


  async findAll(options: ProductFilterOptions = {}) {
    const query: any = {};

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { sku: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    if (options.category && options.category !== 'all') {
      query.category = options.category;
    }

    if (options.status) {
      if (options.status === 'sold_out') {
        query.quantity = { $lte: 0 };
      } else if (options.status === 'low_stock') {
        query.quantity = { $gt: 0, $lt: 10 };
      } else if (options.status === 'in_stock') {
        query.quantity = { $gte: 10 };
      }
    }

    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;

    const shouldPaginate = options.page !== undefined || options.limit !== undefined;
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    let totalCount = 0;
    let products: ProductDocument[];

    if (shouldPaginate) {
      [totalCount, products] = await Promise.all([
        this.productModel.countDocuments(query).exec(),
        this.productModel
          .find(query)
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(limit)
          .exec(),
      ]);
    } else {
      products = await this.productModel
        .find(query)
        .sort({ [sortField]: sortDirection })
        .exec();
      totalCount = products.length;
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;
    const pagination = {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };

    // Calculate store metrics across all products
    const [stats] = await this.productModel.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          soldOutCount: {
            $sum: { $cond: [{ $lte: ['$quantity', 0] }, 1, 0] },
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$quantity', 0] },
                    { $lt: ['$quantity', 10] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          inStockCount: {
            $sum: { $cond: [{ $gte: ['$quantity', 10] }, 1, 0] },
          },
          inventoryValue: {
            $sum: { $multiply: ['$quantity', '$unitPrice'] },
          },
        },
      },
    ]);

    const categories = await this.productModel.distinct('category');

    return {
      products,
      categories: categories.filter(Boolean).sort(),
      stats: stats || {
        totalProducts: 0,
        totalQuantity: 0,
        soldOutCount: 0,
        lowStockCount: 0,
        inStockCount: 0,
        inventoryValue: 0,
      },
      pagination,
    };
  }

  async findOne(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }
    return product;
  }

  async update(id: string, data: Partial<Product>): Promise<ProductDocument> {
    if (data.name) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Product Name cannot be empty.');
      }
      const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingName = await this.productModel.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      });
      if (existingName) {
        throw new BadRequestException(
          `Another product with the name "${trimmedName}" already exists in inventory (SKU: ${existingName.sku}). Product Name must be unique.`,
        );
      }
      data.name = trimmedName;
    }

    const updated = await this.productModel
      .findByIdAndUpdate(
        id,
        {
          ...data,
          quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
          unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : undefined,
          costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }
    return updated;
  }

  async restock(id: string, additionalQuantity: number): Promise<ProductDocument> {
    if (additionalQuantity <= 0) {
      throw new BadRequestException('Restock quantity must be greater than zero.');
    }
    const product = await this.productModel
      .findByIdAndUpdate(
        id,
        { $inc: { quantity: additionalQuantity } },
        { new: true },
      )
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }
    return product;
  }

  async delete(id: string): Promise<void> {
    const res = await this.productModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }
  }

  async getLowStockProducts(threshold = 10): Promise<ProductDocument[]> {
    return this.productModel
      .find({ quantity: { $lt: threshold } })
      .sort({ quantity: 1 })
      .exec();
  }
}
