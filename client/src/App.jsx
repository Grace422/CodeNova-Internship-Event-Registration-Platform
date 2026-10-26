import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import "./App.css";

const API_URL = `${import.meta.env.VITE_API_URL}/api/events`;
const REGISTRATION_URL = `${import.meta.env.VITE_API_URL}/api/registrations`;

const DOMAIN_OPTIONS = [
  "Web Development",
  "Artificial Intelligence",
  "Machine Learning",
  "Data Science",
  "Cybersecurity",
  "Cloud Computing",
  "IoT",
  "Blockchain",
];

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    college: "",
    domain_interests: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState(false);

  const fetchEvents = async () => {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch events.");
      }

      const data = await response.json();
      setEvents(data);
      setError("");
    } catch (err) {
      setError("Unable to load events. Please check the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openRegistrationForm = (event) => {
    setSelectedEvent(event);
    setFormMessage("");
    setFormError(false);
    setFormData({
      name: "",
      email: "",
      college: "",
      domain_interests: [],
    });
  };

  const closeRegistrationForm = () => {
    if (submitting) return;
    setSelectedEvent(null);
    setFormMessage("");
    setFormError(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleInterestChange = (event) => {
    const { value, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      domain_interests: checked
        ? [...previous.domain_interests, value]
        : previous.domain_interests.filter((interest) => interest !== value),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormMessage("");
    setFormError(false);

    if (formData.domain_interests.length === 0) {
      setFormError(true);
      setFormMessage("Please select at least one domain interest.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(REGISTRATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          college: formData.college.trim(),
          domain_interests: formData.domain_interests,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed. Please try again."
        );
      }

      setFormMessage(data.message || "Registration successful!");
      await fetchEvents();

      setFormData({
        name: "",
        email: "",
        college: "",
        domain_interests: [],
      });
    } catch (err) {
      setFormError(true);
      setFormMessage(
        err.message || "Unable to register. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isAdminPage = window.location.pathname === "/admin";
  if (isAdminPage) {
    return (
      <AdminDashboard
        events={events}
        onBack={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Event Management System</h1>
        <p>Discover upcoming events and register to participate.</p>
      </header>

      <main className="main">
        <h2>Upcoming Events</h2>

        {loading && <p>Loading events...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <p>No events available at the moment.</p>
        )}

        <div className="event-grid">
          {events.map((event) => {
            const isFull =
              Number(event.registration_count) >= Number(event.capacity);

            return (
              <article className="event-card" key={event.id}>
                <h3>{event.title}</h3>
                <p className="event-description">{event.description}</p>

                <p className="event-details">
                  <strong>Date:</strong>{" "}
                  {new Date(event.event_date).toLocaleString()}
                </p>

                <p className="event-details">
                  <strong>Capacity:</strong> {event.capacity}
                </p>

                <p className="event-details">
                  <strong>Registered:</strong>{" "}
                  {event.registration_count} / {event.capacity}
                </p>

                <button
                  type="button"
                  disabled={isFull}
                  onClick={() => openRegistrationForm(event)}
                >
                  {isFull ? "Event Full" : "Register"}
                </button>
              </article>
            );
          })}
        </div>

        {selectedEvent && (
          <section className="registration-section">
            <h2>Register for {selectedEvent.title}</h2>
            <p>Fill in your details to reserve your place.</p>

            {formMessage && (
              <p className={formError ? "error" : "success"} role="status">
                {formMessage}
              </p>
            )}

            <form className="registration-form" onSubmit={handleSubmit}>
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength={100}
                placeholder="Enter your full name"
              />

              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                maxLength={254}
                placeholder="Enter your email address"
              />

              <label htmlFor="college">College</label>
              <input
                id="college"
                name="college"
                type="text"
                value={formData.college}
                onChange={handleInputChange}
                required
                maxLength={200}
                placeholder="Enter your college name"
              />

              <fieldset>
                <legend>Domain Interests (select at least one)</legend>
                <div className="interest-grid">
                  {DOMAIN_OPTIONS.map((interest) => (
                    <label className="interest-option" key={interest}>
                      <input
                        type="checkbox"
                        value={interest}
                        checked={formData.domain_interests.includes(interest)}
                        onChange={handleInterestChange}
                      />
                      {interest}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-actions">
                <button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Registration"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeRegistrationForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;