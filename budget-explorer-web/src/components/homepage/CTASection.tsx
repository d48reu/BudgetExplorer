import { Button } from '@/components/ui/Button'

export function CTASection() {
  return (
    <section
      aria-label="Calls to action"
      className="flex flex-col sm:flex-row gap-4 justify-center items-center py-8 px-4"
    >
      <Button variant="primary" href="/explorer">
        Explore the Budget
      </Button>
      <Button variant="secondary" href="/calculator">
        Calculate Your Taxes
      </Button>
    </section>
  )
}
