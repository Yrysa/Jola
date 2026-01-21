import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

// Lazy loading pages
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));


function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="app">
          <Header />
          <main className="main-content">
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;