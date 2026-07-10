import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogOut, Settings, Shield, Briefcase, LayoutDashboard, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';

export function Header() {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Determine which dashboard link to show based on role
  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'ADMIN':
        return '/admin';
      case 'EMPLOYEE':
        return '/employee';
      default:
        return '/dashboard';
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          Weapply
        </Link>
        <nav className="flex items-center gap-6">
          <CurrencySwitcher />
          <Link to="/scholarships" className="text-sm hover:text-primary">
            Scholarships
          </Link>
          <Link to="/pricing" className="text-sm hover:text-primary">
            Pricing
          </Link>
          {user && (
            <Link to="/matches" className="text-sm hover:text-primary flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              Matches
            </Link>
          )}
          {user && (
            <Link to="/documents" className="text-sm hover:text-primary">
              Documents
            </Link>
          )}
          {user && (
            <Link to={getDashboardLink()} className="text-sm hover:text-primary">
              Dashboard
            </Link>
          )}
          {user && user.role === 'ADMIN' && (
            <Link to="/admin" className="text-sm hover:text-primary">
              Admin
            </Link>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>
                      {getInitials(user.displayName || user.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    {user.role && (
                      <p className="text-xs leading-none text-muted-foreground">
                        Role: {user.role}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={getDashboardLink()} className="cursor-pointer flex items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile/edit" className="cursor-pointer flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                </DropdownMenuItem>
                {user.role === 'ADMIN' && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {user.role === 'EMPLOYEE' && (
                  <DropdownMenuItem asChild>
                    <Link to="/employee" className="cursor-pointer flex items-center">
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>Employee Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}