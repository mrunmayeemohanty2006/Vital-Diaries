/**
 * Vital Diaries - Privacy-First Health Records Landing Page
 */

import React, { useState } from 'react';
import { AmbientBackground } from './AmbientBackground';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { TrustStatement } from './TrustStatement';
import { HowItWorks } from './HowItWorks';
import { ProductFeatures } from './ProductFeatures';
import { PrivacyArchitecture } from './PrivacyArchitecture';
import { CrossDevice } from './CrossDevice';
import { FAQSection } from './FAQSection';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';
import { AboutModal } from './AboutModal';

interface LandingPageProps {
  onNavigateAuth: (mode: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateAuth }) => {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const handleNavigateAuth = (route: string) => {
    if (route.includes('login') || route.includes('sign-in')) {
      onNavigateAuth('login');
    } else {
      onNavigateAuth('register');
    }
  };

  return (
    <div id="home" className="relative min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Scroll-driven Ambient Background */}
      <AmbientBackground />

      {/* Sticky Top Bar */}
      <Navbar onNavigateAuth={handleNavigateAuth} />

      {/* Main Page Flow */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero onNavigateAuth={handleNavigateAuth} />

        {/* Trust / Privacy Statement */}
        <TrustStatement />

        {/* How It Works (UPLOAD -> ENCRYPT -> ACCESS) */}
        <HowItWorks />

        {/* Product Features (6 structured capability cards) */}
        <ProductFeatures />

        {/* Privacy Architecture (Distinctive dark section) */}
        <PrivacyArchitecture />

        {/* Cross-Device Sync Experience */}
        <CrossDevice />

        {/* FAQ Accordion Section */}
        <FAQSection onNavigateAuth={handleNavigateAuth} />

        {/* Final Conversion Action */}
        <FinalCTA onNavigateAuth={handleNavigateAuth} />
      </main>

      {/* Quiet Footer */}
      <Footer
        onNavigateAuth={handleNavigateAuth}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />

      {/* About Project / Architecture Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
};
