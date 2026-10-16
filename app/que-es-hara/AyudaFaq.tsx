'use client'

// FAQ of the Ayuda page: category chips and an accordion with one question open at a time.

import { useState, type ReactNode } from 'react'

export interface FaqItem {
  title: string
  /** Plain answer, one entry per paragraph. */
  paragraphs?: readonly string[]
  /** Rich answer (text with links); shown instead of `paragraphs`. */
  content?: ReactNode
}

export interface FaqGroup {
  id: string
  label: string
  /** One line shown under the chips while this category is chosen. */
  intro: string
  items: readonly FaqItem[]
}

export function AyudaFaq({ groups }: { groups: readonly FaqGroup[] }) {
  const [groupId, setGroupId] = useState(groups[0]?.id)
  const [openTitle, setOpenTitle] = useState<string | null>(null)
  const group = groups.find((g) => g.id === groupId) ?? groups[0]
  if (!group) return null

  function chooseGroup(id: string) {
    setGroupId(id)
    setOpenTitle(null)
  }

  return (
    <div>
      <div className="-mx-5 flex gap-[7px] overflow-x-auto px-5">
        {groups.map((g) => {
          const active = g.id === group.id
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={active}
              onClick={() => chooseGroup(g.id)}
              className={`font-almanac flex-none rounded-full border-[1.5px] px-[15px] py-2 text-[13px] font-medium transition-colors ${
                active ? 'border-brand-dark bg-brand-dark text-gray-50' : 'border-outline bg-gray-50 text-foreground'
              }`}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      <span className="font-almanac mt-3.5 block text-sm leading-normal text-gray-700">{group.intro}</span>

      <div className="mt-3 border-t border-outline">
        {group.items.map((item) => {
          const open = openTitle === item.title
          const answerId = `faq-${group.id}-${group.items.indexOf(item)}`
          return (
            <div key={item.title} className="border-b border-outline">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={answerId}
                onClick={() => setOpenTitle(open ? null : item.title)}
                className="flex w-full items-start gap-3.5 py-[17px] text-left"
              >
                <span className="font-almanac-serif flex-1 text-[21px] leading-[1.2] text-foreground">{item.title}</span>
                <span aria-hidden="true" className="font-almanac w-[18px] flex-none text-center text-2xl font-light leading-none text-brand">
                  {open ? '−' : '+'}
                </span>
              </button>
              {open && (
                <div id={answerId} role="region" className="font-almanac pb-[18px] pr-8 text-[15px] leading-[1.65] text-gray-800">
                  {item.content ??
                    item.paragraphs?.map((p) => (
                      <span key={p} className="mt-3 block first:mt-0">{p}</span>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
