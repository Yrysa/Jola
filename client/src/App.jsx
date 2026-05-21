import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import Footer from './components/Footer.jsx';
import MobileTabBar from './components/MobileTabBar.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import PersonalizationEffects from './components/PersonalizationEffects.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AppConfigProvider } from './context/AppConfigContext.jsx';
import { recordHeartbeat, recordPageVisit } from './utils/sessionActivity.js';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const TelegramMiniAppPage = lazy(() => import('./pages/TelegramMiniAppPage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const ShippingPage = lazy(() => import('./pages/ShippingPage.jsx'));
const ContactsPage = lazy(() => import('./pages/ContactsPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const RecentlyViewedPage = lazy(() => import('./pages/RecentlyViewedPage.jsx'));

const PolygraphyCatalogPage = lazy(() => import('./polygraphy/pages/PolygraphyCatalogPage.jsx'));
const PrintServicePage = lazy(() => import('./polygraphy/pages/PrintServicePage.jsx'));
const PolygraphyToolsPage = lazy(() => import('./polygraphy/pages/PolygraphyToolsPage.jsx'));
const ImageEditorPage = lazy(() => import('./polygraphy/pages/ImageEditorPage.jsx'));
const PdfEditorPage = lazy(() => import('./polygraphy/pages/PdfEditorPage.jsx'));
const OfficeEditorPage = lazy(() => import('./polygraphy/pages/OfficeEditorPage.jsx'));

function HomeGate() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return <HomePage />;
}


function SessionActivityBridge() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?._id) return undefined;

    recordPageVisit(user._id, pathname, {
      title: document.title,
      snapshot: {
        currentPath: pathname,
      },
    });

    return undefined;
  }, [pathname, user?._id]);

  useEffect(() => {
    if (!user?._id) return undefined;

    recordHeartbeat(user._id);
    const heartbeat = window.setInterval(() => recordHeartbeat(user._id), 15000);
    const flush = () => recordHeartbeat(user._id);

    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
      recordHeartbeat(user._id);
    };
  }, [user?._id]);


  return null;
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(false);
  const location = useLocation();
  const isTelegramMiniApp = location.pathname.startsWith('/tg-app');

  useEffect(() => {
    if (isTelegramMiniApp) return;
    try {
      const seen = localStorage.getItem('jola_intro_seen_v4');
      if (!seen) setShowSplash(true);
    } catch {
      setShowSplash(true);
    }
  }, [isTelegramMiniApp]);

  const finishSplash = () => {
    try {
      localStorage.setItem('jola_intro_seen_v4', '1');
    } catch {
    }
    setShowSplash(false);
  };

  return (
    <div className={`app${isTelegramMiniApp ? ' app--telegram-mini' : ''}`}>
      {!isTelegramMiniApp && showSplash ? <SplashScreen onDone={finishSplash} /> : null}
      {!isTelegramMiniApp ? <Header /> : null}
      {!isTelegramMiniApp ? <PersonalizationEffects /> : null}
      <main className={`main-content${isTelegramMiniApp ? ' main-content--telegram-mini' : ''}`}>
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes>
            <Route path="/" element={<HomeGate />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/recently-viewed" element={<RecentlyViewedPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />

            <Route path="/polygraphy" element={<PolygraphyCatalogPage />} />
            <Route path="/polygraphy/editor" element={<PolygraphyToolsPage />} />
            <Route
              path="/polygraphy/editor/images"
              element={
                <ProtectedRoute>
                  <ImageEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/polygraphy/editor/pdf"
              element={
                <ProtectedRoute>
                  <PdfEditorPage />
                </ProtectedRoute>
              }
            />
            <Route path="/polygraphy/editor/ai" element={<Navigate to="/polygraphy/editor" replace />} />
            <Route
              path="/polygraphy/editor/office"
              element={
                <ProtectedRoute>
                  <OfficeEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/polygraphy/editor/office/:docId"
              element={
                <ProtectedRoute>
                  <OfficeEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/polygraphy/:key"
              element={
                <ProtectedRoute>
                  <PrintServicePage />
                </ProtectedRoute>
              }
            />

            <Route path="/about" element={<AboutPage />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

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
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
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
            <Route
              path="/tg-app"
              element={
                <ProtectedRoute>
                  <TelegramMiniAppPage />
                </ProtectedRoute>
              }
            />

            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!isTelegramMiniApp ? <Footer /> : null}
      {!isTelegramMiniApp ? <MobileTabBar /> : null}
    </div>
  );
}

function App() {
  return (
    <AppConfigProvider>
      <AuthProvider>
        <SessionActivityBridge />
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </AppConfigProvider>
  );
}

export default App;
