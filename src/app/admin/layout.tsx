// src/app/admin/layout.tsx
'use client'

import AdminAuthGuard from '@/components/AdminAuthGuard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>
}