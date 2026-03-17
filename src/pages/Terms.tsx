import { Link } from 'react-router'
import logo from '@/assets/belugaLogo.png'
import ScrollToTopButton from '@/components/ScrollToTopButton'

export default function Terms() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="Beluga" className="h-7" /><span className="text-sm font-bold text-gray-900">Beluga</span></Link>
          <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-600">Back to Home</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 pt-32 pb-20 sm:px-6">
        <h1 className="text-[32px] font-bold tracking-tight text-gray-900 sm:text-[40px]">Terms of Service</h1>
        <p className="mt-2 text-[13px] text-gray-400">Last updated: February 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
          <p>
            By using the Beluga app and services, you agree to the following terms. Please read them carefully.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Use of the service</h2>
          <p>
            Beluga provides water flow monitoring, leak detection, and analytics through hardware sensors and a companion app. You agree to use the service for lawful purposes and in accordance with these terms.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Account responsibility</h2>
          <p>
            You are responsible for maintaining the security of your account credentials. Notify us immediately if you suspect unauthorized access to your account.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Hardware & installation</h2>
          <p>
            Beluga sensors are designed for non-invasive installation. You are responsible for ensuring proper placement on your pipes. Beluga is not liable for damage resulting from improper installation or use outside recommended conditions.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Limitation of liability</h2>
          <p>
            Beluga provides monitoring and alerts as a supplementary tool. It is not a substitute for professional plumbing inspection or emergency water shutoff systems. We are not liable for water damage, property loss, or any indirect or consequential damages.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Service availability</h2>
          <p>
            We strive to maintain continuous uptime but do not guarantee uninterrupted service. Maintenance, updates, or factors beyond our control may cause temporary interruptions.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Changes to terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Contact</h2>
          <p>
            Questions about these terms? Reach us at{' '}
            <a href="mailto:support@beluga.com" className="font-medium text-indigo-600 hover:text-indigo-500">support@beluga.com</a>.
          </p>
        </div>
      </main>

      <ScrollToTopButton />
    </div>
  )
}
