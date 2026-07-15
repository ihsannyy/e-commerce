import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="loader-container animate-fade-in" style={{ minHeight: '100vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', transform: 'rotate(-1deg)', display: 'inline-block', background: '#FFF', padding: '0.5rem 2rem', border: '3px solid #000', boxShadow: 'var(--neo-shadow-md)' }}>
        404
      </h1>
      <p style={{ marginTop: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', display: 'inline-block', background: '#FFF', padding: '0.4rem 1rem', border: '3px solid #000' }}>
        Page Not Found / Halaman Tidak Ditemukan
      </p>
      <div>
        <Link href="/" className="cart-button" style={{ background: 'var(--brutal-yellow)', textDecoration: 'none', display: 'inline-block' }}>
          Return Home / Kembali ke Toko
        </Link>
      </div>
    </div>
  )
}
