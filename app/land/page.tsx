'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import pb from '@/utils/pocketbase'  // Assuming you have a pocketbase utility for auth

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if the user is authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (pb.authStore.isValid) {
        // Redirect to the dashboard if the user is already authenticated
        router.push('/dashboard')
      } else {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [router])

  // Toggle mobile menu visibility
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
    document.body.style.overflow = isMenuOpen ? '' : 'hidden'
  }

  if (isLoading) {
    return <div>Loading...</div>  // You can replace this with a proper loading component
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo">TrackItPay</div>
          <button
            className={`mobile-menu-btn ${isMenuOpen ? 'active' : ''}`}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            onClick={toggleMenu}
          >
            <div className="hamburger-lines">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <Link href="#features">Features</Link>
            <Link href="#testimonials">Testimonials</Link>
            <Link href="#contact">Contact</Link>
            <Link href="/login" className="btn btn-signup">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>
              Financial Control <span className="blue-accent">Simplified</span>
            </h1>
            <p>
              Track expenses, analyze spending patterns, and make informed financial decisions with our powerful yet
              intuitive platform.
            </p>
            <Link href="/login" className="btn btn-primary">
              Start Free Trial
            </Link>

            {/* Product Hunt Badge */}
            <div className="product-hunt-badge">
              <a href="https://www.producthunt.com/posts/trackitpay?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-trackitpay" target="_blank" rel="noopener noreferrer">
                <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=605869&theme=dark" alt="TrackItPay - Simplify&#0032;Your&#0032;Finances&#0044;&#0032;Track&#0032;with&#0032;Ease&#0046; | Product Hunt" style={{ width: '224px', height: '48px' }} />
              </a>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="features-grid">
            <div className="feature-card">
              <h3>Smart Dashboard</h3>
              <p>Real-time overview of your finances with intelligent insights and spending analytics.</p>
            </div>
            <div className="feature-card">
              <h3>Transaction Management</h3>
              <p>Automated categorization and powerful filtering for complete control over your transactions.</p>
            </div>
            <div className="feature-card">
              <h3>Financial Analytics</h3>
              <p>Deep insights into your spending patterns with customizable reports and visualizations.</p>
            </div>
          </div>
        </section>

        <section className="testimonials" id="testimonials">
          <h2>Trusted by Professionals</h2>
          <div className="testimonial-card">
            <p>
              &quot;TrackItPay has revolutionized how I manage my business finances. The interface is clean, and the
              insights are invaluable.&quot;
            </p>
            <strong>Sarah Johnson</strong>
            <p className="small-text">Business Owner</p>
          </div>
        </section>

        <section className="cta">
          <h2>Ready to Transform Your Financial Management?</h2>
          <p>Join thousands of users who have optimized their financial tracking with TrackItPay.</p>
          <Link href="#" className="btn">
            Get Started
          </Link>
        </section>
      </main>

      <footer className="footer" id="contact">
        <div>
          <Link href="#">About</Link>
          <Link href="#">Privacy</Link>
          <Link href="#">Terms</Link>
          <Link href="#">Contact</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} TrackItPay. All rights reserved.</p>
      </footer>

      {isMenuOpen && <div className="nav-backdrop" onClick={toggleMenu}></div>}
    </div>
  )
}
