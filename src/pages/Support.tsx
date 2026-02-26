import { Link } from 'react-router'
import logo from '@/assets/logoTransparent.png'
import ScrollToTopButton from '@/components/ScrollToTopButton'

export default function Support() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/"><img src={logo} alt="Flomo" className="h-7" /></Link>
          <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-600">Back to Home</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 pt-32 pb-20 sm:px-6">
        <h1 className="text-[32px] font-bold tracking-tight text-gray-900 sm:text-[40px]">Support</h1>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
          <p>
            Need help with Flomo? We're here for you. Whether you have a question about your sensor, need help reading your dashboard, or want to report an issue — our team is happy to assist.
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Contact us</h2>
          <p>
            The fastest way to reach us is by email. Send us a message and we'll get back to you within one business day.
          </p>
          <p>
            <a href="mailto:support@getflomo.com" className="font-medium text-indigo-600 hover:text-indigo-500">support@getflomo.com</a>
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">Common questions</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">How do I install the sensor?</h3>
              <p className="mt-1">Flomo clamps onto the outside of your pipe — no cutting, no plumber needed. It works on copper, PEX, CPVC, and galvanized pipes.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Does it need WiFi?</h3>
              <p className="mt-1">Not at the pipe. The sensor transmits data via LoRa to a hub elsewhere in the building that has connectivity.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">How do I read my dashboard?</h3>
              <p className="mt-1">The app shows real-time flow in litres per hour, historical usage charts, and alert notifications. If something looks off, the app will tell you what it means and what to do.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">I think my sensor is offline</h3>
              <p className="mt-1">Check that the hub has power and connectivity. If the issue persists, email us and we'll troubleshoot it with you.</p>
            </div>
          </div>
        </div>
      </main>

      <ScrollToTopButton />
    </div>
  )
}
