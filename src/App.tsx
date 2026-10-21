import { useState } from 'react';
import ReservationsPage from './ReservationsPage';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  CalendarClock,
  Settings,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import DashboardPage from './DashboardPage';
import BooksPage from './BooksPage';
import MembersPage from './MembersPage';
import BorrowReturnPage from './BorrowReturnPage';
import './App.css';

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Books', icon: BookOpen },
  { name: 'Members', icon: Users },
  { name: 'Borrow & Return', icon: ArrowLeftRight },
  { name: 'Reservations', icon: CalendarClock },
  { name: 'Settings', icon: Settings },
] as const;

type Page = (typeof navigation)[number]['name'];

function App() {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigate(page: Page) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  return (
    <div className="app">
      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <BookOpen size={30} />
          <span>BookNest</span>

          <button
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <p className="sidebar-label">LIBRARY MANAGEMENT</p>

        <nav aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name ? 'active' : ''
              }`}
              aria-current={activePage === name ? 'page' : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <BookOpen size={22} />
          <p>
            A home for every book.
            <span>BookNest Library</span>
          </p>
        </div>
      </aside>

      <div className="main-layout">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>

            <span className="breadcrumb">{activePage}</span>
          </div>

          <div className="topbar-right">
            <span
              className="notification-icon"
              title="No new notifications"
            >
              <Bell size={20} />
            </span>
            <span className="avatar">A</span>
            <span className="admin-label">Admin</span>
          </div>
        </header>

        <main className="content">
          {activePage === 'Dashboard' ? (
            <DashboardPage
              onOpenBooks={() => navigate('Books')}
              onOpenLoans={() => navigate('Borrow & Return')}
            />
          ) : activePage === 'Books' ? (
            <BooksPage />
          ) : activePage === 'Members' ? (
            <MembersPage />
                    ) : activePage === 'Borrow & Return' ? (
            <BorrowReturnPage />
          ) : activePage === 'Reservations' ? (
            <ReservationsPage />
          ) : (
            <section className="panel placeholder-page">
              <div className="placeholder-icon">
                <BookOpen size={36} />
              </div>
              <h1>{activePage}</h1>
              <p>We’ll build this page in an upcoming step.</p>
              <button
                className="primary-button"
                onClick={() => navigate('Dashboard')}
              >
                Back to Dashboard
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;