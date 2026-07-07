import { NavLinks } from "./NavLinks";

// Desktop-only left rail; below md the MobileNav drawer takes over.
export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-edge bg-inset md:flex">
      <div className="px-5 py-6">
        <span className="font-serif text-lg tracking-wide">The Life Office</span>
      </div>
      <NavLinks />
    </aside>
  );
}
