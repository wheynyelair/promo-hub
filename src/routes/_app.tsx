import { useEffect } from "react";
import {
  Outlet,
  useNavigate,
  createFileRoute,
  Link,
  useLocation,
} from "@tanstack/react-router";

import { useBranding, BRANCH_NAME } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallBanner } from "@/components/InstallBanner";
import { registerServiceWorker } from "@/lib/register-sw";
import { Layers, Image as ImageIcon, Settings, Archive } from "lucide-react";

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
  const { data: branding } = useBranding();

  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  const isActive = (p: string) => loc.pathname.startsWith(p);

  /**
   * TEMPORARY STATIC PROFILE
   * Remove this later if auth returns.
   */
  const profile = {
    branch: "matriz",
    is_admin: true,
  };

  const newCount = 0;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 glass-strong text-sidebar-foreground shadow-card bg-sidebar/90">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/galeria" className="flex items-center gap-2">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt="Logo"
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <Layers className="h-5 w-5 text-accent" />
            )}

            <span className="font-display text-xl tracking-widest">
              DAM
            </span>

            <span className="text-xs px-2 py-0.5 rounded bg-sidebar-accent uppercase tracking-wider">
              {BRANCH_NAME[profile.branch] ?? profile.branch}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/galeria">
              <Button
                variant={isActive("/galeria") ? "secondary" : "ghost"}
                size="sm"
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Galeria
                <NewBadge count={newCount} />
              </Button>
            </Link>

            <Link to="/arquivo">
              <Button
                variant={isActive("/arquivo") ? "secondary" : "ghost"}
                size="sm"
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Archive className="h-4 w-4 mr-2" />
                Arquivo
              </Button>
            </Link>

            {profile.is_admin && (
              <Link to="/admin">
                <Button
                  variant={isActive("/admin") ? "secondary" : "ghost"}
                  size="sm"
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Outlet />

      <InstallBanner />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar text-sidebar-foreground border-t border-sidebar-border grid grid-cols-3">
        <Link
          to="/galeria"
          className={`relative flex flex-col items-center py-3 text-xs gap-1 ${
            isActive("/galeria") ? "text-accent" : ""
          }`}
        >
          <ImageIcon className="h-5 w-5" />
          Galeria

          {newCount > 0 && (
            <span className="absolute top-1 right-1/4 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-accent-foreground text-[9px]">
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </Link>

        <Link
          to="/arquivo"
          className={`flex flex-col items-center py-3 text-xs gap-1 ${
            isActive("/arquivo") ? "text-accent" : ""
          }`}
        >
          <Archive className="h-5 w-5" />
          Arquivo
        </Link>

        <Link
          to="/admin"
          className={`flex flex-col items-center py-3 text-xs gap-1 ${
            isActive("/admin") ? "text-accent" : ""
          }`}
        >
          <Settings className="h-5 w-5" />
          Admin
        </Link>
      </nav>
    </div>
  );
}