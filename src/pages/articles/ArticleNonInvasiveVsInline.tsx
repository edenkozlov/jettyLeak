import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  'Non-Invasive vs Inline Water Monitoring: Which One Makes Sense? — Beluga'
const META_DESCRIPTION =
  'Compare non-invasive and inline water monitoring systems. Learn the trade-offs in installation, accuracy, scalability, and when each approach makes sense.'

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleNonInvasiveVsInline() {
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
            Non-Invasive vs Inline Water Monitoring
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">Which one makes sense?</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            One of the biggest differences between water monitoring systems is how they are installed.
          </p>
          <p className={`${pCls} mt-4`}>Some require direct integration into plumbing infrastructure.</p>
          <p className={`${pCls} mt-4`}>Others operate without modifying pipes at all.</p>
          <p className={`${pCls} mt-4`}>
            This distinction — non-invasive vs inline — often has a bigger impact than the features themselves.
          </p>
          <p className={`${pCls} mt-4`}>
            It's one of the key factors covered in our breakdown of the <Link to="/articles/4-types-of-water-monitoring-systems" className={inlineLinkCls}>4 types of water monitoring systems</Link>.
          </p>
        </section>

        {/* Inline */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>What is inline water monitoring?</h2>
            <p className={`${pCls} mt-4`}>Inline systems are installed directly within the plumbing system.</p>
            <p className={`${pCls} mt-4`}>They typically:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Sit on the main water line</li>
              <li>Measure flow directly</li>
              <li>Require cutting into pipes</li>
            </ul>
            <p className={`${pCls} mt-4`}>These systems often provide:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Highly accurate flow measurements</li>
              <li>Real-time detection</li>
              <li>The ability to trigger shutoff mechanisms</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              Systems like <Link to="/flo-by-moen-alternative" className={inlineLinkCls}>Flo by Moen</Link> and <Link to="/phyn-alternative" className={inlineLinkCls}>Phyn</Link> are inline shutoff examples.
            </p>
            <p className={`${pCls} mt-4`}>However, they also require:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Professional installation</li>
              <li>Downtime during setup</li>
              <li>Modifications to existing infrastructure</li>
            </ul>
          </div>
        </section>

        {/* Non-invasive */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>What is non-invasive water monitoring?</h2>
            <p className={`${pCls} mt-4`}>Non-invasive systems monitor water without altering the plumbing.</p>
            <p className={`${pCls} mt-4`}>They:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Install externally</li>
              <li>Detect flow or system behavior indirectly</li>
              <li>Avoid pipe modifications</li>
            </ul>
            <p className={`${pCls} mt-4`}>This approach allows for:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Faster deployment</li>
              <li>Minimal disruption</li>
              <li>Easier installation in older buildings</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              The <Link to="/flume-alternative" className={inlineLinkCls}>Flume water monitor</Link> is one example of this approach.
            </p>
          </div>
        </section>

        {/* Key differences */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Key differences</h2>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">Inline</p>
                <p className="mt-2 text-[14px] font-semibold text-gray-900">Installation</p>
                <p className={`${pCls} mt-1`}>Requires pipe work</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
                <p className="text-[13px] font-semibold tracking-wide text-indigo-500 uppercase">Non-invasive</p>
                <p className="mt-2 text-[14px] font-semibold text-gray-900">Installation</p>
                <p className={`${pCls} mt-1`}>External installation</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">Deployment speed</p>
                <p className={`${pCls} mt-1`}>Slower, more involved</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">Deployment speed</p>
                <p className={`${pCls} mt-1`}>Faster, simpler</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">Flexibility</p>
                <p className={`${pCls} mt-1`}>Fixed once installed</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">Flexibility</p>
                <p className={`${pCls} mt-1`}>Easier to reposition or deploy across buildings</p>
              </div>
            </div>
          </div>
        </section>

        {/* Accuracy vs interpretation */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Accuracy vs interpretation</h2>
          <p className={`${pCls} mt-4`}>Inline systems measure flow directly.</p>
          <p className={`${pCls} mt-4`}>
            Non-invasive systems often rely on interpreting signals and patterns to understand behavior.
          </p>
          <p className={`${pCls} mt-4`}>Both approaches can be effective, but they operate differently.</p>
        </section>

        {/* When inline makes sense */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>When inline makes sense</h2>
            <p className={`${pCls} mt-4`}>Inline systems are often used when:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Direct control is required</li>
              <li>Shutoff capability is needed</li>
              <li>Installation is not a constraint</li>
            </ul>
            <p className={`${pCls} mt-4`}>They are common in:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Controlled environments</li>
              <li>New builds</li>
              <li>Systems designed with integration in mind</li>
            </ul>
          </div>
        </section>

        {/* When non-invasive makes sense */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>When non-invasive makes sense</h2>
            <p className={`${pCls} mt-4`}>Non-invasive systems are useful when:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Modifying infrastructure is difficult</li>
              <li>Buildings are older</li>
              <li>Rapid deployment is needed</li>
              <li>Scalability matters</li>
            </ul>
            <p className={`${pCls} mt-4`}>They are especially relevant in:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Multi-unit properties</li>
              <li>Commercial environments with constraints</li>
            </ul>
          </div>
        </section>

        {/* Why this decision matters */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Why this decision matters</h2>
          <p className={`${pCls} mt-4`}>Choosing between inline and non-invasive isn't just technical.</p>
          <p className={`${pCls} mt-4`}>It affects:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Installation cost</li>
            <li>Deployment speed</li>
            <li>Scalability across properties</li>
          </ul>
          <p className={`${pCls} mt-4`}>
            In many cases, this decision determines whether a system is practical at all.
          </p>
          <p className={`${pCls} mt-4`}>
            For commercial environments, see our guide to the <Link to="/articles/best-water-monitoring-commercial-buildings" className={inlineLinkCls}>best water monitoring systems for commercial buildings</Link>.
          </p>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Inline and non-invasive systems represent two fundamentally different approaches.
          </p>
          <p className={`${pCls} mt-3`}>
            Understanding the trade-offs between them is essential to choosing a system that fits both the building and the operational reality.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/best-water-monitoring-commercial-buildings"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Best Water Monitoring Systems for Commercial Buildings</p>
              <p className="mt-1 text-[14px] text-gray-500">A guide to the categories of systems available for commercial environments.</p>
            </Link>
            <Link
              to="/articles/what-is-water-monitoring-system"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">What Is a Water Monitoring System?</p>
              <p className="mt-1 text-[14px] text-gray-500">Understanding the basics before choosing a system.</p>
            </Link>
            <Link
              to="/best-water-monitoring-systems"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Best Water Monitoring Systems for Buildings</p>
              <p className="mt-1 text-[14px] text-gray-500">Compare the top systems side by side.</p>
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
