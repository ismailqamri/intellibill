"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthState, getAuthToken, getStoredUserName } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const publicPaths = new Set(["/login", "/signup"]);

const navigation = [
  { label: "Dashboard", path: "/", icon: "dashboard" },
  { label: "Sales", path: "/sales", icon: "sales" },
  { label: "Purchases", path: "/purchases", icon: "purchases" },
  { label: "Inventory", path: "/inventory", icon: "inventory" },
  { label: "Customers", path: "/customers", icon: "customers" },
  { label: "Suppliers", path: "/suppliers", icon: "suppliers" },
  { label: "Accounting", path: "/accounting", icon: "accounting" },
  { label: "Reports", path: "/reports", icon: "reports" },
  { label: "Company Profile", path: "/settings", icon: "settings" },
];

function Icon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    "aria-hidden": true,
  } as const;

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );

    case "sales":
      return (
        <svg {...common}>
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      );

    case "purchases":
      return (
        <svg {...common}>
          <path d="M6 6h15l-1.5 9h-12z" />
          <path d="M6 6L5 3H2" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="17" cy="20" r="1.5" />
        </svg>
      );

    case "inventory":
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );

    case "customers":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c1-4 3.5-6 6.5-6s5.5 2 6.5 6" />
          <circle cx="18" cy="9" r="2.7" />
          <path d="M15.5 14c2.3.3 4 2 4.7 4.6" />
        </svg>
      );

    case "suppliers":
      return (
        <svg {...common}>
          <rect x="3" y="10" width="18" height="10" rx="1.5" />
          <path d="M7 10V6a5 5 0 0 1 10 0v4" />
        </svg>
      );

    case "accounting":
      return (
        <svg {...common}>
          <path d="M12 2v20M17 5.5c0-1.9-2.2-3.5-5-3.5s-5 1.4-5 3.2 2.2 2.7 5 3.3 5 1.6 5 3.3-2.2 3.2-5 3.2-5-1.6-5-3.5" />
        </svg>
      );

    case "reports":
      return (
        <svg {...common}>
          <path d="M4 19V9M11 19V4M18 19v-6" />
          <path d="M2 19h20" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-1.9.3l-.2.1a1.7 1.7 0 0 0-.8 1.6V22h-4v-.3a1.7 1.7 0 0 0-.8-1.6l-.2-.1a1.7 1.7 0 0 0-1.9-.3l-.2.1-2-3.4.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.4-1.1H3v-4h.2a1.7 1.7 0 0 0 1.4-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 1.9-.3l.2-.1A1.7 1.7 0 0 0 9.3 2V2h4v.3a1.7 1.7 0 0 0 .8 1.6l.2.1a1.7 1.7 0 0 0 1.9.3l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1.1h.2v4h-.2A1.7 1.7 0 0 0 19.4 15z" />
        </svg>
      );

    case "collapse":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );

    case "theme":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );

    case "signout":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 19V5a2 2 0 0 0-2-2h-7" />
        </svg>
      );

    default:
      return null;
  }
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("intellibill-theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
    }

    const savedCollapse = localStorage.getItem(
      "intellibill-sidebar-collapsed"
    );

    if (savedCollapse === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";

    localStorage.setItem(
      "intellibill-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (publicPaths.has(pathname)) {
      setIsAuthorized(false);
      setAuthChecking(false);
      return;
    }

    const token = getAuthToken();

    if (!token) {
      clearAuthState();
      setIsAuthorized(false);
      router.replace("/login");
      setAuthChecking(true);
      return;
    }

    setAuthChecking(true);
    setIsAuthorized(false);
    setUserName(getStoredUserName());

    let cancelled = false;

    fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        if (!cancelled && data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          setUserName(data.user.name || "");
          setIsAuthorized(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthState();
          setIsAuthorized(false);
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (publicPaths.has(pathname)) {
    return <>{children}</>;
  }

  if (authChecking) {
    return (
      <div className="ib-app">
        <main className="ib-auth-loading">Loading IntelliBill...</main>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const active = navigation.find(
    (item) =>
      item.path === pathname ||
      (item.path !== "/" && pathname.startsWith(item.path + "/"))
  );

  const navigate = (path: string) => {
    router.push(path);

    if (window.innerWidth <= 900) {
      setMobileOpen(false);
    }
  };

  const toggleCollapse = () => {
    const next = !collapsed;

    setCollapsed(next);

    localStorage.setItem(
      "intellibill-sidebar-collapsed",
      String(next)
    );
  };

  const signOut = () => {
    clearAuthState();
    setIsAuthorized(false);
    setAuthChecking(true);
    setUserName("");
    router.replace("/login");
  };

  return (
    <div
      className={`ib-app ${
        collapsed ? "ib-sidebar-collapsed" : ""
      } ${mobileOpen ? "ib-mobile-open" : ""}`}
    >
      <aside className="ib-sidebar">
        <div className="ib-brand">
          <div className="ib-brand-mark">IB</div>

          <div className="ib-brand-text">
            <b>IntelliBill</b>
            <span>Business Management</span>
          </div>
        </div>

        <nav className="ib-nav">
          {navigation.map((item) => (
            <button
              key={item.path}
              type="button"
              data-label={item.label}
              className={`ib-nav-link ${
                active?.path === item.path ? "active" : ""
              }`}
              onClick={() => navigate(item.path)}
            >
              <span className="ib-nav-icon">
                <Icon name={item.icon} />
              </span>

              <span className="ib-nav-label">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="ib-sidebar-foot">
          <button
            type="button"
            className="ib-collapse-btn ib-collapse-action"
            onClick={toggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name="collapse" />

            <span>
              {collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"}
              </span>
            </button>

            <button
              type="button"
              className="ib-collapse-btn ib-signout-action"
              onClick={signOut}
              title="Sign out"
            >
              <Icon name="signout" />

              <span>Sign Out</span>
            </button>
          </div>
      </aside>

      {mobileOpen && (
        <button
          className="ib-sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="ib-main">
        <header className="ib-topbar">
          <div className="ib-mobile-menu">
            <button
              className="ib-icon-btn"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
          </div>

          <div className="ib-heading">
            <div className="ib-crumb">
              Workspace / {active?.label || "Dashboard"}
            </div>

            <div className="ib-page-title">
              {active?.label || "Dashboard"}
            </div>
          </div>

          <div className="ib-search">
            <Icon name="search" />
            <span>Search invoices, customers…</span>
            <kbd>⌘K</kbd>
          </div>

          <div className="ib-top-actions">
            <button
              className="ib-icon-btn"
              type="button"
              title="Toggle theme"
              onClick={() => setDarkMode((value) => !value)}
            >
              <Icon name="theme" />
            </button>

            <button
              className="ib-icon-btn"
              type="button"
              title="Notifications"
            >
              <Icon name="bell" />
              <span className="ib-dot" />
            </button>

            <div className="ib-avatar">
              <div className="ib-avatar-circle">IQ</div>

              <div>
                <div className="ib-avatar-name">
                  {userName || "IntelliBill User"}
                </div>

                <div className="ib-avatar-role">
                  Administrator
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="ib-content">
          {children}
        </div>
      </main>
    </div>
  );
}
