'use client'

import React, { useState, useEffect } from 'react'
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
  shipping?: {
    name: string
    phone: string
    city: string
    address: string
  }
}

// Indonesian major cities list for dropdown selection
const INDONESIAN_CITIES = [
  'Jakarta',
  'Surabaya',
  'Bandung',
  'Yogyakarta',
  'Medan',
  'Makassar',
  'Semarang',
  'Palembang',
  'Denpasar',
  'Malang'
]

// Multi-language Translation Dictionary
const TRANSLATIONS = {
  en: {
    heroTitle1: 'Elevate Your',
    heroTitle2: 'Desk Setup',
    heroDesc: 'Discover premium, custom mechanical keyboards, curved monitors, high-fidelity audio equipment, and ergonomic configurations.',
    searchPlaceholder: 'Search products...',
    cart: 'Cart',
    outOfStock: 'Out of Stock',
    addToCart: 'Add to Cart',
    stockRemaining: 'Stock: {qty} items remaining',
    cartTitle: 'Shopping Cart',
    cartEmpty: 'Your cart is currently empty.',
    subtotal: 'Subtotal',
    checkoutBtn: 'Complete Checkout',
    receiverName: 'Receiver Name *',
    phoneNumber: 'Phone Number (Indonesian) *',
    shippingCity: 'Shipping City *',
    fullAddress: 'Full Address *',
    selectCity: '-- Select City --',
    ordersTitle: 'Your Orders',
    totalPaid: 'Total Paid',
    orderStatus: 'PAID',
    toastAdded: 'Added "{name}" to cart!',
    toastRemoved: 'Removed "{name}" from cart.',
    toastCheckoutSuccess: 'Checkout Successful! Order ID: {id}',
    toastValidationErr: 'Please fill all checkout fields correctly!',
    toastGenericErr: 'Something went wrong. Please try again.',
    qtyMinErr: 'Cannot reduce quantity further. Remove item instead.',
    qtyStockErr: 'Requested quantity exceeds stock availability.',
    formNamePlaceholder: 'e.g. John Doe',
    formPhonePlaceholder: 'e.g. 08123456789',
    formAddressPlaceholder: 'e.g. Sudirman St. No. 45, Apartment Block B',
    shippingDetails: 'Shipping Details:',
    receiverLabel: 'Receiver:',
    cityLabel: 'City:',
    addressLabel: 'Address:',
    allCategory: 'All'
  },
  id: {
    heroTitle1: 'Tingkatkan',
    heroTitle2: 'Setup Meja Anda',
    heroDesc: 'Temukan keyboard mekanikal kustom premium, monitor melengkung, perangkat audio berkualitas tinggi, dan kursi ergonomis.',
    searchPlaceholder: 'Cari produk...',
    cart: 'Keranjang',
    outOfStock: 'Stok Habis',
    addToCart: 'Beli Sekarang',
    stockRemaining: 'Stok: sisa {qty} barang',
    cartTitle: 'Keranjang Belanja',
    cartEmpty: 'Keranjang belanja Anda kosong.',
    subtotal: 'Total Bayar',
    checkoutBtn: 'Selesaikan Pembayaran',
    receiverName: 'Nama Penerima *',
    phoneNumber: 'Nomor Handphone *',
    shippingCity: 'Kota Pengiriman *',
    fullAddress: 'Alamat Lengkap *',
    selectCity: '-- Pilih Kota --',
    ordersTitle: 'Pesanan Anda',
    totalPaid: 'Total Dibayar',
    orderStatus: 'LUNAS',
    toastAdded: 'Berhasil memasukkan "{name}" ke keranjang!',
    toastRemoved: 'Berhasil menghapus "{name}" dari keranjang.',
    toastCheckoutSuccess: 'Checkout Berhasil! ID Pesanan: {id}',
    toastValidationErr: 'Harap isi semua formulir pengiriman dengan benar!',
    toastGenericErr: 'Terjadi kesalahan. Silakan coba lagi.',
    qtyMinErr: 'Kuantitas tidak bisa dikurangi lagi. Hapus produk saja.',
    qtyStockErr: 'Kuantitas yang diminta melebihi stok yang tersedia.',
    formNamePlaceholder: 'contoh: John Doe',
    formPhonePlaceholder: 'contoh: 08123456789',
    formAddressPlaceholder: 'contoh: Jl. Sudirman No. 45, Gedung B Lt. 3',
    shippingDetails: 'Detail Pengiriman:',
    receiverLabel: 'Penerima:',
    cityLabel: 'Kota:',
    addressLabel: 'Alamat:',
    allCategory: 'Semua'
  }
}

