import { useEffect } from "react";
import { Outlet, useNavigate, createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useBranding, BRANCH_NAME } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallBanner } from "@/components/InstallBanner";
import { registerServiceWorker } from "@/lib/register-sw";
import { useNewCount } from "@/lib/new-count";
import { Layers, LogOut, Image as ImageIcon, Settings, Archive, UserCog } from "lucide-react";

function NewBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-display tracking-tight">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, profile, loading, signOut } = useAuth();
  const { data: branding } = useBranding();
  const nav = useNavigate();
  const loc = useLocation();
  const newCount = useNewCount(profile);

  useEffect(() => {
    if (!loading && !session) nav({ to: "/" });
  }, [loading, session, nav]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const isActive = (p: string) => loc.pathname.startsWith(p);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 glass-strong text-sidebar-foreground shadow-card bg-sidebar/90">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/galeria" className="flex items-center gap-2">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="h-8 w-8 object-contain rounded" />
            ) : (
              <Layers className="h-5 w-5 text-accent" />
            )}
            <span className="font-display text-xl tracking-widest">DAM</span>
            <span className="text-xs px-2 py-0.5 rounded bg-sidebar-accent uppercase tracking-wider">{BRANCH_NAME[profile.branch] ?? profile.branch}</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link to="/galeria"><Button variant={isActive("/galeria") ? "secondary" : "ghost"} size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent"><ImageIcon className="h-4 w-4 mr-2"/>Galeria<NewBadge count={newCount} /></Button></Link>
            <Link to="/arquivo"><Button variant={isActive("/arquivo") ? "secondary" : "ghost"} size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent"><Archive className="h-4 w-4 mr-2"/>Arquivo</Button></Link>
            {profile.is_admin && (
              <>
                <Link to="/admin"><Button variant={isActive("/admin") ? "secondary" : "ghost"} size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent"><Settings className="h-4 w-4 mr-2"/>Admin</Button></Link>
                <Link to="/usuarios"><Button variant={isActive("/usuarios") ? "secondary" : "ghost"} size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent"><UserCog className="h-4 w-4 mr-2"/>Usuários</Button></Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => nav({ to: "/" }))} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <Outlet />
      <InstallBanner />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar text-sidebar-foreground border-t border-sidebar-border grid grid-cols-3">
        <Link to="/galeria" className={`relative flex flex-col items-center py-3 text-xs gap-1 ${isActive("/galeria") ? "text-accent" : ""}`}><ImageIcon className="h-5 w-5"/>Galeria{newCount > 0 && <span className="absolute top-1 right-1/4 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-accent-foreground text-[9px]">{newCount > 9 ? "9+" : newCount}</span>}</Link>
        <Link to="/arquivo" className={`flex flex-col items-center py-3 text-xs gap-1 ${isActive("/arquivo") ? "text-accent" : ""}`}><Archive className="h-5 w-5"/>Arquivo</Link>
        {profile.is_admin
          ? <Link to="/admin" className={`flex flex-col items-center py-3 text-xs gap-1 ${isActive("/admin") ? "text-accent" : ""}`}><Settings className="h-5 w-5"/>Admin</Link>
          : <button onClick={() => signOut().then(() => nav({ to: "/" }))} className="flex flex-col items-center py-3 text-xs gap-1"><LogOut className="h-5 w-5"/>Sair</button>}
      </nav>
    </div>
  );
}
