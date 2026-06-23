import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          ApplyAI
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/scholarships" className="text-sm hover:text-primary">
            Scholarships
          </Link>
          <Link to="/dashboard" className="text-sm hover:text-primary">
            Dashboard
          </Link>
          <Button variant="outline" size="sm">
            Sign In
          </Button>
          <Button size="sm">Get Started</Button>
        </nav>
      </div>
    </header>
  );
}
