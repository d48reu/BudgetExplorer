'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { askBudgetAction, type AskBudgetState } from '@/app/staff/research-actions'
import { signOutAction } from '@/app/staff/actions'
import type { StaffSession } from '@/lib/staff-types'

const initialState: AskBudgetState = { question: '', answer: null, error: null }

const exampleQuestions = [
  'How does the proposed total compare with the adopted budget?',
  'Which departments have the largest operating increases?',
  'Why did the Law Library budget change?',
  'What changed at the first budget hearing?',
]

type IssueSummary = {
  slug: string
  title: string
  status: string
  priority: string
  decisionDate: string | null
  openTasks: number
  pendingClaims: number
}

function CitationMarks({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <span className="ml-1 inline-flex gap-1 align-super text-xs font-black text-blue-700">
      {ids.map((id) => <a key={id} href={`#source-${id}`} aria-label={`Source ${id}`} className="underline decoration-1 underline-offset-2">[{id}]</a>)}
    </span>
  )
}

export function StaffResearchDesk({
  session,
  issues,
  auditStatus,
}: {
  session: StaffSession
  issues: IssueSummary[]
  auditStatus: { checks: number; generatedAt: string }
}) {
  const [question, setQuestion] = useState('')
  const [state, action, pending] = useActionState(askBudgetAction, initialState)
  const answer = state.answer

  return (
    <div className="-mb-16 min-h-screen bg-[#E9EDF0] text-slate-950 md:-mt-16">
      <header className="border-b border-slate-700 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline gap-3">
            <p className="font-heading text-lg font-black">Budget Explorer</p>
            <span className="border-l border-slate-600 pl-3 text-sm font-bold uppercase tracking-[0.14em] text-sky-300">Staff research</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{session.name}</p>
            </div>
            <form action={signOutAction}>
              <button className="border border-slate-500 px-3 py-2 text-sm font-bold hover:border-white hover:bg-white hover:text-slate-950">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div className="min-w-0 space-y-6">
          <section className="border border-slate-950 bg-white">
            <div className="border-b border-slate-950 bg-[#DCEBFF] px-5 py-4 sm:px-7">
              <p className="text-sm font-black uppercase tracking-[0.13em] text-blue-900">Budget research desk</p>
            </div>
            <div className="p-5 sm:p-7">
              <h1 className="font-heading text-3xl font-black tracking-[-0.035em] sm:text-5xl">Ask the budget.</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Get an answer from audited County figures and approved source records. If the evidence is incomplete, the answer will say so.</p>
              <form action={action} className="mt-6">
                <label htmlFor="budget-question" className="sr-only">Budget question</label>
                <textarea
                  id="budget-question"
                  name="question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Example: Which departments are proposed to lose positions?"
                  rows={3}
                  required
                  className="w-full resize-y border-2 border-slate-950 bg-white p-4 text-lg leading-7 shadow-[5px_5px_0_#0f172a] outline-none focus:border-blue-700"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">Numbers come from the database; citations come from the audit ledger.</p>
                  <button type="submit" disabled={pending} className="bg-slate-950 px-6 py-3 text-base font-black text-white hover:bg-blue-800 disabled:cursor-wait disabled:bg-slate-500">
                    {pending ? 'Checking sources…' : 'Answer with sources'}
                  </button>
                </div>
              </form>
              {state.error && <p role="alert" className="mt-4 border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">{state.error}</p>}
              {!answer && (
                <div className="mt-7 border-t border-slate-300 pt-5">
                  <p className="text-sm font-black uppercase tracking-[0.1em] text-slate-500">Try a question</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {exampleQuestions.map((example) => (
                      <button key={example} type="button" onClick={() => setQuestion(example)} className="border border-slate-400 bg-slate-50 px-3 py-2 text-left text-sm font-semibold hover:border-blue-700 hover:bg-blue-50">
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {answer && (
            <article className="border border-slate-950 bg-white" aria-live="polite">
              <p className="border-b border-slate-400 bg-slate-100 px-5 py-3 text-sm text-slate-600 sm:px-6"><strong className="text-slate-900">Question:</strong> {state.question}</p>
              <div className={answer.status === 'answered' ? 'border-b border-slate-950 bg-emerald-950 p-5 text-white sm:p-6' : 'border-b border-slate-950 bg-amber-100 p-5 sm:p-6'}>
                <p className={answer.status === 'answered' ? 'text-sm font-black uppercase tracking-[0.12em] text-emerald-300' : 'text-sm font-black uppercase tracking-[0.12em] text-amber-900'}>{answer.eyebrow}</p>
                <h2 className="mt-2 font-heading text-2xl font-black tracking-[-0.02em] sm:text-3xl">{answer.title}</h2>
              </div>
              <div className="p-5 sm:p-6">
                {answer.claims.map((claim, index) => (
                  <p key={`${claim.text}-${index}`} className={`${index > 0 ? 'mt-3 ' : ''}max-w-4xl text-base leading-7 text-slate-700`}>{claim.text}<CitationMarks ids={claim.citationIds} /></p>
                ))}
                {answer.facts.length > 0 && (
                  <dl className="mt-6 grid border border-slate-950 sm:grid-cols-2">
                    {answer.facts.map((fact, index) => (
                      <div
                        key={`${fact.label}-${index}`}
                        className={`${index > 0 ? 'border-t border-slate-300 ' : ''}${index % 2 === 1 ? 'sm:border-l ' : ''}${index === 1 ? 'sm:border-t-0 ' : ''}p-4`}
                      >
                        <dt className="text-sm font-bold text-slate-600">{fact.label}</dt>
                        <dd className="mt-1 font-mono text-xl font-black tabular-nums">{fact.value}<CitationMarks ids={fact.citationIds} /></dd>
                        {fact.detail && <p className="mt-1 text-sm text-slate-600">{fact.detail}</p>}
                      </div>
                    ))}
                  </dl>
                )}
                {answer.calculations.length > 0 && (
                  <div className="mt-6 border-l-4 border-blue-700 bg-blue-50 px-4 py-3">
                    <p className="text-sm font-black uppercase tracking-[0.09em] text-blue-900">Math shown</p>
                    {answer.calculations.map((item) => <p key={item.label} className="mt-2 font-mono text-sm leading-6">{item.expression}<CitationMarks ids={item.citationIds} /></p>)}
                  </div>
                )}
                {answer.caveats.map((caveat) => <p key={caveat} className="mt-5 border-l-2 border-amber-600 pl-3 text-sm leading-6 text-slate-600">{caveat}</p>)}
                {answer.citations.length > 0 && (
                  <section className="mt-7 border-t border-slate-300 pt-5">
                    <h3 className="font-heading text-lg font-black">Sources</h3>
                    <ol className="mt-3 space-y-2">
                      {answer.citations.map((citation) => (
                        <li id={`source-${citation.id}`} key={citation.id} className="grid scroll-mt-5 gap-1 text-sm sm:grid-cols-[3rem_minmax(0,1fr)]">
                          <span className="font-mono font-bold text-blue-800">[{citation.id}]</span>
                          <span><a href={citation.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-800 underline underline-offset-4">{citation.label} ↗</a> <span className="text-slate-500">{citation.locator}</span></span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {answer.relatedHref && <Link href={answer.relatedHref} className="mt-6 inline-block text-sm font-black text-blue-800 underline underline-offset-4">{answer.relatedLabel} →</Link>}
              </div>
            </article>
          )}
        </div>

        <aside className="space-y-6">
          <section className="border border-slate-950 bg-slate-950 p-5 text-white">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300">Evidence status</p>
            <p className="mt-3 font-mono text-3xl font-black tabular-nums">{auditStatus.checks.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-300">audit checks passed with zero monetary variance</p>
            <p className="mt-5 border-t border-slate-700 pt-4 text-xs leading-5 text-slate-400">Ledger generated {new Date(auditStatus.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </section>

          <section className="border border-slate-950 bg-white">
            <div className="border-b border-slate-950 p-5">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-800">Saved work</p>
              <h2 className="mt-1 font-heading text-xl font-black">Issue briefs</h2>
            </div>
            {issues.map((issue) => (
              <Link key={issue.slug} href={`/staff/issues/${issue.slug}`} className="block border-b border-slate-300 p-5 last:border-b-0 hover:bg-blue-50">
                <p className="text-base font-black leading-6">{issue.title}</p>
                <p className="mt-2 text-sm text-slate-600">{issue.openTasks} open tasks · {issue.pendingClaims} pending claims</p>
                <p className="mt-3 text-sm font-bold text-blue-800">Open brief →</p>
              </Link>
            ))}
          </section>
        </aside>
      </main>
    </div>
  )
}
