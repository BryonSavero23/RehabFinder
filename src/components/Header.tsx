// src/components/Header.tsx - FIXED: No Hydration Errors + Contact Link
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Header() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before checking pathname
  useEffect(() => {
    setMounted(true)
    setIsAdmin(pathname.startsWith('/admin'))
  }, [pathname])

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Find Centres', href: '/centres' },
    { name: 'About', href: '/about' },
    { name: 'Resources', href: '/#resources' },
    { name: 'Contact', href: '/contact' },  // ← ADDED
  ]

  const adminNavItems = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Centers', href: '/admin/centers' },
    { name: 'Contact Forms', href: '/admin/contact-submissions' },  // ← ADDED
    // { name: 'Import', href: '/admin/import' },
    // { name: 'Geocoding', href: '/admin/geocoding' },
    // { name: 'Settings', href: '/admin/settings' },
    // { name: 'Cleanup Duplicates', href: '/admin/cleanup-duplicates' }
  ]

  // 🔧 FIX: Show skeleton loaders instead of nav items during SSR
  // This prevents hydration mismatch because skeleton is same on server & client
  if (!mounted) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - always the same */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900">RehabFinder</span>
            </Link>

            {/* 🔧 SKELETON LOADERS instead of actual nav items */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Admin toggle skeleton */}
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded mr-4"></div>
              {/* Nav items skeleton - added one more for Contact */}
              <div className="h-9 w-16 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-9 w-24 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-9 w-16 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded"></div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="text-gray-500 hover:text-gray-700 focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // After mounting, render the actual navigation
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              RehabFinder
              {isAdmin && (
                <span className="text-sm font-normal text-orange-600 ml-2">Admin</span>
              )}
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {/* Admin Toggle */}
            <div className="flex items-center gap-1 mr-4">
              <Link
                href={isAdmin ? '/' : '/admin'}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isAdmin
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isAdmin ? '🏠 Public Site' : '⚙️ Admin'}
              </Link>
            </div>

            {/* Navigation Items */}
            {(isAdmin ? adminNavItems : navItems).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? isAdmin
                        ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-600'
                        : 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-500 hover:text-gray-700 focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu (hidden by default) */}
      <div className="md:hidden border-t border-gray-200 bg-white">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {/* Admin Toggle Mobile */}
          <Link
            href={isAdmin ? '/' : '/admin'}
            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
              isAdmin
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isAdmin ? '🏠 Public Site' : '⚙️ Admin Panel'}
          </Link>

          {/* Mobile Navigation Items */}
          {(isAdmin ? adminNavItems : navItems).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive
                    ? isAdmin
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}