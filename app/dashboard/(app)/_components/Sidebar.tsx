import { NavLinks } from "./NavLinks";

// Desktop-only left rail; below md the MobileNav drawer takes over.
export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-sidebar md:flex">
      <div className="px-5 py-6">
        <span className="font-serif text-lg tracking-wide text-sidebar-ink">The Life Office</span>
      </div>
      <NavLinks />
    </aside>
  );
}
