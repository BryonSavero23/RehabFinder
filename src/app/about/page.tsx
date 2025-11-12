// src/app/about/page.tsx
import Link from 'next/link'
import Header from '@/components/Header'

export const metadata = {
  title: 'About Us | RehabFinder',
  description: 'Learn about RehabFinder\'s mission to connect people with rehabilitation centres across Malaysia and Thailand.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section - Light Mint Background */}
      <section className="bg-[#E8F5E3] py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-gradient-to-r from-[#17A88C] to-[#1D5B79] text-white text-sm font-semibold rounded-full shadow-lg">
              Making Recovery Accessible
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#17A88C] via-[#1D5B79] to-[#468B97] bg-clip-text text-transparent mb-4">
            About RehabFinder
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Connecting people with the right rehabilitation support across Southeast Asia
          </p>
        </div>
      </section>

      {/* Mission Section - White Background */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#1D5B79] to-[#468B97] rounded-2xl shadow-xl p-8 sm:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <span className="text-4xl">🎯</span>
                Our Mission
              </h2>
              <p className="text-blue-50 leading-relaxed text-lg mb-4">
                RehabFinder was created to simplify the process of finding quality rehabilitation centres. 
                We believe that everyone deserves easy access to the support and care they need for recovery 
                and wellness.
              </p>
              <p className="text-blue-50 leading-relaxed text-lg">
                Our comprehensive directory helps individuals and families discover rehabilitation facilities 
                that match their specific needs, whether for addiction recovery, physical therapy, mental health 
                support, or other rehabilitation services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section - Light Blue Background */}
      <section className="bg-[#E3F2F7] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-10 text-center">
            What We Offer
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-[#E3F2F7] rounded-2xl shadow-lg hover:shadow-xl border-2 border-[#A0D5DD] p-8 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[#17A88C] to-[#1D5B79] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Comprehensive Search
              </h3>
              <p className="text-gray-600 leading-relaxed text-base">
                Browse over 1,100 rehabilitation centres across Malaysia and Thailand with advanced 
                filtering and location-based search capabilities.
              </p>
            </div>

            <div className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-[#E3F2F7] rounded-2xl shadow-lg hover:shadow-xl border-2 border-[#A0D5DD] p-8 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[#468B97] to-[#1D5B79] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Interactive Maps
              </h3>
              <p className="text-gray-600 leading-relaxed text-base">
                Visualize centre locations with integrated Google Maps, making it easy to find 
                facilities near you or in your preferred area.
              </p>
            </div>

            <div className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-[#E3F2F7] rounded-2xl shadow-lg hover:shadow-xl border-2 border-[#A0D5DD] p-8 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[#17A88C] to-[#468B97] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Detailed Information
              </h3>
              <p className="text-gray-600 leading-relaxed text-base">
                Access comprehensive details about each centre including services offered, 
                contact information, and facility types.
              </p>
            </div>

            <div className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-[#E3F2F7] rounded-2xl shadow-lg hover:shadow-xl border-2 border-[#A0D5DD] p-8 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1D5B79] to-[#17A88C] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Up-to-Date Directory
              </h3>
              <p className="text-gray-600 leading-relaxed text-base">
                Our database is regularly maintained and updated to ensure you have access to 
                accurate and current information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Section - White Background */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-r from-[#17A88C] via-[#1D5B79] to-[#468B97] rounded-2xl shadow-2xl p-10 overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-10 text-center">
                Our Coverage
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Malaysia Card - WHITE CARD WITH DARK TEXT */}
                <div className="bg-white rounded-xl p-8 text-center border-2 border-[#17A88C] hover:shadow-xl transition-all duration-300">
                  <div className="mb-4 flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#17A88C] to-[#1D5B79] rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Malaysia</h3>
                  <p className="text-gray-600 text-base leading-relaxed mb-4">
                    Comprehensive coverage across all states and major cities including Kuala Lumpur, 
                    Penang, Johor Bahru, Selangor, and more
                  </p>
                  <div className="mt-4 pt-4 border-t-2 border-[#A0D5DD]">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-[#17A88C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-[#1D5B79] font-bold text-xl">500+ Centres</p>
                    </div>
                  </div>
                </div>

                {/* Thailand Card - WHITE CARD WITH DARK TEXT */}
                <div className="bg-white rounded-xl p-8 text-center border-2 border-[#17A88C] hover:shadow-xl transition-all duration-300">
                  <div className="mb-4 flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#468B97] to-[#1D5B79] rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Thailand</h3>
                  <p className="text-gray-600 text-base leading-relaxed mb-4">
                    Extensive network of rehabilitation facilities nationwide including Bangkok, 
                    Chiang Mai, Phuket, Pattaya, and beyond
                  </p>
                  <div className="mt-4 pt-4 border-t-2 border-[#A0D5DD]">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-[#17A88C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-[#1D5B79] font-bold text-xl">600+ Centres</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section - Light Mint Background */}
      <section className="bg-[#E8F5E3] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-10 text-center">
            Our Values
          </h2>
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-[#17A88C] to-[#1D5B79] rounded-2xl shadow-lg p-7 flex gap-5 items-start text-white transform hover:scale-[1.02] transition-transform duration-300">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-white bg-opacity-30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-3xl">🌟</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2">Accessibility</h3>
                <p className="text-blue-50 text-base leading-relaxed">
                  Making rehabilitation information freely available to everyone who needs it, 
                  ensuring no barriers stand between individuals and the help they seek
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#468B97] to-[#17A88C] rounded-2xl shadow-lg p-7 flex gap-5 items-start text-white transform hover:scale-[1.02] transition-transform duration-300">
  <div className="flex-shrink-0">
    <div className="w-14 h-14 bg-white bg-opacity-30 backdrop-blur-sm rounded-xl flex items-center justify-center">
      <span className="text-3xl">✅</span>
    </div>
  </div>
  <div className="flex-1">
    <h3 className="font-bold text-xl mb-2">Accuracy</h3>
    <p className="text-blue-50 text-base leading-relaxed">
      Maintaining reliable and verified information about rehabilitation centres through 
      regular updates and quality checks
    </p>
  </div>
</div>

            <div className="bg-gradient-to-r from-[#1D5B79] to-[#468B97] rounded-2xl shadow-lg p-7 flex gap-5 items-start text-white transform hover:scale-[1.02] transition-transform duration-300">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-white bg-opacity-30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-3xl">❤️</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2">Compassion</h3>
                <p className="text-blue-50 text-base leading-relaxed">
                  Understanding that finding help is a sensitive and important journey that requires 
                  empathy and respectful support
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#17A88C] to-[#468B97] rounded-2xl shadow-lg p-7 flex gap-5 items-start text-white transform hover:scale-[1.02] transition-transform duration-300">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-white bg-opacity-30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-3xl">🔍</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2">Transparency</h3>
                <p className="text-blue-50 text-base leading-relaxed">
                  Providing clear, honest information with no hidden agendas or biases, helping users 
                  make informed decisions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - White Background */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative bg-gradient-to-br from-[#1D5B79] via-[#17A88C] to-[#468B97] rounded-2xl p-10 sm:p-12 text-white shadow-2xl overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -ml-32 -mt-32"></div>
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full -mr-40 -mb-40"></div>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Find the Right Support?
              </h2>
              <p className="text-blue-50 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
                Start your search today and discover rehabilitation centres that can help you 
                or your loved ones on the path to recovery and wellness.
              </p>
              <Link
                href="/centres"
                className="inline-block bg-white text-[#1D5B79] px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#E3F2F7] transform hover:scale-105 transition-all duration-200 shadow-xl"
              >
                Find Centres Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-[#1D5B79] to-[#468B97] border-t-4 border-[#17A88C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-blue-100 text-sm">
            <p>© {new Date().getFullYear()} RehabFinder. Connecting people with rehabilitation support.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}