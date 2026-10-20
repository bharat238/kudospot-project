import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const primaryLinks = [
  { label: "Product", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Help", href: "/help" },
];

export const MarketingNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const homeHref = (hash: string) => location.pathname === "/" ? hash : `/${hash}`;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-card/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-[68px] items-center justify-between gap-4">
        <Link to="/" aria-label="KudoSpot home" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <img src="/kudospot-icon.svg" alt="" className="h-8 w-8" />
          <span className="text-xl font-semibold tracking-tight text-foreground">KudoSpot</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          {primaryLinks.map((item) => {
            const href = item.href.startsWith("/#")
              ? homeHref(item.href.slice(1))
              : item.href;
            const active = item.href === "/pricing" ? location.pathname === "/pricing" : item.href === "/help" ? location.pathname === "/help" : false;
            return (
              <a key={item.label} href={href} className={`text-sm transition-colors hover:text-foreground ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 md:flex">
          {user ? (
            <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
          ) : (
            <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
          )}
          <Link to={user ? "/dashboard" : "/signup"}>
            <Button size="sm" className="h-10 rounded-full px-5">
              {user ? "Open workspace" : "Get started free"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 md:hidden" aria-label="Open main navigation">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            <div className="flex items-center gap-2.5 border-b border-border/70 px-5 py-5">
              <img src="/kudospot-icon.svg" alt="" className="h-7 w-7" />
              <span className="text-lg font-semibold tracking-tight">KudoSpot</span>
            </div>
            <nav aria-label="Mobile navigation" className="space-y-1 px-3 py-4">
              {primaryLinks.map((item) => {
                const href = item.href.startsWith("/#") ? homeHref(item.href.slice(1)) : item.href;
                return (
                  <a key={item.label} href={href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <div className="space-y-2 border-t border-border/70 p-4">
              {user ? (
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}><Button variant="outline" className="w-full rounded-xl">Dashboard</Button></Link>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}><Button variant="outline" className="w-full rounded-xl">Log in</Button></Link>
              )}
              <Link to={user ? "/dashboard" : "/signup"} onClick={() => setMobileOpen(false)}><Button className="w-full rounded-xl">{user ? "Open workspace" : "Get started free"}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default MarketingNav;
