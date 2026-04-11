import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

type ArticleRelatedReadingProps = {
  /** e.g. `whatIsWaterMonitoring.related` */
  translationBase: string
  paths: readonly string[]
}

export function ArticleRelatedReading({ translationBase, paths }: ArticleRelatedReadingProps) {
  const { t } = useTranslation('articles')

  return (
    <div className="mt-12 border-t border-gray-100 pt-8">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">
        {t('shared.relatedReading')}
      </p>
      <div className="mt-3 space-y-3">
        {paths.map((path, i) => (
          <Link
            key={path}
            to={path}
            className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
          >
            <p className="text-[17px] font-semibold text-gray-900">
              {t(`${translationBase}.cards.${i}.title`)}
            </p>
            <p className="mt-1 text-[14px] text-gray-500">
              {t(`${translationBase}.cards.${i}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
