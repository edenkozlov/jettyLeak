import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  'What Actually Happens After a Leak Alert in Buildings — Beluga'
const META_DESCRIPTION =
  'Detection is only the first step. Learn what really happens after a leak alert in buildings — and why the workflow after detection determines the outcome.'

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleAfterLeakAlert() {
  useEffect(() => {
    document.title = PAGE_TITLE
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', META_DESCRIPTION)
    } else {
      const el = document.createElement('meta')
      el.name = 'description'
      el.content = META_DESCRIPTION
      document.head.appendChild(el)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark />
          </Link>
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">Home</Link>
            <Link to="/case-study" className="text-[13px] text-gray-400 transition hover:text-gray-700">Case Study</Link>
            <Link
              to="/login"
              className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">Article</p>
          <h1 className="mt-5 text-[26px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[42px]">
            What Actually Happens After a Leak Alert in Buildings
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">Detection is only the first step</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            Most water monitoring systems are evaluated based on one thing: whether they can detect a leak.
          </p>
          <p className={`${pCls} mt-4`}>
            But in real buildings, detection is only the first step.
          </p>
          <p className={`${pCls} mt-4`}>
            What happens <strong className="text-gray-900">after</strong> the alert is what actually determines the outcome.
          </p>
        </section>

        {/* Steps */}
        <section className={sectionCls}>
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">1</span>
                <h2 className="text-[17px] font-semibold text-gray-900">The alert is triggered</h2>
              </div>
              <p className={`${pCls} mt-3`}>
                A system detects abnormal water behavior and sends an alert.
              </p>
              <p className={`${pCls} mt-3`}>This might come through:</p>
              <ul className={`${listCls} mt-2`}>
                <li>A mobile app</li>
                <li>An email</li>
                <li>A dashboard notification</li>
              </ul>
              <p className={`${pCls} mt-3`}>At this point, the system has done its job.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">2</span>
                <h2 className="text-[17px] font-semibold text-gray-900">Someone has to see it</h2>
              </div>
              <p className={`${pCls} mt-3`}>In theory, alerts are immediate.</p>
              <p className={`${pCls} mt-3`}>In practice:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Notifications get missed</li>
                <li>Emails get buried</li>
                <li>Dashboards aren't constantly monitored</li>
              </ul>
              <p className={`${pCls} mt-3`}>The first delay often happens here.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">3</span>
                <h2 className="text-[17px] font-semibold text-gray-900">Someone has to interpret it</h2>
              </div>
              <p className={`${pCls} mt-3`}>
                Even when an alert is seen, it isn't always clear what it means.
              </p>
              <p className={`${pCls} mt-3`}>Questions come up quickly:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Is this a real issue?</li>
                <li>Is it urgent?</li>
                <li>Where is it happening?</li>
              </ul>
              <p className={`${pCls} mt-3`}>
                Without context, alerts can create uncertainty instead of clarity.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">4</span>
                <h2 className="text-[17px] font-semibold text-gray-900">It becomes a task</h2>
              </div>
              <p className={`${pCls} mt-3`}>
                Once the alert is understood, it needs to turn into action.
              </p>
              <p className={`${pCls} mt-3`}>This usually means:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Creating a work order</li>
                <li>Assigning a technician</li>
                <li>Scheduling a visit</li>
              </ul>
              <p className={`${pCls} mt-3`}>In many buildings, this step is still manual. This is the operational reality described in <Link to="/articles/how-property-managers-handle-water-issues" className={inlineLinkCls}>how property managers actually handle water issues</Link>.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">5</span>
                <h2 className="text-[17px] font-semibold text-gray-900">The issue is investigated</h2>
              </div>
              <p className={`${pCls} mt-3`}>Someone physically checks the system.</p>
              <p className={`${pCls} mt-3`}>They may:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Inspect fixtures</li>
                <li>Trace water flow</li>
                <li>Look for visible leaks</li>
              </ul>
              <p className={`${pCls} mt-3`}>
                Depending on the system, this can take time — especially if the alert doesn't clearly indicate the source.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">6</span>
                <h2 className="text-[17px] font-semibold text-gray-900">The problem is resolved</h2>
              </div>
              <p className={`${pCls} mt-3`}>Once identified, the issue is fixed.</p>
              <p className={`${pCls} mt-3`}>But by this point:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Time has passed</li>
                <li>Water may have been wasted</li>
                <li>Damage may have already occurred</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Where things break down */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Where things break down</h2>
          <p className={`${pCls} mt-4`}>At each step, small delays can add up.</p>
          <p className={`${pCls} mt-4`}>The system may detect an issue instantly, but:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Response is not instant</li>
            <li>Interpretation is not always clear</li>
            <li>Workflows are not always integrated</li>
          </ul>
          <p className={`${pCls} mt-4`}>
            This creates a gap between detection and resolution.
          </p>
        </section>

        {/* Why this matters */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Why this matters</h2>
          <p className={`${pCls} mt-4`}>Most systems are designed around detection.</p>
          <p className={`${pCls} mt-4`}>Fewer are designed around:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Clarity of insight</li>
            <li>Ease of action</li>
            <li>Integration into operations</li>
          </ul>
          <p className={`${pCls} mt-4`}>This is where a <Link to="/articles/what-is-water-intelligence-system" className={inlineLinkCls}>water intelligence system</Link> can add value — by providing context, not just alerts.</p>
          <p className={`${pCls} mt-4`}>In larger buildings, that difference becomes critical.</p>
        </section>

        {/* A better way */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>A better way to think about it</h2>
          <p className={`${pCls} mt-4`}>Instead of asking:</p>
          <p className={`${pCls} mt-2 italic`}>"Does this system detect leaks?"</p>
          <p className={`${pCls} mt-4`}>A more useful question is:</p>
          <p className={`${pCls} mt-2 italic`}>"What happens after it detects something?"</p>
          <p className={`${pCls} mt-4`}>Understanding the difference between <Link to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls}>water monitoring and leak detection</Link> is a good starting point.</p>
          <p className={`${pCls} mt-4`}>
            Because that's where outcomes are actually determined.
          </p>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Detection is important.
          </p>
          <p className={`${pCls} mt-3`}>
            But in real-world environments, the effectiveness of a system depends on everything that happens after the alert.
          </p>
          <p className={`${pCls} mt-3`}>
            Understanding that workflow is key to choosing the right approach. Explore how different systems compare in our <Link to="/best-water-monitoring-systems" className={inlineLinkCls}>guide to the best water monitoring systems</Link>.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/why-leak-detection-not-enough-commercial"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Why Leak Detection Alone Isn't Enough</p>
              <p className="mt-1 text-[14px] text-gray-500">Most issues in large buildings develop gradually — and don't trigger alerts.</p>
            </Link>
            <Link
              to="/articles/how-property-managers-handle-water-issues"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">How Property Managers Handle Water Issues</p>
              <p className="mt-1 text-[14px] text-gray-500">People, processes, and constraints — the real workflow.</p>
            </Link>
            <Link
              to="/best-water-monitoring-systems"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Best Water Monitoring Systems for Buildings</p>
              <p className="mt-1 text-[14px] text-gray-500">Compare the top systems across categories and building types.</p>
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
