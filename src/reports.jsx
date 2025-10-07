// Itinerary.jsx
import React, { useState, useEffect } from "react";

// ---------------- Utils ----------------
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${h}:${m}`;
}
function exportTripToPDF(trip) {
  const html = `
    <h1>${trip.title}</h1>
    <p>${trip.startDate} - ${trip.endDate}</p>
    <h3>Schedule</h3>
    ${trip.schedule
      .map(
        (s) =>
          `<div><strong>${s.date} ${s.time}</strong><div>${s.title}</div></div>`
      )
      .join("")}
  `;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}

// ---------------- UI Primitives ----------------
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white shadow-sm rounded p-4 ${className}`}>
      {children}
    </div>
  );
}
function Button({ children, variant = "primary", ...rest }) {
  const base = "px-4 py-2 rounded text-sm font-medium";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white"
      : variant === "danger"
      ? "bg-red-600 text-white"
      : "border text-gray-700";
  return (
    <button className={`${base} ${styles}`} {...rest}>
      {children}
    </button>
  );
}
function Badge({ level }) {
  const map = {
    low: { text: "Low", color: "bg-green-100 text-green-800" },
    medium: { text: "Medium", color: "bg-yellow-100 text-yellow-800" },
    high: { text: "High", color: "bg-red-100 text-red-800" },
  };
  const v = map[level?.toLowerCase()] || map.low;
  return (
    <span
      className={`inline-block px-2 py-1 rounded ${v.color} text-xs font-medium`}
    >
      {v.text}
    </span>
  );
}

// ---------------- Mock Data ----------------
const mockTrip = {
  id: "trip-123",
  title: "Client Meeting – Singapore",
  startDate: "2025-10-10",
  endDate: "2025-10-15",
  status: "Approved",
  durationDays: 6,
  destination: { city: "Singapore", country: "Singapore", flag: "🇸🇬" },
  purpose: "Client Meeting",
  risk: "Low",
  approver: { name: "Rina Patel" },
  documents: {
    passport: { status: "Valid", expires: "2028-06-10" },
    insurance: { provider: "Acme Ins", policy: "AC-998877" },
  },
  emergency: { name: "Travel Desk", phone: "+1-800-555-3333" },
  embassy: { name: "Singapore Embassy", phone: "+65-1234-5678" },
  schedule: [
    {
      date: "2025-10-10",
      time: "09:30",
      type: "Flight",
      title: "DEL → SIN (SQ403)",
      details: "Terminal 3 • Seat 12A",
      ticketUrl: "#",
    },
    {
      date: "2025-10-10",
      time: "15:00",
      type: "Hotel",
      title: "Marina Bay Sands",
      details: "Check-in: 15:00 • Booking ref: BKG123",
    },
    {
      date: "2025-10-11",
      time: "10:00",
      type: "Meeting",
      title: "Client HQ",
      details: "123 Business Rd, Suite 100",
    },
  ],
  lastCheckIn: null,
};

// ---------------- Subcomponents ----------------
function TripSummary({ trip }) {
  return (
    <Card>
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold">Trip Summary</h2>
          <p className="text-sm text-gray-600">
            {trip.destination.city}, {trip.destination.country}
          </p>
          <p className="mt-2">
            Purpose: <strong>{trip.purpose}</strong>
          </p>
          <p>
            Risk: <Badge level={trip.risk} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm">Duration</p>
          <p className="text-xl font-bold">{trip.durationDays} days</p>
        </div>
      </div>

      <hr className="my-3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Passport</p>
          <p>
            {trip.documents.passport.status} • Expires{" "}
            {trip.documents.passport.expires}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Insurance</p>
          <p>
            {trip.documents.insurance.provider} • Policy #
            {trip.documents.insurance.policy}
          </p>
        </div>
      </div>
    </Card>
  );
}
function ScheduleItem({ item }) {
  return (
    <div className="flex items-start gap-4 p-3 border rounded">
      <div className="w-14 text-sm text-gray-500">
        <div>{item.date}</div>
        <div className="mt-1">{formatTime(item.time)}</div>
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">
              {item.type} • {item.title}
            </p>
            <p className="text-sm text-gray-600">{item.details}</p>
          </div>
          <div className="text-right">
            {item.location && (
              <a
                href={item.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600"
              >
                Map
              </a>
            )}
            {item.ticketUrl && (
              <a
                href={item.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-3 text-xs text-gray-600"
              >
                Ticket
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function ScheduleList({ schedule }) {
  return (
    <Card>
      <h3 className="font-semibold mb-3">Day-by-day Schedule</h3>
      <div className="space-y-3">
        {schedule.map((item, idx) => (
          <ScheduleItem item={item} key={idx} />
        ))}
      </div>
    </Card>
  );
}
function SafetyPanel({ trip, onCheckIn, onSOS }) {
  return (
    <Card>
      <h3 className="font-semibold mb-2">Safety & Support</h3>
      <div className="mb-3">
        <p className="text-sm text-gray-600">Emergency Contact</p>
        <p className="font-medium">
          {trip.emergency.name} • {trip.emergency.phone}
        </p>
      </div>
      <div className="mb-3">
        <p className="text-sm text-gray-600">Local Embassy</p>
        <p>
          {trip.embassy.name} • {trip.embassy.phone}
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={onCheckIn}>Check-in</Button>
        <Button variant="danger" onClick={onSOS}>
          SOS
        </Button>
      </div>
    </Card>
  );
}
function ActionsBar({ trip }) {
  return (
    <Card>
      <h3 className="font-semibold mb-3">Actions</h3>
      <div className="space-y-2">
        <Button onClick={() => exportTripToPDF(trip)}>Download PDF</Button>
        <Button
          onClick={() =>
            navigator.share
              ? navigator.share({
                  title: trip.title,
                  text: "Trip itinerary",
                  url: window.location.href,
                })
              : alert("Sharing not supported")
          }
        >
          Share
        </Button>
        <Button
          variant="outline"
          onClick={() => alert("Change request sent")}
        >
          Request Change
        </Button>
      </div>
    </Card>
  );
}
function ItinerarySkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 w-1/3 bg-gray-200 rounded mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded" />
          </div>
        </div>
        <aside>
          <div className="h-36 bg-gray-200 rounded mb-4" />
          <div className="h-36 bg-gray-200 rounded" />
        </aside>
      </div>
    </div>
  );
}

// ---------------- Main Component ----------------
export default function Itinerary({ tripId = "trip-123" }) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fake fetch
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setTrip(mockTrip);
      setLoading(false);
    }, 800);
  }, [tripId]);

  const checkIn = () =>
    setTrip((prev) => ({
      ...prev,
      lastCheckIn: new Date().toISOString(),
    }));
  const triggerSOS = () => alert("Emergency workflow triggered!");

  if (loading) return <ItinerarySkeleton />;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{trip.title}</h1>
          <p className="text-sm text-gray-500">
            {trip.startDate} — {trip.endDate} • {trip.status}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Approver: {trip.approver.name}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <TripSummary trip={trip} />
          <ScheduleList schedule={trip.schedule} />
        </div>

        <aside className="space-y-4">
          <SafetyPanel trip={trip} onCheckIn={checkIn} onSOS={triggerSOS} />
          <ActionsBar trip={trip} />
        </aside>
      </div>
    </div>
  );
}
