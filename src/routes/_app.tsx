import { useEffect } from "react";
import {
  Outlet,
  useNavigate,
  createFileRoute,
  Link,
  useLocation,
} from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallBanner } from "@/components/InstallBanner";
import { registerServiceWorker } from "@/lib/register-sw";

import {
  Layers,
  LogOut,
  Image as ImageIcon,
  Settings,
  Archive,
} from "lucide-react";

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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const newCount = 0;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 glass-strong bg-sidebar/90 text-sidebar-foreground shadow-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/galeria" className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" />

            <span className="font-display text-xl tracking-widest">
              DAM
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link to="/galeria">
              <Button
                variant={isActive("/galeria") ? "secondary" : "ghost"}
                size="sm"
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
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
                <Archive className="mr-2 h-4 w-4" />
                Arquivo
              </Button>
            </Link>

            <Link to="/admin">
              <Button
                variant={isActive("/admin") ? "secondary" : "ghost"}
                size="sm"
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <InstallBanner />

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
        <Link
          to="/galeria"
          className={`relative flex flex-col items-center gap-1 py-3 text-xs ${
            isActive("/galeria") ? "text-accent" : ""
          }`}
        >
          <ImageIcon className="h-5 w-5" />

          <span>Galeria</span>

          {newCount > 0 && (
            <span className="absolute right-1/4 top-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] text-accent-foreground">
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </Link>

        <Link
          to="/arquivo"
          className={`flex flex-col items-center gap-1 py-3 text-xs ${
            isActive("/arquivo") ? "text-accent" : ""
          }`}
        >
          <Archive className="h-5 w-5" />

          <span>Arquivo</span>
        </Link>

        <Link
          to="/admin"
          className={`flex flex-col items-center gap-1 py-3 text-xs ${
            isActive("/admin") ? "text-accent" : ""
          }`}
        >
          <Settings className="h-5 w-5" />

          <span>Admin</span>
        </Link>
      </nav>
    </div>
  );
}