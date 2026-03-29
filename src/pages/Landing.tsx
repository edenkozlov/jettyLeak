import { useEffect, useState } from 'react'

import ScrollToTopButton from '@/components/ScrollToTopButton'
import {
  InterestSection,
  LandingBuildingHealthSection,
  LandingClientShowcaseSection,
  LandingDashboardSection,
  LandingFeaturesSection,
  LandingFooter,
  LandingHero,
  LandingHowItWorksSection,
  LandingNav,
  LandingPillarsModal,
  LandingProductSection,
  LandingSensorSection,
  SectionWave,
} from '@/components/landing'
import {
  LANDING_SHOWCASE_BUILDINGS,
  SHOWCASE_MIN_VISIBLE,
  SHOWCASE_VIEW_ALL_AFTER,
} from '@/data/landingShowcaseBuildings'

/** Set `true` to show the “On site” / Buildings running Beluga block + cards on the landing page. */
const SHOW_LANDING_BUILDING_SHOWCASE = false

export default function Landing() {
  const [pillarsModalOpen, setPillarsModalOpen] = useState(false)

  const showcaseBuildings = LANDING_SHOWCASE_BUILDINGS
  const showClientShowcase =
    SHOW_LANDING_BUILDING_SHOWCASE && showcaseBuildings.length >= SHOWCASE_MIN_VISIBLE
  const showcaseOnLanding = showcaseBuildings.slice(0, SHOWCASE_VIEW_ALL_AFTER)
  const showViewAllBuildings = showcaseBuildings.length > SHOWCASE_VIEW_ALL_AFTER

  useEffect(() => {
    if (!pillarsModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPillarsModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [pillarsModalOpen])

  return (
    <div className="min-h-screen overflow-x-hidden antialiased">
      <LandingNav />

      <LandingHero />

      <LandingProductSection />

      <SectionWave variant="to-dark" />

      <LandingFeaturesSection />

      <SectionWave variant="to-light" />

      <LandingDashboardSection />

      <LandingBuildingHealthSection
        pillarsModalOpen={pillarsModalOpen}
        onOpenPillars={() => setPillarsModalOpen(true)}
      />

      <LandingSensorSection />

      {showClientShowcase ? (
        <LandingClientShowcaseSection
          buildings={showcaseOnLanding}
          showViewAll={showViewAllBuildings}
        />
      ) : null}

      <SectionWave variant="to-dark" />

      <LandingHowItWorksSection />

      <SectionWave variant="to-light" />

      <InterestSection />

      <LandingFooter />

      <LandingPillarsModal open={pillarsModalOpen} onClose={() => setPillarsModalOpen(false)} />

      <ScrollToTopButton />
    </div>
  )
}
