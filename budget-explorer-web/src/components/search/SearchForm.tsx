'use client'

import { useRef } from 'react'

type SearchFormProps = {
  initialQuery: string
}

export function SearchForm({ initialQuery }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form action="/search" method="get" className="mb-10">
      <label htmlFor="search-input" className="sr-only">
        Search the budget
      </label>
      <div className="relative border-y-2 border-text-primary bg-white/55">
        <input
          ref={inputRef}
          id="search-input"
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder="Department, strategic area, or budget term"
          className="w-full bg-transparent px-4 py-4 pr-16 text-base text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex w-14 items-center justify-center border-l border-text-primary bg-text-primary text-white transition-colors hover:bg-mdc-blue"
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
