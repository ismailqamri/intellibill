
"use client";

import { useState } from "react";

const navigation = [
  { name: "Dashboard", icon: "▦" },
  { name: "Sales", icon: "↗" },
  { name: "Purchases", icon: "↙" },
  { name: "Inventory", icon: "▤" },
  { name: "Customers", icon: "♙" },
  { name: "Suppliers", icon: "♧" },
  { name: "Accounting", icon: "₹" },
  { name: "Reports", icon: "▥" },
];

const summaryCards = [
  {
    title: "Today's Sales",
    value: "₹24,500",
    change: "+12.5%",
    description: "Compared to yesterday",
    icon: "↗",
  },
  {
    title: "Total Purchases",
    value: "₹12,800",
    change: "+8.2%",
    description: "This month",
    icon: "↙",
  },
  {
    title: "Outstanding",
    value: "₹18,200",
    change: "Receivable",
    description: "Pending customer payments",
    icon: "₹",
  },
  {
    title: "Low Stock Items",
    value: "8",
    change: "Attention",
    description: "Products need restocking",
    icon: "▤",
  },
];

const recentInvoices = [
  {
    id: "#INV-1001",
    customer: "Rahman Stores",
    amount: "₹4,500",
    status: "Paid",
  },
  {
    id: "#INV-1002",
    customer: "Amaan Traders",
    amount: "₹2,850",
    status: "Pending",
  },
  {
    id: "#INV-1003",
    customer: "City Mart",
    amount: "₹6,200",
    status: "Paid",
  },
  {
    id: "#INV-1004",
    customer: "Noor Supermarket",
    amount: "₹1,950",
    status: "Pending",
  },
];

const chartValues = [42, 58, 45, 72, 55, 84, 65, 92, 70, 78, 62, 88];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className={darkMode ? "app dark" : "app"}>
      <div className="dashboard-shell">
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
          <div className="brand">
            <div className="brand-logo">IB</div>
            <div>
              <h2>IntelliBill</h2>
              <p>Business Management</p>
            </div>
          </div>

          <div className="navigation-heading">MAIN MENU</div>

          <nav className="navigation">
            {navigation.map((item) => (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "nav-item-active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <button className="nav-item">
              <span className="nav-icon">⚙</span>
              <span>Settings</span>
            </button>

            <div className="upgrade-card">
              <div className="upgrade-icon">✦</div>
              <strong>IntelliBill Pro</strong>
              <p>Manage your business smarter.</p>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            className="sidebar-overlay"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <section className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="mobile-menu-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                ☰
              </button>

              <div>
                <p className="breadcrumb">Workspace / Overview</p>
                <h1>{activePage}</h1>
              </div>
            </div>

            <div className="topbar-actions">
              <button
                className="theme-button"
                onClick={() => setDarkMode(!darkMode)}
                aria-label="Toggle theme"
              >
                {darkMode ? "☀" : "☾"}
              </button>

              <button className="notification-button" aria-label="Notifications">
                ♧
                <span className="notification-dot" />
              </button>

              <div className="profile">
                <div className="profile-avatar">IQ</div>
                <div className="profile-details">
                  <strong>Ismail Qamri</strong>
                  <span>Administrator</span>
                </div>
              </div>
            </div>
          </header>

          <div className="page-content">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">BUSINESS OVERVIEW</p>
                <h2>Good afternoon, Ismail! 👋</h2>
                <p>
                  Here's what's happening with your business today.
                </p>
              </div>

              <button className="primary-button">
                <span>+</span>
                Create Invoice
              </button>
            </section>

            <section className="summary-grid">
              {summaryCards.map((card) => (
                <article className="summary-card" key={card.title}>
                  <div className="card-top">
                    <div className="card-icon">{card.icon}</div>
                    <span className="card-menu">•••</span>
                  </div>

                  <p className="card-title">{card.title}</p>
                  <h3>{card.value}</h3>

                  <div className="card-footer">
                    <span className="card-change">{card.change}</span>
                    <span>{card.description}</span>
                  </div>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel sales-panel">
                <div className="panel-header">
                  <div>
                    <h3>Sales Overview</h3>
                    <p>Monitor your sales performance</p>
                  </div>

                  <select className="period-select" defaultValue="7">
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>

                <div className="chart-summary">
                  <strong>₹84,500</strong>
                  <span>+14.8% this period</span>
                </div>

                <div className="chart">
                  <div className="chart-grid-lines">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="chart-bars">
                    {chartValues.map((value, index) => (
                      <div className="bar-wrapper" key={index}>
                        <div
                          className="chart-bar"
                          style={{ height: `${value}%` }}
                        />
                        <span>
                          {["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F"][index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="panel quick-actions-panel">
                <div className="panel-header">
                  <div>
                    <h3>Quick Actions</h3>
                    <p>Common business operations</p>
                  </div>
                </div>

                <div className="quick-actions">
                  <button className="quick-action">
                    <span className="quick-action-icon blue">↗</span>
                    <span>
                      <strong>New Invoice</strong>
                      <small>Create a sales invoice</small>
                    </span>
                    <span>›</span>
                  </button>

                  <button className="quick-action">
                    <span className="quick-action-icon purple">↙</span>
                    <span>
                      <strong>Add Purchase</strong>
                      <small>Record a supplier purchase</small>
                    </span>
                    <span>›</span>
                  </button>

                  <button className="quick-action">
                    <span className="quick-action-icon green">▤</span>
                    <span>
                      <strong>Add Product</strong>
                      <small>Update your inventory</small>
                    </span>
                    <span>›</span>
                  </button>

                  <button className="quick-action">
                    <span className="quick-action-icon orange">₹</span>
                    <span>
                      <strong>Record Payment</strong>
                      <small>Manage a customer payment</small>
                    </span>
                    <span>›</span>
                  </button>
                </div>
              </article>
            </section>

            <section className="bottom-grid">
              <article className="panel invoices-panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Invoices</h3>
                    <p>Your latest sales transactions</p>
                  </div>

                  <button className="text-button">View all →</button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            <strong>{invoice.id}</strong>
                          </td>
                          <td>{invoice.customer}</td>
                          <td>{invoice.amount}</td>
                          <td>
                            <span
                              className={`status ${
                                invoice.status === "Paid"
                                  ? "status-paid"
                                  : "status-pending"
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel stock-panel">
                <div className="panel-header">
                  <div>
                    <h3>Stock Alerts</h3>
                    <p>Items requiring attention</p>
                  </div>

                  <button className="text-button">View all →</button>
                </div>

                <div className="stock-alert">
                  <div className="stock-product-icon">🥛</div>
                  <div className="stock-product">
                    <strong>Milk 1L</strong>
                    <span>Only 3 units left</span>
                  </div>
                  <span className="stock-warning">Low</span>
                </div>

                <div className="stock-alert">
                  <div className="stock-product-icon">🍚</div>
                  <div className="stock-product">
                    <strong>Rice 5kg</strong>
                    <span>Only 5 units left</span>
                  </div>
                  <span className="stock-warning">Low</span>
                </div>

                <div className="stock-alert">
                  <div className="stock-product-icon">🧴</div>
                  <div className="stock-product">
                    <strong>Cooking Oil</strong>
                    <span>Only 7 units left</span>
                  </div>
                  <span className="stock-warning">Low</span>
                </div>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}