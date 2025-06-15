
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, Clock, Syringe, CalendarOff, ClipboardPaste, ArrowLeft, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Layout = () => {
  const location = useLocation();
  const navItems = [
    { to: '/', label: '儀表板', icon: Home },
    { to: '/schedule', label: '排班表', icon: Calendar },
    { to: '/work-assignment', label: '批次分配', icon: ClipboardPaste },
    { to: '/staff', label: '藥師管理', icon: Users },
    { to: '/shifts', label: '班型管理', icon: Clock },
    { to: '/leave', label: '休假管理', icon: CalendarOff },
    { to: '/support', label: '支援設定', icon: LifeBuoy },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-start gap-4 px-4 sm:py-5">
           <div className="flex items-center gap-2 px-2.5 text-lg font-semibold">
            <Syringe className="h-6 w-6 text-primary" />
            <span>中藥排班系統</span>
          </div>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  isActive && 'bg-accent text-primary'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:py-4 sm:pl-64">
        {location.pathname !== '/' && (
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回儀表板
              </Link>
            </Button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
