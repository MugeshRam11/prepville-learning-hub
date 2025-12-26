import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnimatedHero from '@/components/home/AnimatedHero';
import HowItWorks from '@/components/home/HowItWorks';
import QuestionBankPower from '@/components/home/QuestionBankPower';
import SmartFeatures from '@/components/home/SmartFeatures';
import PlansPreview from '@/components/home/PlansPreview';
import TrustSection from '@/components/home/TrustSection';
import FinalCTA from '@/components/home/FinalCTA';
import SubscriptionBanner from '@/components/SubscriptionBanner';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SubscriptionBanner />
      <main className="flex-1">
        <AnimatedHero />
        <HowItWorks />
        <QuestionBankPower />
        <SmartFeatures />
        <PlansPreview />
        <TrustSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
