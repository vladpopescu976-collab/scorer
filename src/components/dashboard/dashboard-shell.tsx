"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Settings2,
  Star,
  LogOut,
  ArrowLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SemnScorer } from "@/components/semn-scorer";

const NAV = [
  { href: "/dashboard/business", label: "Privire de ansamblu", icon: LayoutDashboard },
  { href: "/dashboard/business/orar", label: "Calendar & Orar", icon: CalendarDays },
  { href: "/dashboard/business/rezervari", label: "Rezervări", icon: ClipboardList, key: "bookings" },
  { href: "/dashboard/business/recenzii", label: "Recenzii", icon: Star },
  { href: "/dashboard/business/terenuri", label: "Setări terenuri", icon: Settings2 },
];

export function DashboardShell({
  children,
  userName,
  pendingCount,
}: {
  children: React.ReactNode;
  userName: string;
  pendingCount: number;
}) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#F4F5F1]">
      {/* Meniul lateral: verdele brandului, ca banda din aplicație. */}
      <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col overflow-hidden bg-[radial-gradient(140%_80%_at_0%_0%,#17543A_0%,#0B2A1C_45%,#07160F_100%)] text-[#F3EFE6] md:flex">
        <div aria-hidden className="pointer-events-none absolute -left-16 top-1/3 h-64 w-64 rounded-full bg-[#7BD389]/[0.07] blur-3xl" />
        <div className="relative flex h-20 items-center gap-3 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#0E6B3A] to-[#2FA560] text-white shadow-[0_8px_20px_-8px_rgba(47,165,96,0.8)] ring-1 ring-white/15">
            <SemnScorer className="h-[23px] w-[23px]" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold tracking-tight">Scorer</p>
            <p className="truncate font-display text-[13px] italic text-[#F3EFE6]/55">Panou Business</p>
          </div>
        </div>

        <nav className="relative flex-1 space-y-1 px-3 py-3">
          {NAV.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const showBadge = item.key === "bookings" && pendingCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
                  isActive ? "bg-white/[0.09] text-[#F3EFE6] ring-1 ring-inset ring-white/10" : "text-[#F3EFE6]/60 hover:bg-white/[0.05] hover:text-[#F3EFE6]"
                )}
              >
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#7BD389]" />}
                <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-[#7BD389]")} strokeWidth={2} />
                <span className="truncate">{item.label}</span>
                {showBadge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-[#3a2600]">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="relative space-y-2 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-[#F3EFE6]/60 transition-colors hover:bg-white/[0.05] hover:text-[#F3EFE6]"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
            Înapoi pe site
          </Link>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-inset ring-white/10">
            <Avatar className="h-9 w-9 ring-2 ring-[#7BD389]/50">
              <AvatarFallback className="bg-[#7BD389]/20 text-[12px] font-semibold text-[#7BD389]">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold">{userName}</p>
              <p className="truncate text-[11.5px] text-[#F3EFE6]/55">Cont Business</p>
            </div>
            <button
              type="button"
              title="Deconectare"
              aria-label="Deconectare"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg p-1.5 text-[#F3EFE6]/55 transition-colors hover:bg-white/10 hover:text-[#F3EFE6]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-28 md:pb-0">
        {/* @container: banda verde din capul paginii (AntetPanou) se întinde pe
            toată lățimea lui main, ca pe restul site-ului și în aplicație. */}
        <main className="@container flex-1">
          <div className="mx-auto max-w-[76rem] px-4 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-8">{children}</div>
        </main>
      </div>

      {/* Telefon: bara de jos ca o pastilă plutitoare, ca tab-bar-ul din aplicație. */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex rounded-full border border-black/[0.06] bg-white/90 p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl md:hidden">
        {NAV.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const showBadge = item.key === "bookings" && pendingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10.5px] font-medium transition-colors",
                isActive ? "bg-[#0E6B3A]/10 text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {item.label.split(" ")[0]}
              {showBadge && <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
