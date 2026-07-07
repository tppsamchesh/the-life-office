import { Button, FormError, Input } from "../(app)/_components/ui";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-canvas text-ink flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl mb-1">The Life Office</h1>
        <p className="text-sm text-muted mb-8">Back office sign in</p>

        <form action={signIn} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <Input type="email" name="email" required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <Input type="password" name="password" required />
          </label>

          <FormError message={error} />

          <Button type="submit" variant="primary" pendingLabel="Signing in…" className="mt-2">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
