import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  sku: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ required: true, min: 0 })
  costPrice: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0, default: 0 })
  quantity: number;

  @Prop({ required: true, default: 'pcs' })
  unit: string; // e.g. pcs, kg, meter, box, set, packet

  @Prop({ default: 10 })
  minStockThreshold: number;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 0 })
  totalSold: number;

  @Prop({ default: 0 })
  totalRevenue: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Index for fast search
ProductSchema.index({ name: 'text', sku: 'text', category: 'text' });
