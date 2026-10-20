import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquareQuote, LogOut, Settings, Inbox, LayoutGrid,
  FileText, Share2, BarChart3, Menu, Zap, LifeBuoy
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/testimonials", icon: MessageSquareQuote, label: "Testimonials" },
  { to: "/collect", icon: Inbox, label: "Collect feedback" },
  { to: "/widgets", icon: LayoutGrid, label: "Widgets" },
  { to: "/case-studies", icon: FileText, label: "Case studies" },
  { to: "/social-posts", icon: Share2, label: "Social posts" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const topNav = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/testimonials", label: "Activity" },
  { to: "/collect", label: "Collect" },
  { to: "/widgets", label: "Showcase" },
  { to: "/case-studies", label: "Stories" },
  { to: "/analytics", label: "Reports" },
];

const Logo = ({ compact = false }: { compact?: boolean }) => (
  <div className={compact ? "flex items-center justify-center" : "flex items-center gap-2.5"}>
    <img src="/kudospot-icon.svg" alt="" className="h-8 w-8 shrink-0" />
    {!compact && <span className="text-lg font-semibold tracking-tight text-foreground">KudoSpot</span>}
  </div>
);

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const doSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[#eceae6] px-5 py-5">
        <Link to="/dashboard" onClick={onNavigate} aria-label="KudoSpot dashboard" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Logo />
        </Link>
      </div>
      <div className="px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</div>
      <nav aria-label="Application navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
            className={({ isActive }) => "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " + (isActive ? "bg-[#fff0e9] text-[#a83a1c]" : "text-[#686762] hover:bg-[#f5f4f1] hover:text-[#252522]")}>
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-[#eceae6] p-3">
        <NavLink to="/upgrade" onClick={onNavigate} className={({ isActive }) => "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors " + (isActive ? "border-[#e9c9bb] bg-[#fff0e9] text-[#a83a1c]" : "border-[#e9e7e2] bg-white text-[#292824] hover:bg-[#f8f7f4]")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff0e9] text-[#a83a1c]"><Zap className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block">Upgrade plan</span><span className="mt-0.5 block text-[10px] font-medium text-[#77756f]">Unlock more capacity</span></span>
        </NavLink>
        <div className="flex items-center gap-3 rounded-xl px-2 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1f0ed] text-xs font-semibold text-[#34332f]">{(user?.email?.[0] || "K").toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#292824]">Your account</div>
            <div className="truncate text-[11px] text-[#77756f]">{user?.email || "Signed in"}</div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={doSignOut} className="h-8 w-8 text-[#77756f] hover:text-[#292824]">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const IconRail = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const doSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside aria-label="Quick navigation" className="hidden w-[58px] shrink-0 flex-col items-center border-r border-[#e9e7e2] bg-[#fbfaf8] py-4 md:flex">
      <Link to="/dashboard" aria-label="KudoSpot home" className="mb-7 flex h-9 w-9 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Logo compact />
      </Link>
      <nav aria-label="Quick links" className="flex w-full flex-1 flex-col items-center gap-2 px-2">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.label} aria-label={item.label}
            className={({ isActive }) => "group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " + (isActive ? "bg-[#242420] text-white shadow-sm" : "text-[#76746e] hover:bg-[#efeee9] hover:text-[#292824]")}>
            <item.icon className="h-[17px] w-[17px]" />
            <span className="pointer-events-none absolute left-11 z-50 hidden whitespace-nowrap rounded-lg bg-[#242420] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block group-focus-visible:block">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 flex flex-col items-center gap-2">
        <Link to="/help" title="Help & FAQ" aria-label="Help and FAQ" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#76746e] transition-colors hover:bg-[#efeee9] hover:text-[#292824]"><LifeBuoy className="h-[17px] w-[17px]" /></Link>
        <Link to="/upgrade" title="Upgrade plan" aria-label="Upgrade plan" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#a83a1c] transition-colors hover:bg-[#fff0e9]"><Zap className="h-[17px] w-[17px]" /></Link>
        <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={doSignOut} className="h-9 w-9 rounded-xl text-[#76746e] hover:bg-[#efeee9] hover:text-[#292824]"><LogOut className="h-[17px] w-[17px]" /></Button>
      </div>
    </aside>
  );
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#eae9e7] p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-16px)] max-w-[1680px] grid-cols-1 overflow-hidden rounded-[24px] border border-[#dedcd7] bg-[#f8f8f6] shadow-[0_8px_36px_rgba(25,24,20,0.05)] sm:min-h-[calc(100vh-32px)] md:grid-cols-[58px_minmax(0,1fr)] lg:min-h-[calc(100vh-48px)]">
        <IconRail />
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-[#e9e7e2] bg-[#f8f8f6]/95 px-3 backdrop-blur-xl sm:px-5 lg:px-7">
            <div className="flex min-h-[70px] items-center justify-between gap-3 py-3">
              <Link to="/dashboard" aria-label="KudoSpot dashboard" className="md:hidden"><Logo /></Link>
              <nav aria-label="Primary navigation" className="hidden min-w-0 max-w-full flex-1 items-center gap-0.5 overflow-x-auto rounded-full border border-[#e7e5e0] bg-white p-1 shadow-[0_1px_2px_rgba(25,24,20,0.035)] md:flex">
                {topNav.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end}
                    className={({ isActive }) => "whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors lg:px-4 " + (isActive ? "bg-[#242420] text-white shadow-sm" : "text-[#6b6963] hover:bg-[#f3f2ee] hover:text-[#252522]")}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="flex shrink-0 items-center gap-2">
                <Link to="/help" title="Help & FAQ" aria-label="Help and FAQ" className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#e7e5e0] bg-white text-[#6b6963] transition-colors hover:bg-[#f4f3ef] hover:text-[#252522] sm:flex"><LifeBuoy className="h-4 w-4" /></Link>
                <Link to="/settings" className="flex max-w-[190px] items-center gap-2 rounded-full border border-[#e7e5e0] bg-white py-1.5 pl-1.5 pr-3 transition-colors hover:bg-[#fbfaf8]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f1f0ed] text-[11px] font-semibold text-[#34332f]">{(user?.email?.[0] || "K").toUpperCase()}</span>
                  <span className="hidden min-w-0 truncate text-xs font-medium text-[#34332f] sm:block">{user?.email || "Workspace account"}</span>
                  <Settings className="h-3.5 w-3.5 shrink-0 text-[#85827b]" />
                </Link>
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open application menu" className="h-9 w-9 rounded-full border-[#e7e5e0] bg-white md:hidden"><Menu className="h-4 w-4" /></Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[290px] p-0"><SidebarContent onNavigate={() => setMobileOpen(false)} /></SheetContent>
                </Sheet>
              </div>
            </div>
            <nav aria-label="Primary navigation" className="flex gap-1 overflow-x-auto pb-3 md:hidden">
              {topNav.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end}
                  className={({ isActive }) => "whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors " + (isActive ? "bg-[#242420] text-white" : "border border-[#e7e5e0] bg-white text-[#6b6963] hover:bg-[#f3f2ee]")}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </header>
          <main className="min-w-0 flex-1 px-3 pb-8 pt-5 sm:px-5 lg:px-7 lg:pt-7">
            <div className="mx-auto w-full max-w-[1480px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};
