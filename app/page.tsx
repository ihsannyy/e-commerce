'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../lib/trpc'

const USER_ID = 'user_epic_gamer_99' // Mock static user ID for demonstration

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface Order {
  id: string
  date: string
  items: OrderItem[]
  total: number
  status: string
}

export default function StorefrontPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Helper to add toast notifications
  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // --- Queries ---
  // Fetch Products
  const { data: products = [], isLoading: loadingProducts, error: productsError } = useQuery({
    queryKey: ['products'],
    queryFn: () => trpc.getProducts.query(),
  })

  // Fetch Cart
  const { data: cart = [], isLoading: loadingCart } = useQuery({
    queryKey: ['cart', USER_ID],
    queryFn: () => trpc.getCart.query({ userId: USER_ID }),
  })

  // Fetch Orders
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', USER_ID],
    queryFn: () => trpc.getOrders.query({ userId: USER_ID }),
  })

  // --- Mutations ---
  // Add to Cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (productId: string) =>
      trpc.addToCart.mutate({ userId: USER_ID, productId, quantity: 1 }),
    onSuccess: (res, productId) => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
      const product = products.find(p => p.id === productId)
      addToast(`Added "${product?.name || 'Item'}" to cart!`)
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || 'Failed to add item to cart', 'error')
    },
  })

  // Decrement Cart item mutation
  const decrementCartMutation = useMutation({
    mutationFn: (productId: string) =>
      trpc.removeFromCart.mutate({ userId: USER_ID, productId, decrementOnly: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || 'Error updating cart', 'error')
    },
  })

  // Remove completely mutation
  const removeCartMutation = useMutation({
    mutationFn: (productId: string) =>
      trpc.removeFromCart.mutate({ userId: USER_ID, productId, decrementOnly: false }),
    onSuccess: (res, productId) => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
      const product = products.find(p => p.id === productId)
      addToast(`Removed "${product?.name || 'Item'}" from cart.`, 'error')
    },
  })

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: () => trpc.checkout.mutate({ userId: USER_ID }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['orders', USER_ID] })
      addToast(`Checkout Successful! Order ID: ${res.order.id}`, 'success')
      setIsCartOpen(false)
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || 'Checkout failed', 'error')
    },
  })

  // Calculate cart quantities and total prices
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)

  // Unique categories list
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))]

  // Filter products by search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num)
  }

  return (
    <div className="app-container">
      {/* HEADER */}
      <header>
        <a href="#" className="logo">
          EPIC<span style={{ color: 'var(--accent-secondary)' }}>STORE</span>
        </a>
        <div className="nav-actions">
          <button className="cart-button" onClick={() => setIsCartOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            Cart
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero">
        <h1>
          Elevate Your <span className="highlight-text">Desk Setup</span>
        </h1>
        <p>
          Discover premium, custom mechanical keyboards, high refresh-rate monitors, high-fidelity audio equipment, and ergonomic office configurations.
        </p>
      </section>

      {/* MAIN CONTAINER */}
      <main>
        {/* FILTERS & SEARCH */}
        <div className="controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="category-tabs-wrapper">
            <div className="category-tabs">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PRODUCTS SECTION */}
        {loadingProducts ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Loading premium products...
          </div>
        ) : productsError ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>
            Error fetching products. Please make sure the backend is active.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No products match your search.
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map(product => (
              <div className="product-card" key={product.id}>
                <div className="product-image-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                  />
                </div>
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3 className="product-title">{product.name}</h3>
                  <p className="product-desc">{product.description}</p>
                  
                  <div className="product-footer">
                    <span className="product-price">{formatPrice(product.price)}</span>
                    <button
                      className="btn-add"
                      disabled={product.stock === 0 || addToCartMutation.isPending}
                      onClick={() => addToCartMutation.mutate(product.id)}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: product.stock < 5 ? 'var(--warning)' : 'var(--text-muted)', marginTop: '0.5rem' }}>
                    {product.stock > 0 ? `Stock: ${product.stock} items remaining` : 'Out of stock'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ORDERS SECTION */}
        {orders.length > 0 && (
          <div className="orders-section">
            <h2 className="orders-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Your Orders ({orders.length})
            </h2>
            <div className="orders-list">
              {orders.map((order: Order) => (
                <div className="order-card" key={order.id}>
                  <div className="order-meta">
                    <div>
                      Order ID: <span className="order-id">{order.id}</span>
                    </div>
                    <div className="order-date">
                      {new Date(order.date).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <span className="order-status">{order.status}</span>
                  </div>
                  <div className="order-items">
                    {order.items.map((item: OrderItem, idx: number) => (
                      <div className="order-item-row" key={idx}>
                        <span>{item.name} (x{item.quantity})</span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="order-total-row">
                    <span>Total Paid</span>
                    <span style={{ color: 'var(--accent-secondary)' }}>{formatPrice(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CART DRAWER BACKDROP & DRAWER */}
      <div
        className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`}
        onClick={() => setIsCartOpen(false)}
      />
      <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button className="btn-close" onClick={() => setIsCartOpen(false)}>×</button>
        </div>

        <div className="cart-items">
          {loadingCart ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading cart items...
            </div>
          ) : cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              <p>Your cart is currently empty.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div className="cart-item" key={item.product.id || idx}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="cart-item-image"
                />
                <div className="cart-item-details">
                  <div className="cart-item-title">{item.product.name}</div>
                  <div className="cart-item-price">{formatPrice(item.product.price)}</div>
                </div>
                <div className="cart-item-actions">
                  <button
                    className="qty-btn"
                    disabled={decrementCartMutation.isPending}
                    onClick={() => decrementCartMutation.mutate(item.product.id)}
                  >
                    -
                  </button>
                  <span className="cart-item-qty">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    disabled={item.quantity >= item.product.stock || addToCartMutation.isPending}
                    onClick={() => addToCartMutation.mutate(item.product.id)}
                  >
                    +
                  </button>
                  <button
                    className="btn-remove"
                    onClick={() => removeCartMutation.mutate(item.product.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary-row">
              <span className="cart-total-label">Subtotal</span>
              <span className="cart-total-value">{formatPrice(cartTotal)}</span>
            </div>
            <button
              className="btn-checkout"
              disabled={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
            >
              {checkoutMutation.isPending ? 'Processing Order...' : 'Complete Checkout'}
            </button>
          </div>
        )}
      </div>

      {/* TOAST SYSTEM */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div className={`toast ${toast.type}`} key={toast.id}>
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)' }}><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger)' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
