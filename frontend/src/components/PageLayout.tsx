import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Library } from 'lucide-react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNav?: boolean;
}

export function PageLayout({ children, title, showNav = true }: PageLayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-neutral-200">
      {/* Top Navigation Bar - Swiss Structure */}
      {showNav && (
        <nav className="h-14 bg-blue-900 shadow-md flex items-center px-6 gap-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-white">
            <FolderOpen className="w-5 h-5" />
            <span className="tracking-tight">LIQUID SCIENCE</span>
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-none ${
                isActive('/') && location.pathname === '/'
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              Projects
            </Link>
            <Link
              to="/library"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-none ${
                isActive('/library')
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Library className="w-4 h-4" />
              Library
            </Link>
          </div>

          {title && (
            <>
              <div className="w-px h-6 bg-blue-700" />
              <span className="text-sm text-blue-200 font-medium">{title}</span>
            </>
          )}
        </nav>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
