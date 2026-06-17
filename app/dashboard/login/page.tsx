import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F7F5F2] text-[#1F1F1F] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl mb-1">The Life Office</h1>
        <p className="text-sm text-[#8A857B] mb-8">Back office sign in</p>

        <form action={signIn} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              className="border border-[#D8D2C8] rounded-md px-3 py-2 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              name="password"
              required
              className="border border-[#D8D2C8] rounded-md px-3 py-2 bg-white"
            />
          </label>

          {error ? (
            <p className="text-sm text-[#C0392B]">{error}</p>
          ) : null}

          <button
            type="submit"
            className="mt-2 bg-[#A8B2A1] text-[#1F1F1F] font-medium rounded-md px-4 py-2.5 hover:bg-[#96a08f] transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
