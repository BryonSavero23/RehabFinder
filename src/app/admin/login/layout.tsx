// src/app/admin/login/layout.tsx
// This layout bypasses the admin auth guard for the login page
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}