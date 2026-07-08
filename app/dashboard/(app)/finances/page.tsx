import { EmptyCard } from "../_components/ui";

export default function FinancesPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Finances</h1>
      <p className="text-sm text-muted mb-6">The money side of the desk.</p>
      <EmptyCard>
        Nothing to review here yet. Invoices, retainers and the monthly picture
        will appear once the finance cycle lands. Until then, nothing needs
        your eyes.
      </EmptyCard>
    </div>
  );
}
