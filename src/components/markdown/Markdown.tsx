'use client'


import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { Components } from 'react-markdown'
import styles from './Markdown.module.css'

const ALLOWED = new Set(['http:', 'https:', 'mailto:'])


function urlTransform(url: string): string {
  const t = url.trim()
  
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) return url
  const proto = t.slice(0, t.indexOf(':') + 1).toLowerCase()
  return ALLOWED.has(proto) ? url : ''
}

const components: Components = {
  
  
  a: ({ node, children, href, ...rest }) => (
    <a
      href={href}
      {...(href && /^https?:\/\//i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  ),
}

export function Markdown({ children, chat = false }: { children: string; chat?: boolean }) {
  return (
    <div className={chat ? `${styles.md} ${styles.chat}` : styles.md}>
      <ReactMarkdown
        remarkPlugins={chat ? [remarkGfm, remarkBreaks] : [remarkGfm]}
        urlTransform={urlTransform}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
