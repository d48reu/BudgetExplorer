'use server'

import { requireStaffSession } from '@/lib/staff-auth'
import { answerBudgetQuestion } from '@/lib/budget-answer'
import type { BudgetAnswer } from '@/lib/budget-answer-types'

export type AskBudgetState = {
  question: string
  answer: BudgetAnswer | null
  error: string | null
}

export async function askBudgetAction(
  _state: AskBudgetState,
  formData: FormData
): Promise<AskBudgetState> {
  await requireStaffSession()
  const rawQuestion = formData.get('question')
  const question = typeof rawQuestion === 'string' ? rawQuestion.trim().slice(0, 500) : ''
  if (question.length < 4) {
    return { question, answer: null, error: 'Ask a complete budget question.' }
  }

  try {
    return {
      question,
      answer: await answerBudgetQuestion(question),
      error: null,
    }
  } catch (error) {
    console.error('Staff budget question failed.', error)
    return {
      question,
      answer: null,
      error: 'The source check could not be completed. No answer was generated.',
    }
  }
}