export default function StorefrontPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Language State
  const [lang, setLang] = useState<'en' | 'id'>('en')

  // Guest Checkout Form States
  const [shippingName, setShippingName] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  // Load language settings on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'id'
    if (savedLang === 'en' || savedLang === 'id') {
      setLang(savedLang)
    }
  }, [])

  // Toggle Language
  const toggleLang = (newLang: 'en' | 'id') => {
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  // Get active dictionary translations
  const t = TRANSLATIONS[lang]

  // Helper to add toast notifications
  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // Clear Form Fields
  const resetCheckoutForm = () => {
    setShippingName('')
    setShippingPhone('')
    setShippingCity('')
    setShippingAddress('')
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
  // Add to Cart
  const addToCartMutation = useMutation({
    mutationFn: (productId: string) =>
      trpc.addToCart.mutate({ userId: USER_ID, productId, quantity: 1 }),
    onSuccess: (res, productId) => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
      const product = products.find(p => p.id === productId)
      const prodName = lang === 'en' ? (product?.nameEn || product?.name) : (product?.nameId || product?.name)
      addToast(t.toastAdded.replace('{name}', prodName || 'Item'))
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || t.toastGenericErr, 'error')
    },
  })

  // Decrement Cart item
  const decrementCartMutation = useMutation({
    mutationFn: (productId: string) =>
      trpc.removeFromCart.mutate({ userId: USER_ID, productId, decrementOnly: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || t.toastGenericErr, 'error')
    },
  })

  // Remove completely
  const removeCartMutation = useMutation({
    mutationFn: (productId: string) =>
      trpc.removeFromCart.mutate({ userId: USER_ID, productId, decrementOnly: false }),
    onSuccess: (res, productId) => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
      const product = products.find(p => p.id === productId)
      const prodName = lang === 'en' ? (product?.nameEn || product?.name) : (product?.nameId || product?.name)
      addToast(t.toastRemoved.replace('{name}', prodName || 'Item'), 'error')
    },
  })

  // Checkout
  const checkoutMutation = useMutation({
    mutationFn: (shippingData: { name: string; phone: string; city: string; address: string }) =>
      trpc.checkout.mutate({
        userId: USER_ID,
        shippingName: shippingData.name,
        shippingPhone: shippingData.phone,
        shippingCity: shippingData.city,
        shippingAddress: shippingData.address
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cart', USER_ID] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['orders', USER_ID] })
      addToast(t.toastCheckoutSuccess.replace('{id}', res.order.id), 'success')
      resetCheckoutForm()
      setIsCartOpen(false)
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || t.toastGenericErr, 'error')
    },
  })

  // Calculate cart metrics
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)

  // Unique categories list
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))]

  // Filter products by search and category
  const filteredProducts = products.filter(product => {
    const pName = lang === 'en' ? (product.nameEn || product.name) : (product.nameId || product.name)
    const pDesc = lang === 'en' ? (product.descriptionEn || product.description) : (product.descriptionId || product.description)
    
    const matchesSearch = pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pDesc.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Get category translation
  const getCategoryLabel = (cat: string) => {
    if (cat === 'All') return t.allCategory
    const product = products.find(p => p.category === cat)
    if (product) {
      return lang === 'en' ? (product.categoryEn || product.category) : (product.categoryId || product.category)
    }
    return cat
  }

  // Form Validation and submission handler
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Validation Name
    if (shippingName.trim().length < 3) {
      addToast(lang === 'en' ? 'Receiver name must be at least 3 characters!' : 'Nama Penerima minimal harus 3 karakter!', 'error')
      return
    }

    // 2. Validation Phone Number
    const phoneRegex = /^(08|\+62)\d{8,12}$/
    if (!phoneRegex.test(shippingPhone.trim())) {
      addToast(lang === 'en' ? 'Enter a valid Indonesian phone number starting with 08 or +62!' : 'Masukkan nomor HP Indonesia yang valid diawali 08 atau +62!', 'error')
      return
    }

    // 3. Validation City selection
    if (!shippingCity) {
      addToast(lang === 'en' ? 'Please select a shipping destination city!' : 'Harap pilih kota tujuan pengiriman!', 'error')
      return
    }

    // 4. Validation Full Address
    if (shippingAddress.trim().length < 12) {
      addToast(lang === 'en' ? 'Full Address must be at least 12 characters!' : 'Alamat lengkap minimal harus 12 karakter!', 'error')
      return
    }

    // Trigger mutation
    checkoutMutation.mutate({
      name: shippingName.trim(),
      phone: shippingPhone.trim(),
      city: shippingCity,
      address: shippingAddress.trim()
    })
  }

  return (
    <div className="app-container">
      {/* HEADER */}
      <header>
        <a href="#" className="logo">
          EPIC<span style={{ color: 'var(--accent-secondary)' }}>STORE</span>
        </a>
        <div className="nav-actions">
          {/* Flat Design & Neo-Brutalist Language Switch */}
          <div className="lang-toggle">
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => toggleLang('en')}>EN</button>
            <button className={`lang-btn ${lang === 'id' ? 'active' : ''}`} onClick={() => toggleLang('id')}>ID</button>
          </div>
          
          <button className="cart-button" onClick={() => setIsCartOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            {t.cart}
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero">
        <h1>
          {t.heroTitle1} <span className="highlight-text">{t.heroTitle2}</span>
        </h1>
        <p>{t.heroDesc}</p>
      </section>

      {/* MAIN CONTAINER */}
      <main>
        {/* FILTERS & SEARCH */}
        <div className="controls">
          <input
            type="text"
            className="search-input"
            placeholder={t.searchPlaceholder}
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
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PRODUCTS SECTION */}
        {loadingProducts ? (
          <div className="loader-container">
            <div className="brutal-spinner"></div>
            <p className="loader-text">Fetching Premium Gear...</p>
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
                    alt={lang === 'en' ? (product.nameEn || product.name) : (product.nameId || product.name)}
                    className="product-image"
                  />
                </div>
                <div className="product-info">
                  <span className="product-category">
                    {lang === 'en' ? (product.categoryEn || product.category) : (product.categoryId || product.category)}
                  </span>
                  <h3 className="product-title">
                    {lang === 'en' ? (product.nameEn || product.name) : (product.nameId || product.name)}
                  </h3>
                  <p className="product-desc">
                    {lang === 'en' ? (product.descriptionEn || product.description) : (product.descriptionId || product.description)}
                  </p>
                  
                  <div className="product-footer">
                    <span className="product-price">{formatPrice(product.price)}</span>
                    <button
                      className="btn-add"
                      disabled={product.stock === 0 || addToCartMutation.isPending}
                      onClick={() => addToCartMutation.mutate(product.id)}
                    >
                      {product.stock === 0 ? t.outOfStock : t.addToCart}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: product.stock < 5 ? 'var(--warning)' : 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 'bold' }}>
                    {product.stock > 0 ? t.stockRemaining.replace('{qty}', String(product.stock)) : t.outOfStock}
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
              {t.ordersTitle} ({orders.length})
            </h2>
            <div className="orders-list">
              {orders.map((order: Order) => (
                <div className="order-card" key={order.id}>
                  <div className="order-meta">
                    <div>
                      Order ID: <span className="order-id">{order.id}</span>
                    </div>
                    <div className="order-date">
                      {new Date(order.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <span className="order-status">{t.orderStatus}</span>
                  </div>
                  <div className="order-items">
                    {order.items.map((item: OrderItem, idx: number) => {
                      const product = products.find(p => p.id === item.productId)
                      const prodName = product ? (lang === 'en' ? (product.nameEn || product.name) : (product.nameId || product.name)) : item.name
                      return (
                        <div className="order-item-row" key={idx}>
                          <span>{prodName} (x{item.quantity})</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Delivery Slip Visual inside Order History */}
                  {order.shipping && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', border: '2px dashed #000', background: 'var(--bg-primary)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: '900', marginBottom: '0.3rem', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                        🚚 {t.shippingDetails}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.2rem' }}>
                        <strong>{t.receiverLabel}</strong>
                        <span>{order.shipping.name} ({order.shipping.phone})</span>
                        
                        <strong>{t.cityLabel}</strong>
                        <span>{order.shipping.city}</span>
                        
                        <strong>{t.addressLabel}</strong>
                        <span>{order.shipping.address}</span>
                      </div>
                    </div>
                  )}

                  <div className="order-total-row">
                    <span>{t.totalPaid}</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{formatPrice(order.total)}</span>
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
          <h2>{t.cartTitle}</h2>
          <button className="btn-close" onClick={() => setIsCartOpen(false)}>×</button>
        </div>

        <div className="cart-items">
          {loadingCart ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading cart...
            </div>
          ) : cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              <p>{t.cartEmpty}</p>
            </div>
          ) : (
            <>
              {cart.map((item, idx) => (
                <div className="cart-item" key={item.product.id || idx}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.product.image}
                    alt={lang === 'en' ? (item.product.nameEn || item.product.name) : (item.product.nameId || item.product.name)}
                    className="cart-item-image"
                  />
                  <div className="cart-item-details">
                    <div className="cart-item-title">
                      {lang === 'en' ? (item.product.nameEn || item.product.name) : (item.product.nameId || item.product.name)}
                    </div>
                    <div className="cart-item-price">{formatPrice(item.product.price)}</div>
                  </div>
                  <div className="cart-item-actions">
                    <button
                      className="qty-btn"
                      disabled={decrementCartMutation.isPending}
                      onClick={() => {
                        if (item.quantity === 1) {
                          removeCartMutation.mutate(item.product.id)
                        } else {
                          decrementCartMutation.mutate(item.product.id)
                        }
                      }}
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
              ))}
              
              {/* Brutalist Guest Shipping Checkout Form */}
              <div style={{ marginTop: '1.5rem', padding: '1rem', border: '3px solid #000', background: '#FFF', boxShadow: '3px 3px 0px #000' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', borderBottom: '2px solid #000', paddingBottom: '0.3rem', textTransform: 'uppercase' }}>
                  🚚 {lang === 'en' ? 'Guest Checkout Info' : 'Data Pengiriman'}
                </h3>
                <form onSubmit={handleCheckoutSubmit} id="checkout-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '800', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{t.receiverName}</label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ width: '100%', padding: '0.4rem 0.75rem', fontSize: '0.85rem', boxShadow: '2px 2px 0px #000' }}
                      placeholder={t.formNamePlaceholder}
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '800', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{t.phoneNumber}</label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ width: '100%', padding: '0.4rem 0.75rem', fontSize: '0.85rem', boxShadow: '2px 2px 0px #000' }}
                      placeholder={t.formPhonePlaceholder}
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '800', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{t.shippingCity}</label>
                    <select
                      className="search-input"
                      style={{ width: '100%', padding: '0.4rem 0.75rem', fontSize: '0.85rem', boxShadow: '2px 2px 0px #000', cursor: 'pointer' }}
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      required
                    >
                      <option value="">{t.selectCity}</option>
                      {INDONESIAN_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '800', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{t.fullAddress}</label>
                    <textarea
                      className="search-input"
                      style={{ width: '100%', padding: '0.4rem 0.75rem', fontSize: '0.85rem', height: '60px', resize: 'vertical', fontFamily: 'var(--font-sans)', boxShadow: '2px 2px 0px #000' }}
                      placeholder={t.formAddressPlaceholder}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      required
                    />
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary-row">
              <span className="cart-total-label">{t.subtotal}</span>
              <span className="cart-total-value">{formatPrice(cartTotal)}</span>
            </div>
            <button
              type="submit"
              form="checkout-form"
              className="btn-checkout"
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (lang === 'en' ? 'Processing...' : 'Memproses...') : t.checkoutBtn}
            </button>
          </div>
        )}
      </div>

      {/* TOAST SYSTEM */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div className={`toast ${toast.type}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
