import mongoose from 'mongoose';
import { ProductSchema } from './products/product.schema';
import { SaleSchema } from './sales/sale.schema';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hardware_store';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const ProductModel = mongoose.model('Product', ProductSchema);
  const SaleModel = mongoose.model('Sale', SaleSchema);

  // Clear existing collections
  await ProductModel.deleteMany({});
  await SaleModel.deleteMany({});
  console.log('Cleared existing product and sale data.');

  // Realistic Hardware Store Products
  const productsToSeed = [
    // Healthy Stock (>= 10)
    {
      name: 'Bosch 13mm GSB 550 Impact Drill Machine',
      sku: 'HDW-DRL-550',
      category: 'Power Tools',
      costPrice: 42.0,
      unitPrice: 65.0,
      quantity: 28,
      unit: 'pcs',
      minStockThreshold: 10,
      description: '550W powerful motor, dual mode impact and drilling, ergonomic grip.',
      totalSold: 14,
      totalRevenue: 910.0,
    },
    {
      name: 'Stanley 16oz Fiberglass Claw Hammer',
      sku: 'HDW-HMR-016',
      category: 'Hand Tools',
      costPrice: 7.5,
      unitPrice: 14.99,
      quantity: 45,
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'Fiberglass core adds strength and reduces vibrations, forged heat-treated head.',
      totalSold: 22,
      totalRevenue: 329.78,
    },
    {
      name: 'DeWalt 4-1/2" Cordless Angle Grinder 20V',
      sku: 'HDW-AG-20V',
      category: 'Power Tools',
      costPrice: 95.0,
      unitPrice: 149.0,
      quantity: 16,
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'Brushless motor delivering up to 9000 RPM, kickback brake safety.',
      totalSold: 7,
      totalRevenue: 1043.0,
    },
    {
      name: 'PVC Heavy Duty Conduit Pipe 25mm (3-Meter)',
      sku: 'HDW-PVC-025',
      category: 'Plumbing & Pipes',
      costPrice: 2.1,
      unitPrice: 4.5,
      quantity: 120,
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'Rigid fire-retardant PVC conduit pipe for electrical and plumbing casing.',
      totalSold: 85,
      totalRevenue: 382.5,
    },
    {
      name: 'Solid Brass Ball Valve 1/2 Inch Female NPT',
      sku: 'HDW-VLV-012',
      category: 'Plumbing & Pipes',
      costPrice: 4.2,
      unitPrice: 8.99,
      quantity: 55,
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'Lead-free heavy brass construction, quarter-turn shutoff vinyl lever.',
      totalSold: 30,
      totalRevenue: 269.7,
    },
    {
      name: 'Philips 50W LED Waterproof Flood Light IP66',
      sku: 'HDW-LED-050',
      category: 'Electrical Supplies',
      costPrice: 18.0,
      unitPrice: 32.5,
      quantity: 24,
      unit: 'pcs',
      minStockThreshold: 10,
      description: '5000 Lumens cool daylight outdoor luminaire with surge protection.',
      totalSold: 12,
      totalRevenue: 390.0,
    },
    {
      name: 'Havells Copper Multi-Strand Wire 1.5 sq mm (90m Roll)',
      sku: 'HDW-WIR-150',
      category: 'Electrical Supplies',
      costPrice: 24.0,
      unitPrice: 38.0,
      quantity: 18,
      unit: 'box',
      minStockThreshold: 10,
      description: 'Flame retardant 100% pure electrolytic grade copper cable.',
      totalSold: 15,
      totalRevenue: 570.0,
    },
    {
      name: 'Tapcon Masonry Concrete Anchors Box of 100',
      sku: 'HDW-SCR-TAP',
      category: 'Fasteners & Screws',
      costPrice: 9.0,
      unitPrice: 16.5,
      quantity: 36,
      unit: 'box',
      minStockThreshold: 10,
      description: '3/16" x 1-3/4" hex washer head concrete anchor screws.',
      totalSold: 28,
      totalRevenue: 462.0,
    },

    // CRITICAL USER REQUIREMENT: PRODUCTS WITH QUANTITY < 10 (SHOW IN RED COLOR!)
    {
      name: 'Makita 18V LXT Cordless Jigsaw Tool Only',
      sku: 'HDW-MK-JIG',
      category: 'Power Tools',
      costPrice: 110.0,
      unitPrice: 175.0,
      quantity: 4, // < 10 RED ALERT!
      unit: 'pcs',
      minStockThreshold: 10,
      description: '3 orbital settings plus straight cutting, tool-less blade change.',
      totalSold: 11,
      totalRevenue: 1925.0,
    },
    {
      name: 'Knipex Cobra Water Pump Pliers 10-Inch',
      sku: 'HDW-KNP-010',
      category: 'Hand Tools',
      costPrice: 28.0,
      unitPrice: 46.0,
      quantity: 6, // < 10 RED ALERT!
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'Push-button adjustment directly on workpiece, self-locking on pipes.',
      totalSold: 9,
      totalRevenue: 414.0,
    },
    {
      name: 'Heavy Duty Cast Iron Pipe Wrench 18-Inch',
      sku: 'HDW-WRN-018',
      category: 'Hand Tools',
      costPrice: 19.5,
      unitPrice: 34.0,
      quantity: 3, // < 10 RED ALERT!
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'Full floating forged hook jaw, self-cleaning threads with replaceable jaws.',
      totalSold: 14,
      totalRevenue: 476.0,
    },
    {
      name: 'WD-40 Specialist Silicone Lubricant Spray (350ml)',
      sku: 'HDW-WD40-SIL',
      category: 'Paints & Adhesives',
      costPrice: 4.8,
      unitPrice: 9.2,
      quantity: 8, // < 10 RED ALERT!
      unit: 'can',
      minStockThreshold: 10,
      description: 'Fast drying formula prevents sticking, waterproofs and protects.',
      totalSold: 25,
      totalRevenue: 230.0,
    },
    {
      name: 'Fluke Auto-Ranging Digital Multimeter',
      sku: 'HDW-FLK-MM',
      category: 'Electrical Supplies',
      costPrice: 85.0,
      unitPrice: 135.0,
      quantity: 5, // < 10 RED ALERT!
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'True RMS AC voltage, resistance, continuity and capacitance measurements.',
      totalSold: 8,
      totalRevenue: 1080.0,
    },

    // Sold Out Products (Quantity = 0)
    {
      name: 'Milwaukee M18 Fuel SDS Plus Rotary Hammer',
      sku: 'HDW-MLW-SDS',
      category: 'Power Tools',
      costPrice: 195.0,
      unitPrice: 289.0,
      quantity: 0, // SOLD OUT
      unit: 'pcs',
      minStockThreshold: 10,
      description: '2.1 ft-lbs impact energy, 0-1400 RPM, 0-4900 BPM for fast drilling.',
      totalSold: 6,
      totalRevenue: 1734.0,
    },
    {
      name: 'Cast Steel Heavy Duty C-Clamp 6-Inch',
      sku: 'HDW-CLM-006',
      category: 'Hand Tools',
      costPrice: 8.0,
      unitPrice: 15.5,
      quantity: 0, // SOLD OUT
      unit: 'pcs',
      minStockThreshold: 10,
      description: 'Malleable iron frame with sliding T-handle for maximum clamping pressure.',
      totalSold: 18,
      totalRevenue: 279.0,
    },
  ];

  const savedProducts = await ProductModel.insertMany(productsToSeed);
  console.log(`Seeded ${savedProducts.length} hardware products successfully!`);

  // Seed Realistic Sales Transactions with Discount Percentages & Bills
  const sampleSales = [
    {
      invoiceNumber: 'INV-20261015-1001',
      customerName: 'Robert Vance Construction',
      customerPhone: '+91 98711 22334',
      customerAddress: 'Site 4B, Sector 62',
      paymentMethod: 'Card',
      items: [
        {
          productId: savedProducts[0]._id, // Drill
          productName: savedProducts[0].name,
          sku: savedProducts[0].sku,
          quantity: 2,
          unit: savedProducts[0].unit,
          unitPrice: savedProducts[0].unitPrice,
          subtotal: 130.0,
        },
        {
          productId: savedProducts[1]._id, // Hammer
          productName: savedProducts[1].name,
          sku: savedProducts[1].sku,
          quantity: 3,
          unit: savedProducts[1].unit,
          unitPrice: savedProducts[1].unitPrice,
          subtotal: 44.97,
        },
      ],
      subtotal: 174.97,
      discountPercentage: 10, // 10% discount on total
      discountAmount: 17.5,
      taxPercentage: 0,
      taxAmount: 0,
      grandTotal: 157.47,
      notes: 'Contractor bulk purchase discount applied.',
      createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    },
    {
      invoiceNumber: 'INV-20261015-1002',
      customerName: 'Marcus Miller',
      customerPhone: '+91 98123 45678',
      customerAddress: '42 Baker Street',
      paymentMethod: 'Cash',
      items: [
        {
          productId: savedProducts[8]._id, // Makita Jigsaw (low stock)
          productName: savedProducts[8].name,
          sku: savedProducts[8].sku,
          quantity: 1,
          unit: savedProducts[8].unit,
          unitPrice: savedProducts[8].unitPrice,
          subtotal: 175.0,
        },
        {
          productId: savedProducts[11]._id, // WD-40
          productName: savedProducts[11].name,
          sku: savedProducts[11].sku,
          quantity: 2,
          unit: savedProducts[11].unit,
          unitPrice: savedProducts[11].unitPrice,
          subtotal: 18.4,
        },
      ],
      subtotal: 193.4,
      discountPercentage: 5, // 5% discount on total
      discountAmount: 9.67,
      taxPercentage: 0,
      taxAmount: 0,
      grandTotal: 183.73,
      notes: 'Customer membership 5% discount.',
      createdAt: new Date(Date.now() - 3600000 * 5),
    },
    {
      invoiceNumber: 'INV-20261014-1003',
      customerName: 'Apex Electricals & Services',
      customerPhone: '+91 98450 99887',
      customerAddress: 'Industrial Complex Plot 12',
      paymentMethod: 'UPI',
      items: [
        {
          productId: savedProducts[5]._id, // LED Flood Light
          productName: savedProducts[5].name,
          sku: savedProducts[5].sku,
          quantity: 4,
          unit: savedProducts[5].unit,
          unitPrice: savedProducts[5].unitPrice,
          subtotal: 130.0,
        },
        {
          productId: savedProducts[6]._id, // Wire roll
          productName: savedProducts[6].name,
          sku: savedProducts[6].sku,
          quantity: 3,
          unit: savedProducts[6].unit,
          unitPrice: savedProducts[6].unitPrice,
          subtotal: 114.0,
        },
        {
          productId: savedProducts[12]._id, // Fluke Multimeter
          productName: savedProducts[12].name,
          sku: savedProducts[12].sku,
          quantity: 1,
          unit: savedProducts[12].unit,
          unitPrice: savedProducts[12].unitPrice,
          subtotal: 135.0,
        },
      ],
      subtotal: 379.0,
      discountPercentage: 15, // 15% discount on total
      discountAmount: 56.85,
      taxPercentage: 0,
      taxAmount: 0,
      grandTotal: 322.15,
      notes: 'Trade account monthly discount.',
      createdAt: new Date(Date.now() - 86400000 * 1), // Yesterday
    },
    {
      invoiceNumber: 'INV-20261013-1004',
      customerName: 'Sarah Jenkins',
      customerPhone: '+91 97234 11223',
      customerAddress: 'Green Valley Villas, Villa 19',
      paymentMethod: 'Cash',
      items: [
        {
          productId: savedProducts[4]._id, // Brass Valve
          productName: savedProducts[4].name,
          sku: savedProducts[4].sku,
          quantity: 2,
          unit: savedProducts[4].unit,
          unitPrice: savedProducts[4].unitPrice,
          subtotal: 17.98,
        },
        {
          productId: savedProducts[3]._id, // Conduit pipe
          productName: savedProducts[3].name,
          sku: savedProducts[3].sku,
          quantity: 6,
          unit: savedProducts[3].unit,
          unitPrice: savedProducts[3].unitPrice,
          subtotal: 27.0,
        },
      ],
      subtotal: 44.98,
      discountPercentage: 0, // No discount
      discountAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      grandTotal: 44.98,
      notes: '',
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
  ];

  await SaleModel.insertMany(sampleSales);
  console.log(`Seeded ${sampleSales.length} realistic sales invoices with discounts!`);

  await mongoose.disconnect();
  console.log('Database seeding finished successfully!');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
