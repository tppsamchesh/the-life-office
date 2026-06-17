import { Sidebar } from "./_components/Sidebar";

export default function DashboardAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F7F5F2] text-[#1F1F1F]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
