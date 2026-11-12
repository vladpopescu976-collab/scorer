"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { CalendarCheck, Heart, LayoutDashboard, LogOut, Menu, Settings, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarCont } from "@/components/cont/poza-profil";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SemnScorer } from "@/components/semn-scorer";

const roleLabel: Record<string, string> = {
  PERSONAL: "Cont Personal",
  BUSINESS: "Cont Business",
};

const baseNavLinks = [
  { href: "/cauta-terenuri", label: "Terenuri" },
  { href: "/gaseste-meci", label: "Găsește meci" },
  { href: "/#cum-functioneaza", label: "Cum funcționează" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });


  const isBusiness = session?.user?.role === "BUSINESS";
  const accountHref = isBusiness ? "/dashboard/business" : "/rezervarile-mele";
  const accountLabel = isBusiness ? "Panou Business" : "Rezervările mele";
  const AccountIcon = isBusiness ? LayoutDashboard : CalendarCheck;

  // Badge cu rezervările care îi cer clientului un răspuns (mutare propusă).
  const [fetchedActionNeeded, setFetchedActionNeeded] = useState(0);
  const isPersonal = session?.user?.role === "PERSONAL";
  const actionNeeded = isPersonal ? fetchedActionNeeded : 0;

  // Favoritele au sens doar pentru jucători, deci linkul apare doar la ei;
  // „Pentru proprietari” doar pentru cine nu are încă un cont.
  const navLinks = isPersonal
    ? [...baseNavLinks, { href: "/favorite", label: "Favorite" }]
    : !session?.user && status !== "loading"
      ? [...baseNavLinks, { href: "/autentificare?tip=business", label: "Pentru proprietari" }]
      : baseNavLinks;

  // Pe prima pagină, sus, bara stă transparent peste partea verde și face
  // corp comun cu ea; la derulare devine albă, ca pe celelalte pagini.
  const peHero = pathname === "/" && !scrolled && !mobileOpen;

  useEffect(() => {
    if (!isPersonal) return;
    let cancelled = false;
    fetch("/api/rezervari/sumar")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setFetchedActionNeeded(data.actionNeeded ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isPersonal, pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-[background-color,border-color,color] duration-300",
        peHero
          ? "border-transparent bg-transparent text-white"
          : "border-black/[0.06] bg-background/85 text-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 dark:border-white/10"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[10px] text-white transition-colors duration-300",
              peHero
                ? "bg-white/10 ring-1 ring-inset ring-white/20"
                : "bg-gradient-to-br from-[#0E6B3A] to-[#2FA560] shadow-sm shadow-[#0E6B3A]/25"
            )}
          >
            <SemnScorer className="h-[21px] w-[21px]" />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Scorer</span>
        </Link>

        <nav className="hidden items-center gap-0.5 text-[14px] font-medium md:flex">
          {navLinks.map((link) => {
            const activ = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-3.5 py-2 transition-colors",
                  peHero
                    ? activ ? "text-white" : "text-white/70 hover:text-white"
                    : activ ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {activ && (
                  <motion.span
                    layoutId="navbar-active-pill"
                    className={cn("absolute inset-0 -z-10 rounded-full", peHero ? "bg-white/10" : "bg-muted")}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {status === "loading" ? (
            <Skeleton className="h-9 w-24 rounded-full" />
          ) : session?.user ? (
            <>
              <motion.div whileTap={{ scale: 0.96 }} className="relative">
                <Link
                  href={accountHref}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors",
                    peHero
                      ? "bg-white text-[#0B3D24] hover:bg-white/90"
                      : "bg-[#0E6B3A] text-white shadow-sm shadow-[#0E6B3A]/25 hover:bg-[#0B5A30]"
                  )}
                >
                  <AccountIcon className="h-4 w-4" />
                  {accountLabel}
                </Link>
                {actionNeeded > 0 && (
                  <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white ring-2 ring-background">
                    {actionNeeded}
                  </span>
                )}
              </motion.div>

              <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center gap-2 rounded-full px-2",
                      peHero && "text-white hover:bg-white/10 hover:text-white aria-expanded:bg-white/10"
                    )}
                  />
                }
              >
                <AvatarCont
                  nume={session.user.name}
                  poza={session.user.image}
                  className={cn("h-8 w-8 ring-2", peHero ? "ring-white/30" : "ring-background")}
                  textClassName="text-xs"
                />
                <span className="text-sm font-medium">{session.user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-1">
                    <span className="font-medium">{session.user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {session.user.email}
                    </span>
                    <Badge variant="secondary" className="mt-1 w-fit">
                      {roleLabel[session.user.role] ?? session.user.role}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href={accountHref} />}>
                    <AccountIcon className="h-4 w-4" />
                    {accountLabel}
                  </DropdownMenuItem>
                  {!isBusiness && (
                    <DropdownMenuItem render={<Link href="/favorite" />}>
                      <Heart className="h-4 w-4" />
                      Terenuri favorite
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem render={<Link href="/contul-meu" />}>
                    <Settings className="h-4 w-4" />
                    Setările contului
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="h-4 w-4" />
                    Deconectare
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                href="/autentificare"
                className={cn(
                  "rounded-full px-3 py-2 text-[14px] font-medium transition-colors",
                  peHero ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Autentificare
              </Link>
              <Link
                href="/autentificare?tip=personal&mod=inregistrare"
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-[14px] font-medium transition-colors",
                  peHero
                    ? "bg-white text-[#0B3D24] hover:bg-white/90"
                    : "bg-[#0E6B3A] text-white shadow-sm shadow-[#0E6B3A]/25 hover:bg-[#0B5A30]"
                )}
              >
                Creează cont
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          {session?.user && (
            <Link
              href={accountHref}
              aria-label={accountLabel}
              title={accountLabel}
              className={cn(
                "relative inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                peHero
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : pathname === accountHref
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/15"
              )}
            >
              <AccountIcon className="h-4 w-4 shrink-0" />
              <span>{isBusiness ? "Panou" : "Rezervări"}</span>
              {actionNeeded > 0 && (
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ring-2 ring-background">
                  {actionNeeded}
                </span>
              )}
            </Link>
          )}

          {isPersonal && (
            <Link
              href="/favorite"
              aria-label="Terenuri favorite"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                pathname === "/favorite"
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                  : peHero
                    ? "text-white/80 hover:text-white"
                    : "text-muted-foreground hover:text-rose-600"
              )}
            >
              <Heart className={cn("h-5 w-5", pathname === "/favorite" && "fill-current")} />
            </Link>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? "Închide meniul" : "Deschide meniul"}
            onClick={() => setMobileOpen((open) => !open)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              peHero ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
            )}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
            className="overflow-hidden border-t bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-2 flex flex-col gap-2 border-t pt-3">
                {status === "loading" ? (
                  <Skeleton className="h-9 w-full rounded-full" />
                ) : session?.user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                      <AvatarCont nume={session.user.name} poza={session.user.image} className="h-9 w-9" textClassName="text-xs" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{session.user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {roleLabel[session.user.role] ?? session.user.role}
                        </span>
                      </div>
                    </div>
                    <Button
                      nativeButton={false}
                      render={<Link href={accountHref} onClick={() => setMobileOpen(false)} />}
                    >
                      <AccountIcon className="h-4 w-4" />
                      {accountLabel}
                      {actionNeeded > 0 && (
                        <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1 text-[11px] font-bold">
                          {actionNeeded}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href="/contul-meu" onClick={() => setMobileOpen(false)} />}
                    >
                      <Settings className="h-4 w-4" />
                      Setările contului
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Deconectare
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href="/autentificare" onClick={() => setMobileOpen(false)} />}
                    >
                      Autentificare
                    </Button>
                    <Button
                      className="rounded-full"
                      nativeButton={false}
                      render={
                        <Link
                          href="/autentificare?tip=personal&mod=inregistrare"
                          onClick={() => setMobileOpen(false)}
                        />
                      }
                    >
                      Creează cont
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
