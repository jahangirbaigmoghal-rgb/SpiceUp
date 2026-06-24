import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { BrowsePage } from './pages/BrowsePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TrackingPage } from './pages/TrackingPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/menu" element={<BrowsePage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </Layout>
  );
}
