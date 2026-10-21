
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/events";

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Failed to fetch events.");
        }

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError("Unable to load events. Please check the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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
          {events.map((event) => (
            <article className="event-card" key={event.id}>
              <h3>{event.title}</h3>
              <p>{event.description}</p>

              <p>
                <strong>Date:</strong>{" "}
                {new Date(event.event_date).toLocaleString()}
              </p>

              <p>
                <strong>Capacity:</strong> {event.capacity}
              </p>

              <p>
                <strong>Registered:</strong>{" "}
                {event.registration_count} / {event.capacity}
              </p>

              <button type="button" disabled>
                Registration Coming Soon
              </button>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
