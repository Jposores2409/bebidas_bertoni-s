import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, Receipt, Archive, LogOut,
  Menu, ChevronRight, Bell
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/productos', icon: Package, label: 'Productos' },
  { to: '/facturacion', icon: Receipt, label: 'Facturación' },
  { to: '/cierre-caja', icon: Archive, label: 'Cierre de caja' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="layout" data-sidebar={sidebarOpen ? 'open' : 'closed'}>
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.jpg" alt="Bertoni & Bebidas" className="logo-img" />
            {sidebarOpen && <span className="logo-text">Bebidas Bertoni´s</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Colapsar' : 'Expandir'}
          >
            <ChevronRight size={16} className={sidebarOpen ? 'rotated' : ''} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={!sidebarOpen ? label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={19} />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" title={!sidebarOpen ? user?.email : undefined}>
            <div className="user-avatar">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <span className="user-name">{user?.email?.split('@')[0]}</span>
                <span className="user-role">Administrador</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleSignOut} title="Cerrar sesión">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-right">
            <button className="topbar-icon-btn">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sidebar-w: 240px;
          --sidebar-collapsed: 64px;
          --bg: #0d0d14;
          --surface: #13131e;
          --surface2: #1a1a28;
          --border: rgba(255,255,255,0.07);
          --accent: #1a5fa8;
          --accent2: #1e4d8c;
          --text: #f1f1f5;
          --text-muted: rgba(255,255,255,0.4);
          --radius: 12px;
        }

        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

        .layout { display: flex; min-height: 100vh; }

        .sidebar {
          width: var(--sidebar-w);
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 100;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }
        [data-sidebar="closed"] .sidebar { width: var(--sidebar-collapsed); }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 16px;
          border-bottom: 1px solid var(--border);
          min-height: 64px;
          gap: 8px;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          flex: 1;
        }
        .logo-img {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 4px 12px rgba(26,95,168,0.35);
        }
        .logo-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: var(--text);
          white-space: nowrap;
          letter-spacing: -0.3px;
        }
        .sidebar-toggle {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          width: 28px;
          height: 28px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .sidebar-toggle:hover { background: var(--surface2); color: var(--text); }
        .sidebar-toggle .rotated { transform: rotate(180deg); }

        .sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          transition: all 0.15s;
          overflow: hidden;
        }
        .nav-item:hover { background: var(--surface2); color: var(--text); }
        .nav-item.active {
          background: rgba(26,95,168,0.15);
          color: #7eb8f5;
          border: 1px solid rgba(26,95,168,0.25);
        }
        .nav-item svg { flex-shrink: 0; }

        .sidebar-footer {
          padding: 12px 8px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          overflow: hidden;
          min-width: 0;
        }
        .user-avatar {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #1a5fa8, #1e4d8c);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: white;
          flex-shrink: 0;
        }
        .user-details { display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role { font-size: 11px; color: var(--text-muted); }
        .logout-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          width: 34px;
          height: 34px;
          border-radius: 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .logout-btn:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171; }

        .main-wrapper {
          flex: 1;
          margin-left: var(--sidebar-w);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        [data-sidebar="closed"] .main-wrapper { margin-left: var(--sidebar-collapsed); }

        .topbar {
          height: 64px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .topbar-icon-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          width: 36px;
          height: 36px;
          border-radius: 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .topbar-icon-btn:hover { background: var(--surface2); color: var(--text); }

        .main-content { flex: 1; padding: 28px; background: var(--bg); }

        .mobile-overlay { display: none; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); width: var(--sidebar-w) !important; }
          .sidebar.mobile-open { transform: translateX(0); }
          .main-wrapper { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex; }
          .mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 99;
          }
          .main-content { padding: 20px 16px; }
          .sidebar-toggle { display: none; }
        }

        /* ---- SHARED COMPONENTS ---- */
        .page-header { margin-bottom: 28px; }
        .page-title {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.5px;
        }
        .page-subtitle { font-size: 14px; color: var(--text-muted); margin-top: 4px; }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
          text-decoration: none;
          white-space: nowrap;
        }
        .btn-primary {
          background: linear-gradient(135deg, #1a5fa8, #1e4d8c);
          color: white;
          box-shadow: 0 4px 12px rgba(26,95,168,0.3);
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(26,95,168,0.45); }
        .btn-secondary { background: var(--surface2); color: var(--text); border-color: var(--border); }
        .btn-secondary:hover { background: rgba(255,255,255,0.08); }
        .btn-danger { background: rgba(239,68,68,0.1); color: #f87171; border-color: rgba(239,68,68,0.2); }
        .btn-danger:hover { background: rgba(239,68,68,0.2); }
        .btn-sm { padding: 6px 12px; font-size: 12.5px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 600;
        }
        .badge-green { background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
        .badge-red { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .badge-yellow { background: rgba(234,179,8,0.1); color: #facc15; border: 1px solid rgba(234,179,8,0.2); }
        .badge-blue { background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2); }
        .badge-gray { background: rgba(255,255,255,0.06); color: var(--text-muted); border: 1px solid var(--border); }

        .input {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 9px 13px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          width: 100%;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus { border-color: #1a5fa8; box-shadow: 0 0 0 3px rgba(26,95,168,0.12); }
        .input::placeholder { color: var(--text-muted); }
        select.input { cursor: pointer; }

        .form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th {
          text-align: left;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        td {
          padding: 13px 14px;
          font-size: 14px;
          color: var(--text);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(255,255,255,0.02); }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-lg { max-width: 760px; }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--surface);
          z-index: 1;
          border-radius: 20px 20px 0 0;
        }
        .modal-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: var(--text); }
        .modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .modal-close:hover { background: var(--surface2); color: var(--text); }
        .modal-body { padding: 24px; }
        .modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) {
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .stat-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-value {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          line-height: 1;
          letter-spacing: -1px;
        }
        .stat-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          gap: 12px;
          color: var(--text-muted);
          text-align: center;
        }
        .empty-state svg { opacity: 0.3; }
        .empty-state h3 { font-size: 16px; font-weight: 600; color: var(--text); opacity: 0.5; }
        .empty-state p { font-size: 14px; max-width: 280px; }

        .spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}