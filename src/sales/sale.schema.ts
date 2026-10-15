import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema({ _id: false })
export class SaleItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ default: 0, min: 0 })
  returnedQuantity: number;

  @Prop({ required: false })
  originalQuantity?: number;

  @Prop({ required: true, default: 'pcs' })
  unit: string;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;
}

export const SaleItemSchema = SchemaFactory.createForClass(SaleItem);

@Schema({ timestamps: true })
export class Sale {
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ default: 'Walk-in Customer' })
  customerName: string;

  @Prop({ default: '' })
  customerPhone: string;

  @Prop({ default: '' })
  customerAddress: string;

  @Prop({ default: 'Cash', enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Credit'] })
  paymentMethod: string;

  @Prop({ default: 'completed', enum: ['completed', 'modified', 'returned'] })
  status: string;

  @Prop({ type: [SaleItemSchema], required: true })
  items: SaleItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0, max: 100 })
  discountPercentage: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({ default: 0, min: 0 })
  taxPercentage: number;

  @Prop({ default: 0, min: 0 })
  taxAmount: number;

  @Prop({ required: true, min: 0 })
  grandTotal: number;

  @Prop({ default: 0, min: 0 })
  refundAmount: number;

  @Prop({ required: false })
  originalGrandTotal?: number;

  @Prop({ default: '' })
  notes: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
SaleSchema.index({ createdAt: -1 });
SaleSchema.index({ customerName: 1 });
SaleSchema.index({ 'items.productId': 1 });
