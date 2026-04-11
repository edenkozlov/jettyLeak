import { useEffect } from 'react'

export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', description)
    } else {
      const el = document.createElement('meta')
      el.name = 'description'
      el.content = description
      document.head.appendChild(el)
    }
  }, [title, description])
}
