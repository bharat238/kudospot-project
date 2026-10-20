import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
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

const pageDescriptions: Record<string, string> = {
  "/dashboard": "Your customer stories at a glance",
  "/testimonials": "Collect, review and approve customer stories",
  "/collect": "Forms and links to request customer feedback",
  "/widgets": "Show approved testimonials on your website",
  "/case-studies": "Turn customer wins into shareable stories",
  "/social-posts": "Prepare social content from approved stories",
  "/analytics": "Understand collection and showcase activity",
  "/settings": "Workspace, brand and plan preferences",
  "/upgrade": "Plan and feature capacity",
};

const Logo = ({ compact = false }: { compact?: boolean }) => (
  <div className={compact ? "flex items-center justify-center" : "flex items-center gap-2.5"}>
    <img src="/kudospot-icon.svg" alt="" className="h-8 w-8 shrink-0" />
    {!compact && <span className="text-lg font-semibold tracking-tight text-[#17191d]">KudoSpot</span>}
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
      <div className="border-b border-[#eceef0] px-5 py-5">
        <Link to="/dashboard" onClick={onNavigate} aria-label="KudoSpot dashboard" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Logo />
        </Link>
      </div>
      <div className="px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#858992]">Workspace</div>
      <nav aria-label="Application navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " + (isActive ? "bg-[#eaffae] text-[#222916]" : "text-[#686d77] hover:bg-[#f3f4f6] hover:text-[#24262b]")}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-[#eceef0] p-3">
        <NavLink to="/upgrade" onClick={onNavigate} className={({ isActive }) => "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors " + (isActive ? "border-[#d8f48b] bg-[#f5ffd9] text-[#29321a]" : "border-[#e8eaed] bg-white text-[#282a30] hover:bg-[#f8f9fa]")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaffae] text-[#29321a]"><Zap className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block">Upgrade plan</span><span className="mt-0.5 block text-[10px] font-medium text-[#7c818a]">Unlock more capacity</span></span>
        </NavLink>
        <div className="flex items-center gap-3 rounded-xl px-2 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f1f3] text-xs font-semibold text-[#343740]">{(user?.email?.[0] || "K").toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#292b31]">Your account</div>
            <div className="truncate text-[11px] text-[#777c85]">{user?.email || "Signed in"}</div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={doSignOut} className="h-8 w-8 text-[#777c85] hover:text-[#292b31]">
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
    <aside aria-label="Quick navigation" className="hidden w-[68px] shrink-0 flex-col items-center border-r border-[#e8eaee] bg-[#fdfdfc] py-4 md:flex">
      <Link to="/dashboard" aria-label="KudoSpot home" className="mb-7 flex h-9 w-9 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Logo compact />
      </Link>
      <nav aria-label="Application navigation" className="flex w-full flex-1 flex-col items-center gap-2 px-2">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} title={item.label} aria-label={item.label}
            className={({ isActive }) => "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " + (isActive ? "bg-[#202126] text-white shadow-sm" : "text-[#777c85] hover:bg-[#f0f1f3] hover:text-[#292b31]")}>
            <item.icon className="h-[18px] w-[18px]" />
            <span className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-lg bg-[#202126] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block group-focus-visible:block">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 flex flex-col items-center gap-2">
        <Link to="/upgrade" title="Upgrade plan" aria-label="Upgrade plan" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#3c481e] transition-colors hover:bg-[#eaffae]"><Zap className="h-[18px] w-[18px]" /></Link>
        <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={doSignOut} className="h-10 w-10 rounded-xl text-[#777c85] hover:bg-[#f0f1f3] hover:text-[#292b31]"><LogOut className="h-[18px] w-[18px]" /></Button>
      </div>
    </aside>
  );
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const page = nav.find((item) => item.to === location.pathname || (item.to !== "/dashboard" && location.pathname.startsWith(item.to)));
  const pageLabel = location.pathname === "/upgrade" ? "Upgrade plan" : page?.label || "Workspace";
  const description = pageDescriptions[location.pathname] || "Manage your customer proof with KudoSpot";

  return (
    <div className="min-h-screen bg-[#eaebef] p-2 text-[#202126] sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-16px)] max-w-[1680px] grid-cols-1 overflow-hidden rounded-[26px] border border-[#dfe1e6] bg-[#fbfbfa] shadow-[0_8px_36px_rgba(25,27,34,0.055)] sm:min-h-[calc(100vh-32px)] md:grid-cols-[68px_minmax(0,1fr)] lg:min-h-[calc(100vh-48px)]">
        <IconRail />
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-[#eaebef] bg-[#fbfbfa]/95 px-3 backdrop-blur-xl sm:px-5 lg:px-7">
            <div className="flex min-h-[68px] items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Link to="/dashboard" aria-label="KudoSpot dashboard" className="md:hidden"><Logo /></Link>
                <div className="hidden min-w-0 md:block">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#878b94]">
                    <span>Workspace</span><span aria-hidden="true">/</span><span className="truncate text-[#4d515a]">{pageLabel}</span>
                  </div>
                  <p className="mt-1 hidden truncate text-xs text-[#858992] sm:block">{description}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link to="/help" title="Help & FAQ" aria-label="Help and FAQ" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e9ed] bg-white text-[#777c85] transition-colors hover:bg-[#f3f4f6] hover:text-[#292b31]"><LifeBuoy className="h-4 w-4" /></Link>
                <div className="flex max-w-[190px] items-center gap-2 rounded-full border border-[#e7e9ed] bg-white py-1.5 pl-1.5 pr-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaffae] text-[11px] font-semibold text-[#303a1b]">{(user?.email?.[0] || "K").toUpperCase()}</span>
                  <span className="hidden min-w-0 truncate text-xs font-medium text-[#343740] sm:block">{user?.email || "Workspace account"}</span>
                  <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-[#8ebc36] sm:block" aria-label="Account loaded" />
                </div>
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open application menu" className="h-9 w-9 rounded-full border-[#e7e9ed] bg-white md:hidden"><Menu className="h-4 w-4" /></Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[290px] p-0"><SidebarContent onNavigate={() => setMobileOpen(false)} /></SheetContent>
                </Sheet>
              </div>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-3 pb-8 pt-5 sm:px-5 lg:px-7 lg:pt-7">
            <div className="mx-auto w-full max-w-[1480px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};
