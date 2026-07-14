import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { trpcServer } from '@hono/trpc-server'
import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '../../../lib/redis'

// Initialize tRPC
const t = initTRPC.create()

// Define Product type
interface Product {
  id: string
  name: string
  price: number
  description: string
  category: string
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
    price: 1890000,
    description: 'Compact 75% mechanical keyboard with hot-swappable yellow switches, PBT keycaps, and custom RGB backlight options.',
    category: 'Peripherals',
    image: createMockImage('%234F46E5', 'Apex Keyboard'),
    stock: 12
  },
  {
    id: 'prod-2',
    name: 'UltraWide Curved Monitor 34"',
    price: 6490000,
    description: 'Immersive 34-inch curved productivity and gaming monitor featuring a 144Hz refresh rate, HDR400, and 99% sRGB.',
    category: 'Displays',
    image: createMockImage('%2306B6D4', 'Curved Monitor'),
    stock: 5
  },
  {
    id: 'prod-3',
    name: 'Studio Wireless Headphones',
    price: 2450000,
    description: 'Premium over-ear headphones with active hybrid noise cancelling, 40-hour battery life, and high-fidelity sound driver.',
    category: 'Audio',
    image: createMockImage('%23EC4899', 'Studio Headphones'),
    stock: 20
  },
  {
    id: 'prod-4',
    name: 'Ergonomic Mesh Office Chair',
    price: 3200000,
    description: 'Full mesh ergonomic office chair with adjustable 3D armrests, lumbar support, and tilt-locking mechanism.',
    category: 'Furniture',
    image: createMockImage('%2310B981', 'Mesh Chair'),
    stock: 8
  },
  {
    id: 'prod-5',
    name: 'MagSafe Wireless Charger Stand',
    price: 550000,
    description: 'Fast 15W wireless charging stand designed for iPhones and AirPods, with sleek aluminum alloy finishing.',
    category: 'Accessories',
    image: createMockImage('%23F59E0B', 'Charger Stand'),
    stock: 35
  },
  {
    id: 'prod-6',
    name: 'RGB Gaming Mouse',
    price: 890000,
    description: 'Ultra-lightweight gaming mouse weighing only 59g, equipped with a 26k DPI optical sensor and paracord cable.',
    category: 'Peripherals',
    image: createMockImage('%238B5CF6', 'Gaming Mouse'),
    stock: 15
  }
]

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
    .input(z.object({ userId: z.string() }))
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
        status: 'PAID'
      }
      
      orders.unshift(newOrder)
      await db.set(ordersKey, JSON.stringify(orders))

      // Clear Cart
      await db.set(cartKey, JSON.stringify([]))

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
