import { useState, type ReactNode } from 'react'

export default function CollapsibleSection({
  title,
  preview,
  children,
}: {
  title: string
  preview?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!everOpened) setEverOpened(true)
          setOpen((v) => !v)
        }}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </span>
        {!open && preview && (
          <span className="ml-auto truncate pl-4 text-xs tabular-nums text-gray-400 dark:text-gray-500">
            {preview}
          </span>
        )}
      </button>
      {everOpened && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            open
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-1">{children}</div>
          </div>
        </div>
      )}
    </div>
  )
}
