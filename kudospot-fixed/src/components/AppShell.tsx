import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageSquareQuote, LogOut, Settings, Inbox, LayoutGrid, FileText, Share2, BarChart3, Menu, Zap } from "lucide-react";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ReactNode, useState } from "react";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/testimonials", icon: MessageSquareQuote, label: "Testimonials" },
  { to: "/collect", icon: Inbox, label: "Collect" },
  { to: "/widgets", icon: LayoutGrid, label: "Widgets" },
  { to: "/case-studies", icon: FileText, label: "Case studies" },
  { to: "/social-posts", icon: Share2, label: "Social posts" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const Logo = () => (
  <div className="flex items-center gap-2 font-bold">
    <img src="/kudospot-icon.svg" alt="KudoSpot" className="h-8 w-8" />
    KudoSpot
  </div>
);

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <Logo />
      </div>
      <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              }`
            }
          >
            <n.icon className="h-4 w-4" /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/upgrade"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-primary-light text-primary hover:bg-primary-light/80 transition"
        >
          <Zap className="h-4 w-4" /> Upgrade plan
        </NavLink>
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={async () => { await signOut(); navigate("/"); }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-secondary/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-sidebar border-r border-sidebar-border flex-col fixed h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-background border-b flex items-center justify-between px-4">
        <Logo />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 bg-sidebar">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 md:ml-60 p-4 md:p-8 max-w-6xl pt-20 md:pt-8 overflow-x-hidden min-w-0">{children}</main>
    </div>
  );
};
