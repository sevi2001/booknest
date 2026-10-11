import { useState } from 'react';
import BooksPage from './BooksPage';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  CalendarClock,
  Settings,
  Bell,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react';
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

type Loan = {
  id: string;
  book: string;
  member: string;
  dueDate: string;
  status: 'Borrowed' | 'Overdue';
};

const demoLoans: Loan[] = [
  {
    id: 'L001',
    book: 'Atomic Habits',
    member: 'Nirmala Perera',
    dueDate: '18 Oct 2026',
    status: 'Borrowed',
  },
  {
    id: 'L002',
    book: 'Clean Code',
    member: 'Kasun Fernando',
    dueDate: '20 Oct 2026',
    status: 'Borrowed',
  },
  {
    id: 'L003',
    book: 'The Psychology of Money',
    member: 'Dilini Silva',
    dueDate: '8 Oct 2026',
    status: 'Overdue',
  },
  {
    id: 'L004',
    book: 'The Hobbit',
    member: 'Tharindu Rajapaksha',
    dueDate: '22 Oct 2026',
    status: 'Borrowed',
  },
];

const popularBooks = [
  { title: 'Atomic Habits', author: 'James Clear', loans: 32 },
  { title: 'Clean Code', author: 'Robert C. Martin', loans: 28 },
  { title: 'The Psychology of Money', author: 'Morgan Housel', loans: 24 },
];

function App() {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

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
              className={`nav-item ${activePage === name ? 'active' : ''}`}
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
            <span className="notification-icon" title="No new notifications">
              <Bell size={20} />
            </span>
            <span className="avatar">A</span>
            <span className="admin-label">Admin</span>
          </div>
        </header>

        <main className="content">
          {activePage === 'Dashboard' ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR LIBRARY AT A GLANCE</p>
                  <h1>Welcome back!</h1>
                  <p>Here’s what’s happening in your library today.</p>
                </div>

                <span className="today">{today}</span>
              </div>

              <div className="demo-notice">
                Preview dashboard · Figures and loan records are sample data.
              </div>

              <section className="stats-grid" aria-label="Library statistics">
                <article className="stat-card green">
                  <div className="stat-heading">
                    <span>Total Books</span>
                    <BookOpen size={22} />
                  </div>
                  <strong>1,248</strong>
                  <p>Across all categories</p>
                </article>

                <article className="stat-card blue">
                  <div className="stat-heading">
                    <span>Members</span>
                    <Users size={22} />
                  </div>
                  <strong>326</strong>
                  <p>Registered library members</p>
                </article>

                <article className="stat-card amber">
                  <div className="stat-heading">
                    <span>Borrowed</span>
                    <ArrowLeftRight size={22} />
                  </div>
                  <strong>84</strong>
                  <p>Books currently on loan</p>
                </article>

                <article className="stat-card red">
                  <div className="stat-heading">
                    <span>Overdue</span>
                    <AlertCircle size={22} />
                  </div>
                  <strong>12</strong>
                  <p>Waiting to be returned</p>
                </article>
              </section>

              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Recent Loans</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate('Borrow & Return')}
                    >
                      View all →
                    </button>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Book Title</th>
                          <th scope="col">Member</th>
                          <th scope="col">Due Date</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {demoLoans.map((loan) => (
                          <tr key={loan.id}>
                            <td className="book-title">{loan.book}</td>
                            <td>{loan.member}</td>
                            <td>{loan.dueDate}</td>
                            <td>
                              <span
                                className={`badge ${
                                  loan.status === 'Overdue'
                                    ? 'badge-red'
                                    : 'badge-green'
                                }`}
                              >
                                {loan.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <h2>Popular Books</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate('Books')}
                    >
                      View all →
                    </button>
                  </div>

                  <div className="popular-list">
                    {popularBooks.map((book, index) => (
                      <div className="popular-book" key={book.title}>
                        <div className={`book-cover cover-${index}`}>
                          <BookOpen size={24} />
                        </div>

                        <div className="popular-book-info">
                          <h3>{book.title}</h3>
                          <p>{book.author}</p>
                        </div>

                        <span className="loan-count">{book.loans} loans</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="quick-actions">
                <div>
                  <h2>Keep your library organised</h2>
                  <p>Explore your collection or manage a book loan.</p>
                </div>

                <div className="action-buttons">
                  <button
                    className="secondary-button"
                    onClick={() => navigate('Books')}
                  >
                    Browse Books
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => navigate('Borrow & Return')}
                  >
                    Manage Loans
                  </button>
                </div>
              </section>
            </>
            ) : activePage === 'Books' ? (
            <BooksPage />
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