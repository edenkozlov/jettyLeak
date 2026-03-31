import { Link } from 'react-router'
import { BrandLogoMark } from '@/components/BrandLogoMark'
import ScrollToTopButton from '@/components/ScrollToTopButton'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark className="h-7 w-auto max-w-[min(100%,10rem)] shrink-0 object-contain object-left" />
            <span className="text-sm font-bold text-gray-900">Beluga</span>
          </Link>
          <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-600">Back to Home</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 pt-32 pb-20 sm:px-6">
        <h1 className="text-[32px] font-bold tracking-tight text-gray-900 sm:text-[40px]">Privacy Policy</h1>
        <p className="mt-2 text-[13px] text-gray-400">Last updated: February 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
          <p>
            Beluga ("we", "our", "us") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use the Beluga app and services.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Information we collect</h2>
          <p>
            When you use Beluga, we collect water flow data from the sensors installed in your building. This data includes flow rate, volume, and timing information. We also collect your email address and basic account information when you sign up.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">How we use your data</h2>
          <p>
            We use sensor data to provide real-time monitoring, leak detection, appliance classification, and historical usage reports. Your account information is used to deliver the service and communicate with you about your account.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Data storage & security</h2>
          <p>
            Your data is stored securely using industry-standard encryption. We do not sell or share your personal information or sensor data with third parties for marketing purposes.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Data retention</h2>
          <p>
            We retain your sensor data for as long as your account is active. You can request deletion of your data at any time by contacting us.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Third-party services</h2>
          <p>
            We may use third-party services for hosting, analytics, and push notifications. These services are bound by their own privacy policies and are selected for their commitment to data protection.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Contact</h2>
          <p>
            If you have questions about this privacy policy or your data, contact us at{' '}
            <a href="mailto:support@beluga.com" className="font-medium text-indigo-600 hover:text-indigo-500">support@beluga.com</a>.
          </p>
        </div>
      </main>

      <ScrollToTopButton />
    </div>
  )
}
