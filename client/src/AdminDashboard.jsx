
import { useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";

const API_URL = "http://localhost:5000/api/admin";

function AdminDashboard({ events, onBack }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("adminToken") || ""
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const logout = () => {
    sessionStorage.removeItem("adminToken");
    setToken("");
    setRegistrations([]);
    setPassword("");
    setError("");
  };

  useEffect(() => {
    if (!token) return;

    const fetchRegistrations = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/registrations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          logout();
          setError("Your session expired. Please log in again.");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load registrations."
          );
        }

        setRegistrations(data);
      } catch (err) {
        setError(err.message || "Unable to load registrations.");
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      sessionStorage.setItem("adminToken", data.token);
      setToken(data.token);
      setPassword("");
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setLoginLoading(false);
    }
  };

  const filteredRegistrations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return registrations;

    return registrations.filter((registration) =>
      [
        registration.name,
        registration.email,
        registration.college,
        registration.event_title,
        registration.status,
        ...(registration.domain_interests || []),
      ].some((value) => String(value).toLowerCase().includes(query))
    );
  }, [registrations, search]);

  const confirmedCount = registrations.filter(
    (registration) => registration.status === "Confirmed"
  ).length;

  const cancelledCount = registrations.filter(
    (registration) => registration.status === "Cancelled"
  ).length;

  if (!token) {
    return (
      <main className="admin-dashboard">
        <section className="registration-section admin-login">
          <h2>Admin Login</h2>
          <p>Sign in to access the event management dashboard.</p>

          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleLogin} className="registration-form">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className="form-actions">
              <button type="submit" disabled={loginLoading}>
                {loginLoading ? "Signing in..." : "Sign In"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={onBack}
              >
                Back to Events
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">EVENT MANAGEMENT</p>
          <h2>Admin Dashboard</h2>
          <p>Manage event registrations and attendee information.</p>
        </div>

        <div className="form-actions">
          <button className="admin-back-button" onClick={onBack}>
            Back to Events
          </button>
          <button className="admin-back-button" onClick={logout}>
            Log Out
          </button>
        </div>
      </div>

      <section className="admin-stats">
        <article className="admin-stat-card">
          <p>Total Events</p>
          <h3>{events.length}</h3>
        </article>

        <article className="admin-stat-card">
          <p>Total Registrations</p>
          <h3>{registrations.length}</h3>
        </article>

        <article className="admin-stat-card">
          <p>Confirmed</p>
          <h3>{confirmedCount}</h3>
        </article>

        <article className="admin-stat-card">
          <p>Cancelled</p>
          <h3>{cancelledCount}</h3>
        </article>
      </section>

      <section className="admin-registrations">
        <div className="admin-table-heading">
          <div>
            <h3>Attendee Registrations</h3>
            <p>View and search registered attendees.</p>
          </div>

          <input
            type="search"
            className="admin-search"
            placeholder="Search attendees..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search registrations"
          />
        </div>

        {loading && <p>Loading registrations...</p>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && !error && (
          <>
            <p className="admin-result-count">
              Showing {filteredRegistrations.length} of{" "}
              {registrations.length} registrations
            </p>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>College</th>
                    <th>Event</th>
                    <th>Domain Interests</th>
                    <th>Status</th>
                    <th>Registered On</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRegistrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <strong>{registration.name}</strong>
                        <span className="admin-email">
                          {registration.email}
                        </span>
                      </td>
                      <td>{registration.college}</td>
                      <td>{registration.event_title}</td>
                      <td>
                        {(registration.domain_interests || []).join(", ")}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            registration.status === "Confirmed"
                              ? "status-confirmed"
                              : "status-cancelled"
                          }`}
                        >
                          {registration.status}
                        </span>
                      </td>
                      <td>
                        {registration.registered_at
                          ? new Date(
                              registration.registered_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}

                  {filteredRegistrations.length === 0 && (
                    <tr>
                      <td colSpan="6" className="admin-empty">
                        No matching registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default AdminDashboard;
