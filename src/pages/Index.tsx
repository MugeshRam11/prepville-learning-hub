
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import SubjectsSection from '@/components/SubjectsSection';
import FeaturesSection from '@/components/FeaturesSection';
import StatsSection from '@/components/StatsSection';
import CTASection from '@/components/CTASection';
import SubscriptionBanner from '@/components/SubscriptionBanner';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SubscriptionBanner />
      <main className="flex-1">
        <HeroSection />
        <SubjectsSection />
        <FeaturesSection />
        <StatsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
