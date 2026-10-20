import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageSquareQuote, LogOut, Settings, Inbox, LayoutGrid, FileText, Share2, BarChart3, Menu, Zap, Layers3 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/testimonials", icon: MessageSquareQuote, label: "Testimonials" },
  { to: "/collect", icon: Inbox, label: "Collection forms" },
  { to: "/widgets", icon: LayoutGrid, label: "Widgets" },
  { to: "/case-studies", icon: FileText, label: "Case studies" },
  { to: "/social-posts", icon: Share2, label: "Social posts" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const topNav = [
  { to: "/dashboard", label: "Overview" },
  { to: "/testimonials", label: "Testimonials" },
  { to: "/collect", label: "Collect" },
  { to: "/widgets", label: "Showcase" },
  { to: "/analytics", label: "Insights" },
];

const Logo = ({ compact = false }: { compact?: boolean }) => (
  <div className={`flex items-center ${compact ? "justify-center" : "gap-2.5"}`}>
    <img src="/kudospot-icon.svg" alt={compact ? "KudoSpot home" : ""} className="h-8 w-8 shrink-0" />
    {!compact && <span className="text-lg font-semibold tracking-tight text-foreground">KudoSpot</span>}
  </div>
);

const SidebarContent = ({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const doSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className={`border-b border-border/70 py-5 ${compact ? "flex justify-center px-2" : "px-5"}`}>
        <Logo compact={compact} />
      </div>
      <nav aria-label="Application navigation" className={`flex-1 space-y-1 overflow-y-auto py-4 ${compact ? "px-2" : "px-3"}`}>
        {nav.map((item) => {
          const itemLink = ({ isActive }: { isActive: boolean }) => `group flex items-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${compact ? "mx-auto h-11 w-11 justify-center" : "gap-3 px-3 py-2.5"} ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
          const content = (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-label={compact ? item.label : undefined}
              title={compact ? item.label : undefined}
              className={itemLink}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!compact && <span>{item.label}</span>}
            </NavLink>
          );
          return compact ? (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>{content}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>{item.label}</TooltipContent>
            </Tooltip>
          ) : content;
        })}
      </nav>
      <div className={`space-y-2 border-t border-border/70 py-3 ${compact ? "px-2" : "px-3"}`}>
        {compact ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/upgrade" onClick={onNavigate} aria-label="Upgrade plan" title="Upgrade plan" className={({ isActive }) => `mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Zap className="h-[18px] w-[18px]" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>Upgrade plan</TooltipContent>
          </Tooltip>
        ) : (
          <NavLink to="/upgrade" onClick={onNavigate} className="flex items-center gap-3 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/80">
            <Zap className="h-[18px] w-[18px]" /> Upgrade plan
          </NavLink>
        )}
        {compact ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={doSignOut} aria-label="Sign out" title="Sign out" className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>Sign out · {user?.email || "Account"}</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{(user?.email?.[0] || "K").toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">Your workspace</div>
              <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={doSignOut} className="h-8 w-8 text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const activeTopNav = topNav.find((item) => location.pathname === item.to || (item.to === "/widgets" && ["/case-studies", "/social-posts"].includes(location.pathname)))?.to ?? location.pathname;

  return (
    <div className="min-h-screen bg-[#f4f4f3] text-foreground dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] border-r border-border/70 bg-card md:flex md:flex-col">
        <SidebarContent compact />
      </aside>

      <div className="min-w-0 md:ml-[76px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur-xl">
          <div className="flex h-[62px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="md:hidden"><Logo /></div>
              <div className="hidden items-center gap-1 rounded-full bg-muted/70 p-1 md:flex">
                {topNav.map((item) => {
                  const active = activeTopNav === item.to;
                  return (
                    <NavLink key={item.to} to={item.to} className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors lg:text-sm ${active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden max-w-[220px] items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 sm:flex">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-800">K</div>
                <span className="max-w-[160px] truncate text-xs font-medium text-foreground">{user?.email || "Workspace"}</span>
              </div>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open application menu" className="h-9 w-9 md:hidden"><Menu className="h-4 w-4" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <SidebarContent onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="hidden items-center gap-2 rounded-full bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground md:flex">
                <Layers3 className="h-4 w-4" /> Workspace
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-[1520px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
