import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Specialties from "@/components/Specialties";
import Services from "@/components/Services";
import QuoteSection from "@/components/QuoteSection";
import ProcessSection from "@/components/ProcessSection";
import WhyChooseUsSection from "@/components/WhyChooseUsSection";
import HospitalLocationsSection from "@/components/HospitalLocationsSection";
import CTASection from "@/components/CTASection";
import FinalCTASection from "@/components/FinalCTASection";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Specialties />
      <Services />
       <QuoteSection />
       <ProcessSection /> 
       <WhyChooseUsSection />
       <HospitalLocationsSection />
       <CTASection />
       <FinalCTASection />
    </main>
  );
}
