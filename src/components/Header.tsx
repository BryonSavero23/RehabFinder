'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">
              RehabFinder
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-700 transition-colors font-semibold text-lg"
            >
              Home
            </Link>
            <Link 
              href="/centres" 
              className="text-gray-800 hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Find Centres
            </Link>
            <Link 
              href="/resources" 
              className="text-gray-800 hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Resources
            </Link>
            <Link 
              href="/contact" 
              className="text-gray-800 hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Contact
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-800 hover:text-blue-600 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="text-2xl font-bold">{isMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t bg-white">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/" 
                className="text-blue-600 hover:text-blue-700 transition-colors font-semibold text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/centres" 
                className="text-gray-800 hover:text-blue-600 transition-colors font-semibold text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Find Centres
              </Link>
              <Link 
                href="/resources" 
                className="text-gray-800 hover:text-blue-600 transition-colors font-semibold text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Resources
              </Link>
              <Link 
                href="/contact" 
                className="text-gray-800 hover:text-blue-600 transition-colors font-semibold text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}