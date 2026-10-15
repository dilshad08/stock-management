import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './sale.schema';
import { Product, ProductDocument } from '../products/product.schema';

export interface CreateSaleItemDto {
  productId: string;
  quantity: number;
}

export interface CreateSaleDto {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  items: CreateSaleItemDto[];
  discountPercentage?: number;
  taxPercentage?: number;
  notes?: string;
}

export interface UpdateSaleItemDto {
  productId: string;
  quantity: number;
}

export interface UpdateSaleDto {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  discountPercentage?: number;
  taxPercentage?: number;
  notes?: string;
  items: UpdateSaleItemDto[];
}

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async createSale(dto: CreateSaleDto): Promise<SaleDocument> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be added to the sale.');
    }

    // Generate unique invoice number: INV-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    const saleItems = [];
    let subtotal = 0;

    // Validate and fetch each product
    for (const item of dto.items) {
      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        throw new BadRequestException('Item quantity must be greater than zero.');
      }

      const product = await this.productModel.findById(item.productId).exec();
      if (!product) {
        throw new NotFoundException(`Product with ID "${item.productId}" was not found.`);
      }

      if (product.quantity < qty) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available stock: ${product.quantity}, requested: ${qty}.`,
        );
      }

      const itemSubtotal = Math.round(product.unitPrice * qty * 100) / 100;
      subtotal += itemSubtotal;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        originalQuantity: qty,
        returnedQuantity: 0,
        unit: product.unit || 'pcs',
        unitPrice: product.unitPrice,
        subtotal: itemSubtotal,
      });
    }

    const discountPercentage = Math.max(0, Math.min(100, Number(dto.discountPercentage) || 0));
    const discountAmount = Math.round(((subtotal * discountPercentage) / 100) * 100) / 100;

    const taxPercentage = Math.max(0, Number(dto.taxPercentage) || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(((taxableAmount * taxPercentage) / 100) * 100) / 100;

    const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

    // Deduct stock and increment sales stats on products
    for (const item of saleItems) {
      await this.productModel.findByIdAndUpdate(item.productId, {
        $inc: {
          quantity: -item.quantity,
          totalSold: item.quantity,
          totalRevenue: item.subtotal,
        },
      });
    }

    const sale = new this.saleModel({
      invoiceNumber,
      customerName: dto.customerName?.trim() || 'Walk-in Customer',
      customerPhone: dto.customerPhone?.trim() || '',
      customerAddress: dto.customerAddress?.trim() || '',
      paymentMethod: dto.paymentMethod || 'Cash',
      items: saleItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discountPercentage,
      discountAmount,
      taxPercentage,
      taxAmount,
      grandTotal,
      originalGrandTotal: grandTotal,
      refundAmount: 0,
      notes: dto.notes?.trim() || '',
    });

    return await sale.save();
  }

  async findAll(
    options: {
      search?: string;
      dateRange?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const query: any = {};

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query.$or = [
        { invoiceNumber: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
      ];
    }

    if (options.dateRange) {
      const now = new Date();
      if (options.dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfDay };
      } else if (options.dateRange === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7));
        query.createdAt = { $gte: startOfWeek };
      } else if (options.dateRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createdAt = { $gte: startOfMonth };
      }
    }

    const shouldPaginate = options.page !== undefined || options.limit !== undefined;
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    let totalCount = 0;
    let sales: SaleDocument[];

    if (shouldPaginate) {
      [totalCount, sales] = await Promise.all([
        this.saleModel.countDocuments(query).exec(),
        this.saleModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
      ]);
    } else {
      sales = await this.saleModel.find(query).sort({ createdAt: -1 }).exec();
      totalCount = sales.length;
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

    // Summary stats
    const stats = await this.saleModel.aggregate([
      ...(query.createdAt ? [{ $match: { createdAt: query.createdAt } }] : []),
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          totalDiscount: { $sum: '$discountAmount' },
          totalSubtotal: { $sum: '$subtotal' },
        },
      },
    ]);

    return {
      sales,
      stats: stats[0] || {
        totalSales: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        totalSubtotal: 0,
      },
      pagination,
    };
  }

  async findOne(id: string): Promise<SaleDocument> {
    let sale: SaleDocument | null = null;
    if (Types.ObjectId.isValid(id)) {
      sale = await this.saleModel.findById(id).exec();
    }
    if (!sale) {
      sale = await this.saleModel.findOne({ invoiceNumber: id }).exec();
    }
    if (!sale) {
      throw new NotFoundException(`Invoice "${id}" not found.`);
    }
    return sale;
  }

  async getRecentSales(limit = 5): Promise<SaleDocument[]> {
    return this.saleModel.find().sort({ createdAt: -1 }).limit(limit).exec();
  }

  // Product-wise Sales Report
  async getProductSalesReport(dateRange?: string) {
    const matchStage: any = {};
    const now = new Date();

    if (dateRange === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchStage.createdAt = { $gte: startOfDay };
    } else if (dateRange === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      matchStage.createdAt = { $gte: startOfWeek };
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchStage.createdAt = { $gte: startOfMonth };
    }

    const pipeline: any[] = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
          unit: { $first: '$items.unit' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.subtotal' },
          orderCount: { $sum: 1 },
          avgUnitPrice: { $avg: '$items.unitPrice' },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      {
        $project: {
          productName: 1,
          sku: 1,
          unit: 1,
          totalUnitsSold: 1,
          totalAmount: 1,
          orderCount: 1,
          avgUnitPrice: 1,
          currentStock: {
            $ifNull: [{ $arrayElemAt: ['$productDetails.quantity', 0] }, 0],
          },
          category: {
            $ifNull: [{ $arrayElemAt: ['$productDetails.category', 0] }, 'General'],
          },
        },
      },
      { $sort: { totalAmount: -1 } },
    );

    const productSales = await this.saleModel.aggregate(pipeline);

    // Summary totals
    const totalUnitsSold = productSales.reduce((acc, p) => acc + p.totalUnitsSold, 0);
    const totalProductRevenue = productSales.reduce((acc, p) => acc + p.totalAmount, 0);

    const overallSalesStats = await this.saleModel.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: null,
          invoiceCount: { $sum: 1 },
          grossSales: { $sum: '$subtotal' },
          totalDiscount: { $sum: '$discountAmount' },
          netRevenue: { $sum: '$grandTotal' },
        },
      },
    ]);

    return {
      productSales,
      summary: {
        totalUnitsSold,
        totalProductRevenue,
        invoiceCount: overallSalesStats[0]?.invoiceCount || 0,
        grossSales: overallSalesStats[0]?.grossSales || 0,
        totalDiscount: overallSalesStats[0]?.totalDiscount || 0,
        netRevenue: overallSalesStats[0]?.netRevenue || 0,
      },
    };
  }

  // Edit Sale and Process Item Returns with Stock Adjustment
  async updateSale(id: string, dto: UpdateSaleDto): Promise<SaleDocument> {
    const sale = await this.findOne(id);

    if (sale.originalGrandTotal === undefined || sale.originalGrandTotal === null) {
      sale.originalGrandTotal = sale.grandTotal;
    }

    // Map existing items on the sale by productId
    const oldItemsMap = new Map<string, any>();
    for (const item of sale.items) {
      oldItemsMap.set(item.productId.toString(), item);
    }

    // Map new submitted items by productId
    const newItemsMap = new Map<string, number>();
    for (const item of dto.items) {
      const pid = item.productId.toString();
      const current = newItemsMap.get(pid) || 0;
      newItemsMap.set(pid, current + Math.max(0, Number(item.quantity) || 0));
    }

    // Gather all involved product IDs
    const allProductIds = new Set<string>([
      ...Array.from(oldItemsMap.keys()),
      ...Array.from(newItemsMap.keys()),
    ]);

    // First validate stock availability for any product where quantity increases
    for (const pid of allProductIds) {
      const oldQty = oldItemsMap.get(pid)?.quantity || 0;
      const newQty = newItemsMap.get(pid) || 0;
      const delta = oldQty - newQty;

      if (delta < 0) {
        // Customer wants MORE items added / exchanged
        const needed = Math.abs(delta);
        const product = await this.productModel.findById(pid).exec();
        if (!product) {
          throw new NotFoundException(`Product with ID "${pid}" was not found.`);
        }
        if (product.quantity < needed) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.quantity}, requested additional: ${needed}.`,
          );
        }
      }
    }

    // Now adjust product stock in database and build updated items array
    const updatedSaleItems: any[] = [];
    let subtotal = 0;
    let itemsWereReturned = false;

    for (const pid of allProductIds) {
      const oldItem = oldItemsMap.get(pid);
      const oldQty = oldItem ? Number(oldItem.quantity) : 0;
      const newQty = newItemsMap.has(pid) ? newItemsMap.get(pid)! : 0;
      const delta = oldQty - newQty;

      const product = await this.productModel.findById(pid).exec();
      if (!product) continue;

      const itemUnitPrice = oldItem?.unitPrice ?? product.unitPrice;

      if (delta > 0) {
        // Items RETURNED by customer: RESTORE stock to inventory
        itemsWereReturned = true;
        const revDelta = Math.round(itemUnitPrice * delta * 100) / 100;
        await this.productModel.findByIdAndUpdate(pid, {
          $inc: {
            quantity: delta,
            totalSold: -delta,
            totalRevenue: -revDelta,
          },
        });
      } else if (delta < 0) {
        // Items ADDED by customer: DEDUCT stock from inventory
        const needed = Math.abs(delta);
        const revDelta = Math.round(itemUnitPrice * needed * 100) / 100;
        await this.productModel.findByIdAndUpdate(pid, {
          $inc: {
            quantity: -needed,
            totalSold: needed,
            totalRevenue: revDelta,
          },
        });
      }

      const originalQuantity = oldItem?.originalQuantity || oldQty;
      const returnedQuantity = Math.max(0, originalQuantity - newQty);

      if (newQty > 0 || returnedQuantity > 0) {
        const itemUnitPrice = oldItem?.unitPrice ?? product.unitPrice;
        const itemSubtotal = Math.round(itemUnitPrice * newQty * 100) / 100;
        subtotal += itemSubtotal;

        updatedSaleItems.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: newQty,
          returnedQuantity,
          originalQuantity,
          unit: product.unit || 'pcs',
          unitPrice: itemUnitPrice,
          subtotal: itemSubtotal,
        });
      }
    }

    const discountPercentage = Math.max(
      0,
      Math.min(100, Number(dto.discountPercentage ?? sale.discountPercentage) || 0),
    );
    const discountAmount = Math.round(((subtotal * discountPercentage) / 100) * 100) / 100;

    const taxPercentage = Math.max(0, Number(dto.taxPercentage ?? sale.taxPercentage) || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(((taxableAmount * taxPercentage) / 100) * 100) / 100;

    const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
    const baseOriginal = sale.originalGrandTotal ?? sale.grandTotal;
    const refundAmount = Math.max(0, Math.round((baseOriginal - grandTotal) * 100) / 100);

    let status = sale.status || 'completed';
    if (itemsWereReturned || refundAmount > 0) {
      status = 'returned';
    } else if (grandTotal !== baseOriginal) {
      status = 'modified';
    }

    if (dto.customerName) sale.customerName = dto.customerName.trim();
    if (dto.customerPhone !== undefined) sale.customerPhone = dto.customerPhone.trim();
    if (dto.customerAddress !== undefined) sale.customerAddress = dto.customerAddress.trim();
    if (dto.paymentMethod) sale.paymentMethod = dto.paymentMethod;
    if (dto.notes !== undefined) sale.notes = dto.notes.trim();

    sale.items = updatedSaleItems;
    sale.subtotal = Math.round(subtotal * 100) / 100;
    sale.discountPercentage = discountPercentage;
    sale.discountAmount = discountAmount;
    sale.taxPercentage = taxPercentage;
    sale.taxAmount = taxAmount;
    sale.grandTotal = grandTotal;
    sale.refundAmount = refundAmount;
    sale.status = status;

    return await sale.save();
  }

  // Delete / Void a Sale and return all products to stock
  async deleteSale(id: string): Promise<void> {
    const sale = await this.findOne(id);
    for (const item of sale.items) {
      if (item.quantity > 0) {
        await this.productModel.findByIdAndUpdate(item.productId, {
          $inc: {
            quantity: item.quantity,
            totalSold: -item.quantity,
            totalRevenue: -item.subtotal,
          },
        });
      }
    }
    await this.saleModel.findByIdAndDelete(sale._id).exec();
  }
}
