'use client'

import { useRef } from 'react'

type SearchFormProps = {
  initialQuery: string
}

export function SearchForm({ initialQuery }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form action="/search" method="get" className="mb-8">
      <label htmlFor="search-input" className="sr-only">
        Search the budget
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="search-input"
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder="Search departments, strategic areas, glossary terms..."
          autoFocus
          className="w-full rounded-lg border border-border bg-white px-4 py-3 pr-12 text-base text-text-primary placeholder:text-text-muted focus:border-mdc-blue focus:outline-none focus:ring-2 focus:ring-mdc-blue/20"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-text-muted hover:text-mdc-blue"
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </form>
  )
}
