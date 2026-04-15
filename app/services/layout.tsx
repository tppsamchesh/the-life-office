import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services — The Life Office",
  description:
    "Premium life and business support for founders, executives and families. Personal affairs, professional support, occasions and life structure — handled completely.",
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
