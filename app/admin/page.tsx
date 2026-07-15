'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { trpc } from '../../lib/trpc'

interface Product {
  id: string
  name: string
  price: number
  description: string
  category: string
  image: string
  stock: number
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient()
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [inputPassword, setInputPassword] = useState('')

  // Form States
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState('')
  const [stock, setStock] = useState(0)

  // Verify auth on mount
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (token === 'session_admin_token_epic') {
      setIsAuthenticated(true)
    }
    setIsCheckingAuth(false)
  }, [])

  // Helper to add toast notifications
  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // Clear Form
  const resetForm = () => {
    setIsEditing(false)
    setEditId('')
    setName('')
    setPrice(0)
    setDescription('')
    setCategory('')
    setImage('')
    setStock(0)
  }

  // Generate a fallback brutalist SVG image if user doesn't provide one
  const generateFallbackSvg = (productName: string) => {
    const colors = ['%234F46E5', '%2306B6D4', '%23EC4899', '%2310B981', '%23F59E0B', '%238B5CF6', '%23FF8844']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="${randomColor}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="white">${encodeURIComponent(productName)}</text></svg>`
  }

  // --- Queries ---
  const { data: products = [], isLoading: loadingProducts, error: productsError } = useQuery({
    queryKey: ['products'],
    queryFn: () => trpc.getProducts.query(),
    enabled: isAuthenticated // Only run query if authenticated
  })

  // --- Mutations ---
  // Login Admin Mutation
  const loginMutation = useMutation({
    mutationFn: (pwd: string) => trpc.loginAdmin.mutate({ password: pwd }),
    onSuccess: (res) => {
      sessionStorage.setItem('adminToken', res.token)
      setIsAuthenticated(true)
      addToast('Login Admin Sukses!')
      setInputPassword('')
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || 'Password salah!', 'error')
    }
  })

  // Create Product
  const createProductMutation = useMutation({
    mutationFn: (newProd: Omit<Product, 'id'>) => trpc.createProduct.mutate(newProd),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      addToast(`Successfully created product: "${res.name}"`)
      resetForm()
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || 'Failed to create product', 'error')
    }
  })

  // Update Product
  const updateProductMutation = useMutation({
    mutationFn: (updatedProd: Product) => trpc.updateProduct.mutate(updatedProd),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      addToast(`Successfully updated product: "${res.name}"`)
      resetForm()
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || 'Failed to update product', 'error')
    }
  })

  // Delete Product
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => trpc.deleteProduct.mutate({ id }),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      addToast(`Deleted product.`, 'error')
      if (editId === deletedId) {
        resetForm()
      }
    },
    onError: (err: { message?: string }) => {
      addToast(err.message || 'Failed to delete product', 'error')
    }
  })

  // Handle Login Submit
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputPassword.trim()) return
    loginMutation.mutate(inputPassword)
  }

  // Handle Logout Action
  const handleLogout = () => {
    sessionStorage.removeItem('adminToken')
    setIsAuthenticated(false)
    addToast('Logout Sukses!', 'error')
  }

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || price < 0 || !description || !category || stock < 0) {
      addToast('Please fill all required fields correctly', 'error')
      return
    }

    const finalImage = image.trim() || generateFallbackSvg(name)

    if (isEditing) {
      updateProductMutation.mutate({
        id: editId,
        name,
        price,
        description,
        category,
        image: finalImage,
        stock
      })
    } else {
      createProductMutation.mutate({
        name,
        price,
        description,
        category,
        image: finalImage,
        stock
      })
    }
  }

  // Fill form for editing
  const startEdit = (product: Product) => {
    setIsEditing(true)
    setEditId(product.id)
    setName(product.name)
    setPrice(product.price)
    setDescription(product.description)
    setCategory(product.category)
    setImage(product.image.startsWith('data:image/svg+xml') ? '' : product.image)
    setStock(product.stock)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num)
  }

  // 1. Loading state during mount checks to prevent Next.js SSR flicker
  if (isCheckingAuth) {
    return (
      <div className="app-container">
        <header>
          <Link href="/" className="logo">
            EPIC<span style={{ color: 'var(--accent-secondary)' }}>STORE</span>
          </Link>
        </header>
        <main className="loader-container" style={{ minHeight: '70vh' }}>
          <div className="brutal-spinner"></div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* HEADER */}
      <header>
        <Link href="/" className="logo">
          EPIC<span style={{ color: 'var(--accent-secondary)' }}>STORE</span>
        </Link>
        <div className="nav-actions">
          <Link
            href="/"
            className="cart-button"
            style={{ background: 'var(--brutal-yellow)', textDecoration: 'none' }}
          >
            ← View Store
          </Link>
          {isAuthenticated && (
            <button
              className="cart-button"
              style={{ background: 'var(--danger)', color: '#FFF', border: '3px solid #000', cursor: 'pointer', marginLeft: '0.5rem' }}
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {/* 2. Render Login Screen if not authenticated */}
      {!isAuthenticated ? (
        <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '1rem' }}>
          <div className="order-card admin-header-title" style={{ background: '#FFF', width: '400px', maxWidth: '100%', transform: 'rotate(-0.5deg)' }}>
            <h2 style={{ fontSize: '1.75rem', borderBottom: '3px solid #000', paddingBottom: '0.75rem', marginBottom: '1.5rem', textAlign: 'center', background: 'var(--brutal-pink)', padding: '0.5rem', border: '3px solid #000', boxShadow: '3px 3px 0px #000' }}>
              🔑 Admin Login
            </h2>
            
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '800', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                  Enter Admin Password
                </label>
                <input
                  type="password"
                  className="search-input"
                  style={{ width: '100%', WebkitTextStroke: '0px' }}
                  placeholder="••••••••"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  required
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Default password: <code style={{ background: '#eee', padding: '0.1rem 0.3rem', border: '1px solid #ccc' }}>admin123</code>
                </p>
              </div>
              
              <button
                type="submit"
                className="btn-checkout"
                style={{ background: 'var(--brutal-cyan)' }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Verifying...' : 'Akses Dashboard'}
              </button>
            </form>
          </div>
        </main>
      ) : (
        /* 3. Render Dashboard if authenticated */
        <main>
          {/* HERO TITLE */}
          <div className="admin-header-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '3rem', transform: 'rotate(1deg)', display: 'inline-block', background: '#FFF', padding: '0.5rem 2rem', border: '3px solid #000', boxShadow: 'var(--neo-shadow-md)' }}>
              Admin Dashboard
            </h1>
            <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', display: 'inline-block', background: '#FFF', padding: '0.4rem 1rem', border: '3px solid #000' }}>
              Manage the EpicStore product catalog — Add, Edit, or Remove items instantly.
            </p>
          </div>

          <div className="admin-grid-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
            
            {/* PRODUCT FORM */}
            <div className="order-card" style={{ background: '#FFF' }}>
              <h2 style={{ fontSize: '1.5rem', borderBottom: '3px solid #000', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                {isEditing ? '⚡ Edit Product' : '➕ Add New Product'}
              </h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Product Name *</label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. Mechanical Keyboard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '800', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Price (IDR) *</label>
                    <input
                      type="number"
                      className="search-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. 1500000"
                      value={price || ''}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '800', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Stock *</label>
                    <input
                      type="number"
                      className="search-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. 10"
                      value={stock || ''}
                      onChange={(e) => setStock(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Category *</label>
                  <select
                    className="search-input"
                    style={{ width: '100%', cursor: 'pointer' }}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    <option value="Peripherals">Peripherals</option>
                    <option value="Displays">Displays</option>
                    <option value="Audio">Audio</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Image URL (Optional)</label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="Leave blank for a custom SVG cover"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Description *</label>
                  <textarea
                    className="search-input"
                    style={{ width: '100%', height: '100px', resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                    placeholder="Enter detailed specifications..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn-checkout"
                    style={{ flex: 1, background: isEditing ? 'var(--brutal-yellow)' : 'var(--brutal-green)' }}
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {isEditing ? 'Save Changes' : 'Create Product'}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      className="btn-close"
                      style={{ height: 'auto', width: 'auto', padding: '0 1rem' }}
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* PRODUCT LIST TABLE */}
            <div className="order-card" style={{ background: '#FFF', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', borderBottom: '3px solid #000', paddingBottom: '0.75rem' }}>
                📦 Product Inventory ({products.length})
              </h2>

              {loadingProducts ? (
                <div className="loader-container">
                  <div className="brutal-spinner" style={{ width: '40px', height: '40px' }}></div>
                  <p className="loader-text" style={{ fontSize: '0.95rem' }}>Loading Inventory...</p>
                </div>
              ) : productsError ? (
                <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '2rem' }}>Failed to load inventory.</div>
              ) : products.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No products inside inventory.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {products.map(product => (
                    <div
                      key={product.id}
                      style={{
                        border: '3px solid #000',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        background: editId === product.id ? 'rgba(178, 128, 255, 0.1)' : 'var(--bg-secondary)',
                        boxShadow: editId === product.id ? '2px 2px 0 #000' : '4px 4px 0 #000',
                        transform: editId === product.id ? 'translate(2px, 2px)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: '48px', height: '48px', objectFit: 'cover', border: '2px solid #000', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', WebkitTextStroke: '0px' }}>
                            {product.name}
                          </h4>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                            <span style={{ fontWeight: 'bold', color: '#000' }}>{formatPrice(product.price)}</span>
                            <span>•</span>
                            <span>Stock: {product.stock}</span>
                            <span>•</span>
                            <span style={{ background: 'var(--brutal-orange)', padding: '0 0.3rem', border: '1px solid #000', color: '#000', fontSize: '0.75rem', fontWeight: '800' }}>{product.category}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          className="qty-btn"
                          style={{ background: 'var(--brutal-cyan)', width: 'auto', padding: '0 0.75rem', height: '32px', fontSize: '0.85rem', fontWeight: '800' }}
                          onClick={() => startEdit(product)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-remove"
                          style={{ width: 'auto', padding: '0 0.75rem', height: '32px', fontSize: '0.85rem', background: '#FFF' }}
                          disabled={deleteProductMutation.isPending}
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove "${product.name}"?`)) {
                              deleteProductMutation.mutate(product.id)
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

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
