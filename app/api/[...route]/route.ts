import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { trpcServer } from '@hono/trpc-server'
import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '../../../lib/db'

// Initialize tRPC
const t = initTRPC.create()

// Define Product type
interface Product {
  id: string
  name: string
  nameEn?: string
  nameId?: string
  price: number
  description: string
  descriptionEn?: string
  descriptionId?: string
  category: string
  categoryEn?: string
  categoryId?: string
  image: string
  stock: number
}

// Inline SVGs for beautiful, high-quality, zero-network-latency mock product images
const createMockImage = (color: string, label: string) => 
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="white">${label}</text></svg>`

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Apex Mechanical Keyboard',
    nameEn: 'Apex Mechanical Keyboard',
    nameId: 'Keyboard Mekanikal Apex',
    price: 1890000,
    description: 'Compact 75% mechanical keyboard with hot-swappable yellow switches, PBT keycaps, and custom RGB backlight options.',
    descriptionEn: 'Compact 75% mechanical keyboard with hot-swappable yellow switches, PBT keycaps, and custom RGB backlight options.',
    descriptionId: 'Keyboard mekanikal 75% ringkas dengan switch kuning hot-swappable, keycap PBT, dan opsi lampu latar RGB kustom.',
    category: 'Peripherals',
    categoryEn: 'Peripherals',
    categoryId: 'Periferal',
    image: createMockImage('%234F46E5', 'Apex Keyboard'),
    stock: 12
  },
  {
    id: 'prod-2',
    name: 'UltraWide Curved Monitor 34"',
    nameEn: 'UltraWide Curved Monitor 34"',
    nameId: 'Monitor Lengkung UltraWide 34"',
    price: 6490000,
    description: 'Immersive 34-inch curved productivity and gaming monitor featuring a 144Hz refresh rate, HDR400, and 99% sRGB.',
    descriptionEn: 'Immersive 34-inch curved productivity and gaming monitor featuring a 144Hz refresh rate, HDR400, and 99% sRGB.',
    descriptionId: 'Monitor produktivitas dan gaming lengkung 34 inci yang imersif dilengkapi refresh rate 144Hz, HDR400, dan sRGB 99%.',
    category: 'Displays',
    categoryEn: 'Displays',
    categoryId: 'Layar',
    image: createMockImage('%2306B6D4', 'Curved Monitor'),
    stock: 5
  },
  {
    id: 'prod-3',
    name: 'Studio Wireless Headphones',
    nameEn: 'Studio Wireless Headphones',
    nameId: 'Headphone Studio Nirkabel',
    price: 2450000,
    description: 'Premium over-ear headphones with active hybrid noise cancelling, 40-hour battery life, and high-fidelity sound driver.',
    descriptionEn: 'Premium over-ear headphones with active hybrid noise cancelling, 40-hour battery life, and high-fidelity sound driver.',
    descriptionId: 'Headphone over-ear premium dengan peredam bising hibrida aktif, daya tahan baterai 40 jam, dan driver suara berkualitas tinggi.',
    category: 'Audio',
    categoryEn: 'Audio',
    categoryId: 'Audio',
    image: createMockImage('%23EC4899', 'Studio Headphones'),
    stock: 20
  },
  {
    id: 'prod-4',
    name: 'Ergonomic Mesh Office Chair',
    nameEn: 'Ergonomic Mesh Office Chair',
    nameId: 'Kursi Kantor Mesh Ergonomis',
    price: 3200000,
    description: 'Full mesh ergonomic office chair with adjustable 3D armrests, lumbar support, and tilt-locking mechanism.',
    descriptionEn: 'Full mesh ergonomic office chair with adjustable 3D armrests, lumbar support, and tilt-locking mechanism.',
    descriptionId: 'Kursi kantor ergonomis jaring penuh dengan sandaran tangan 3D yang dapat disesuaikan, penopang lumbar, dan mekanisme penguncian kemiringan.',
    category: 'Furniture',
    categoryEn: 'Furniture',
    categoryId: 'Furnitur',
    image: createMockImage('%2310B981', 'Mesh Chair'),
    stock: 8
  },
  {
    id: 'prod-5',
    name: 'MagSafe Wireless Charger Stand',
    nameEn: 'MagSafe Wireless Charger Stand',
    nameId: 'Dudukan Charger Nirkabel MagSafe',
    price: 550000,
    description: 'Fast 15W wireless charging stand designed for iPhones and AirPods, with sleek aluminum alloy finishing.',
    descriptionEn: 'Fast 15W wireless charging stand designed for iPhones and AirPods, with sleek aluminum alloy finishing.',
    descriptionId: 'Dudukan pengisian daya nirkabel cepat 15W yang dirancang untuk iPhone dan AirPods, dengan lapisan paduan aluminium yang ramping.',
    category: 'Accessories',
    categoryEn: 'Accessories',
    categoryId: 'Aksesori',
    image: createMockImage('%23F59E0B', 'Charger Stand'),
    stock: 35
  },
  {
    id: 'prod-6',
    name: 'RGB Gaming Mouse',
    nameEn: 'RGB Gaming Mouse',
    nameId: 'Mouse Gaming RGB',
    price: 890000,
    description: 'Ultra-lightweight gaming mouse weighing only 59g, equipped with a 26k DPI optical sensor and paracord cable.',
    descriptionEn: 'Ultra-lightweight gaming mouse weighing only 59g, equipped with a 26k DPI optical sensor and paracord cable.',
    descriptionId: 'Mouse gaming ultra-ringan dengan berat hanya 59g, dilengkapi dengan sensor optik 26k DPI dan kabel paracord.',
    category: 'Peripherals',
    categoryEn: 'Peripherals',
    categoryId: 'Periferal',
    image: createMockImage('%238B5CF6', 'Gaming Mouse'),
    stock: 15
  }
]

interface OrderItemInfo {
  productId: string
  name: string
  price: number
  quantity: number
}

interface OrderInfo {
  id: string
  date: string
  items: OrderItemInfo[]
  total: number
  status: string
  shipping: {
    name: string
    phone: string
    city: string
    address: string
  }
}

// Send Telegram Notification to the admin about new order
async function sendTelegramNotification(order: OrderInfo) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.log('ℹ️ Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured in env variables.')
    return
  }

  try {
    const itemsList = order.items
      .map((item: OrderItemInfo) => `• *${item.name}* (x${item.quantity}) - Rp ${item.price.toLocaleString('id-ID')}`)
      .join('\n')

    const message = `🔔 *PESANAN BARU MASUK! (NEW ORDER)* 🔔\n` +
      `----------------------------------\n` +
      `📦 *ID Pesanan:* \`${order.id}\`\n` +
      `📅 *Tanggal:* ${new Date(order.date).toLocaleString('id-ID')}\n\n` +
      `👤 *Penerima:* *${order.shipping.name}*\n` +
      `📞 *No. HP:* \`${order.shipping.phone}\`\n` +
      `🏙️ *Kota:* ${order.shipping.city}\n` +
      `🏠 *Alamat:* ${order.shipping.address}\n\n` +
      `🛒 *Daftar Barang:*\n${itemsList}\n\n` +
      `💰 *Total Bayar:* *Rp ${order.total.toLocaleString('id-ID')}*\n` +
      `----------------------------------`

    const url = `https://api.telegram.org/bot${token}/sendMessage`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('⚠️ Failed to send Telegram notification:', errText)
    } else {
      console.log('✅ Telegram order notification sent successfully!')
    }
  } catch (error) {
    console.error('⚠️ Error sending Telegram notification:', error)
  }
}

