import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { InstallBanner } from '@/components/InstallBanner';
import { Toaster } from '@/components/Toaster';
import { Home } from '@/pages/Home';
import { Tools } from '@/pages/Tools';
import { ToolPage } from '@/pages/ToolPage';
import { Pricing } from '@/pages/Pricing';
import { NotFound } from '@/pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <MobileNav />
        <InstallBanner />
        <CommandPalette />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/:toolId" element={<ToolPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
        <Toaster />
      </div>
    </BrowserRouter>
  );
}