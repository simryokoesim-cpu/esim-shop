import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import NavBar from './components/NavBar'

function App() {
  useEffect(() => {
    // Initialize Telegram Web App
    const tg = window.Telegram?.WebApp
    if (!tg) return
    try { tg.ready?.() } catch (e) { console.warn('[TelegramWebApp] ready failed:', e) }
    try { tg.expand?.() } catch (e) { console.warn('[TelegramWebApp] expand failed:', e) }
    try { tg.setHeaderColor?.('#0a0a0f') } catch (e) { console.warn('[TelegramWebApp] setHeaderColor failed:', e) }
    try { tg.setBackgroundColor?.('#0a0a0f') } catch (e) { console.warn('[TelegramWebApp] setBackgroundColor failed:', e) }
  }, [])

  return (
    <HashRouter>
      <div className="min-h-screen" style={{ background: '#0a0a0f', paddingBottom: '70px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:orderId" element={<OrderDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NavBar />
      </div>
    </HashRouter>
  )
}

export default App
