'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useTheme } from 'next-themes'
import pb from '@/utils/pocketbase'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    pb.authStore.clear()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/transactions', label: 'Transactions' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <div
      className={`${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'} min-h-screen overflow-y-auto`}
      style={{ 
        scrollbarWidth: 'none', /* For Firefox */
        msOverflowStyle: 'none', /* For IE and Edge */
      }}
    >
      <header className={`${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'} shadow-sm`}>
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            Trackit
          </Link>
          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`hover:text-gray-400 ${pathname === item.href ? 'text-gray-400' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button onClick={handleLogout}>Logout</Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </nav>
        {isMobileMenuOpen && (
          <div className="md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${pathname === item.href ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
