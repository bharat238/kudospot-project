import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquareQuote, LogOut, Settings, Inbox, LayoutGrid,
  FileText, Share2, BarChart3, Menu, Zap, Layers3
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

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <img src="/kudospot-icon.svg" alt="" className="h-8 w-8 shrink-0" />
    <span className="text-lg font-semibold tracking-tight text-foreground">KudoSpot</span>
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
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border/70 px-5 py-5">
        <NavLink to="/dashboard" onClick={onNavigate} aria-label="KudoSpot dashboard" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Logo />
        </NavLink>
      </div>

      <div className="px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</div>
      <nav aria-label="Application navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border/70 p-3">
        <NavLink to="/upgrade" onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${isActive ? "border-orange-200 bg-orange-50 text-orange-900" : "border-orange-100 bg-orange-50/70 text-orange-900 hover:bg-orange-100"}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-orange-800 shadow-sm"><Zap className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block">Upgrade plan</span><span className="mt-0.5 block text-[10px] font-medium text-orange-800/70">Unlock more capacity</span></span>
        </NavLink>
        <div className="flex items-center gap-3 rounded-xl px-2 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{(user?.email?.[0] || "K").toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground">Your account</div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.email || "Signed in"}</div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={doSignOut} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const page = nav.find((item) => location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to)));

  return (
    <div className="min-h-screen bg-[#f4f4f3] text-foreground dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] border-r border-border/70 bg-card md:flex md:flex-col">
        <SidebarContent />
      </aside>

      <div className="min-w-0 md:ml-[236px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur-xl">
          <div className="flex h-[62px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="md:hidden"><Logo /></div>
              <div className="hidden items-center gap-2 text-sm md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Layers3 className="h-4 w-4" /></span>
                <div>
                  <div className="font-semibold leading-4 text-foreground">Workspace</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{page?.label || "Manage your customer proof"}</div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden max-w-[260px] items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-2 sm:flex">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">{(user?.email?.[0] || "K").toUpperCase()}</div>
                <span className="max-w-[190px] truncate text-xs font-medium text-foreground">{user?.email || "Workspace account"}</span>
              </div>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open application menu" className="h-9 w-9 md:hidden"><Menu className="h-4 w-4" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0"><SidebarContent onNavigate={() => setMobileOpen(false)} /></SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="min-w-0 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-[1520px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