// Initialize products in "database" (Redis)
const getInitializedProducts = async (): Promise<Product[]> => {
  const data = await db.get('products')
  if (!data) {
    await db.set('products', JSON.stringify(DEFAULT_PRODUCTS))
    return DEFAULT_PRODUCTS
  }
  return JSON.parse(data)
}

// Router definition
const appRouter = t.router({
  // Query to get all products
  getProducts: t.procedure.query(async () => {
    return await getInitializedProducts()
  }),

  // Query to get single product by ID
  getProductById: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const products = await getInitializedProducts()
      const product = products.find(p => p.id === input.id)
      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found'
        })
      }
      return product
    }),

  // Query to fetch items in user's cart
  getCart: t.procedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const cartKey = `cart:${input.userId}`
      const cartItemsStr = await db.get(cartKey)
      if (!cartItemsStr) return []
      
      const cartItems: { productId: string; quantity: number }[] = JSON.parse(cartItemsStr)
      const products = await getInitializedProducts()
      
      // Map cart items to include complete product details
      return cartItems
        .map(item => {
          const product = products.find(p => p.id === item.productId)
          return product ? { product, quantity: item.quantity } : null
        })
        .filter((item): item is { product: Product; quantity: number } => item !== null)
    }),

  // Mutation to add product or increase quantity in user's cart
  addToCart: t.procedure
    .input(z.object({
      userId: z.string(),
      productId: z.string(),
      quantity: z.number().min(1).default(1)
    }))
    .mutation(async ({ input }) => {
      const products = await getInitializedProducts()
      const product = products.find(p => p.id === input.productId)
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })
      }
      if (product.stock < input.quantity) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Requested quantity exceeds stock availability' })
      }

      const cartKey = `cart:${input.userId}`
      const cartItemsStr = await db.get(cartKey)
      const cartItems: { productId: string; quantity: number }[] = cartItemsStr ? JSON.parse(cartItemsStr) : []

      const existingItemIndex = cartItems.findIndex(item => item.productId === input.productId)
      if (existingItemIndex > -1) {
        // Limit to stock
        const newQty = cartItems[existingItemIndex].quantity + input.quantity
        if (newQty > product.stock) {
          cartItems[existingItemIndex].quantity = product.stock
        } else {
          cartItems[existingItemIndex].quantity = newQty
        }
      } else {
        cartItems.push({ productId: input.productId, quantity: input.quantity })
      }

      await db.set(cartKey, JSON.stringify(cartItems))
      return { success: true, cartItemsCount: cartItems.reduce((acc, curr) => acc + curr.quantity, 0) }
    }),

  // Mutation to decrease or remove product from user's cart
  removeFromCart: t.procedure
    .input(z.object({
      userId: z.string(),
      productId: z.string(),
      decrementOnly: z.boolean().default(false)
    }))
    .mutation(async ({ input }) => {
      const cartKey = `cart:${input.userId}`
      const cartItemsStr = await db.get(cartKey)
      if (!cartItemsStr) return { success: false, cartItemsCount: 0 }

      const cartItems: { productId: string; quantity: number }[] = JSON.parse(cartItemsStr)
      const existingItemIndex = cartItems.findIndex(item => item.productId === input.productId)

      if (existingItemIndex > -1) {
        if (input.decrementOnly && cartItems[existingItemIndex].quantity > 1) {
          cartItems[existingItemIndex].quantity -= 1
        } else {
          cartItems.splice(existingItemIndex, 1)
        }
      }

      await db.set(cartKey, JSON.stringify(cartItems))
      return { success: true, cartItemsCount: cartItems.reduce((acc, curr) => acc + curr.quantity, 0) }
    }),

  // Mutation to clear the cart
  clearCart: t.procedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const cartKey = `cart:${input.userId}`
      await db.set(cartKey, JSON.stringify([]))
      return { success: true }
    }),

  // Mutation to checkout user's cart and place order
  checkout: t.procedure
    .input(z.object({
      userId: z.string(),
      shippingName: z.string(),
      shippingPhone: z.string(),
      shippingCity: z.string(),
      shippingAddress: z.string()
    }))
    .mutation(async ({ input }) => {
      const cartKey = `cart:${input.userId}`
      const cartItemsStr = await db.get(cartKey)
      if (!cartItemsStr) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart is empty' })

      const cartItems: { productId: string; quantity: number }[] = JSON.parse(cartItemsStr)
      if (cartItems.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart is empty' })

      const products = await getInitializedProducts()
      
      // Verify stock and update product stock
      const updatedProducts = [...products]
      let totalAmount = 0
      const orderItems = []

      for (const item of cartItems) {
        const prodIndex = updatedProducts.findIndex(p => p.id === item.productId)
        if (prodIndex === -1) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Product ${item.productId} not found` })
        }
        
        const product = updatedProducts[prodIndex]
        if (product.stock < item.quantity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Not enough stock for ${product.name}` })
        }

        product.stock -= item.quantity
        totalAmount += product.price * item.quantity
        orderItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity
        })
      }

      // Update product DB
      await db.set('products', JSON.stringify(updatedProducts))

      // Save order
      const ordersKey = `orders:${input.userId}`
      const ordersStr = await db.get(ordersKey)
      const orders = ordersStr ? JSON.parse(ordersStr) : []
      
      const newOrder = {
        id: `order-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toISOString(),
        items: orderItems,
        total: totalAmount,
        status: 'PAID',
        shipping: {
          name: input.shippingName,
          phone: input.shippingPhone,
          city: input.shippingCity,
          address: input.shippingAddress
        }
      }
      
      orders.unshift(newOrder)
      await db.set(ordersKey, JSON.stringify(orders))

      // Clear Cart
      await db.set(cartKey, JSON.stringify([]))

      // Trigger Telegram notification in the background
      sendTelegramNotification(newOrder).catch(err => {
        console.error('⚠️ Telegram notification background error:', err)
      })

      return { success: true, order: newOrder }
    }),

  // Query to get user orders
  getOrders: t.procedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const ordersKey = `orders:${input.userId}`
      const ordersStr = await db.get(ordersKey)
      return ordersStr ? JSON.parse(ordersStr) : []
    }),

  // Mutation to create a product (Admin)
  createProduct: t.procedure
    .input(z.object({
      name: z.string().min(1),
      price: z.number().min(0),
      description: z.string().min(1),
      category: z.string().min(1),
      image: z.string().min(1),
      stock: z.number().min(0)
    }))
    .mutation(async ({ input }) => {
      const products = await getInitializedProducts()
      const newProduct: Product = {
        id: `prod-${Math.floor(100000 + Math.random() * 900000)}`,
        ...input
      }
      products.push(newProduct)
      await db.set('products', JSON.stringify(products))
      return newProduct
    }),

  // Mutation to update a product (Admin)
  updateProduct: t.procedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      price: z.number().min(0),
      description: z.string().min(1),
      category: z.string().min(1),
      image: z.string().min(1),
      stock: z.number().min(0)
    }))
    .mutation(async ({ input }) => {
      const products = await getInitializedProducts()
      const index = products.findIndex(p => p.id === input.id)
      if (index === -1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })
      }
      products[index] = { ...input }
      await db.set('products', JSON.stringify(products))
      return products[index]
    }),

  // Mutation to delete a product (Admin)
  deleteProduct: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const products = await getInitializedProducts()
      const index = products.findIndex(p => p.id === input.id)
      if (index === -1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })
      }
      products.splice(index, 1)
      await db.set('products', JSON.stringify(products))
      return { success: true }
    }),

  // Mutation to verify admin password (Admin Auth)
  loginAdmin: t.procedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      const correctPassword = process.env.ADMIN_PASSWORD || 'admin123'
      if (input.password === correctPassword) {
        return { success: true, token: 'session_admin_token_epic' }
      }
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Password admin salah!'
      })
    })
})

export type AppRouter = typeof appRouter

// Setup Hono application
const app = new Hono().basePath('/api')

// Mount tRPC server handler on /api/trpc
app.use('/trpc/*', trpcServer({
  router: appRouter,
  endpoint: '/api/trpc'
}))

// Export Hono handlers for Next.js App Router
export const GET = handle(app)
export const POST = handle(app)
export const OPTIONS = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
