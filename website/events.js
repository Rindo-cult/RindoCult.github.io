class Event {
    constructor(name, frequency, start, end) {
        this.name = name;
        this.frequency = frequency; // "once", "weekly", "monthly", "yearly"
        this.start = start ? new Date(start) : null;
        this.end = end ? new Date(end) : null;
    }

    formatDate() {
        if (!this.start) return "No start date";
        const startStr = this.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (this.end) {
            const endStr = this.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `${startStr} – ${endStr}`;
        }
        return startStr;
    }

    occursOn(date) {
        if (!this.start) return false;
        const s = this.start;
        const d = date;

        switch (this.frequency) {
            case "once":
                return s.getFullYear() === d.getFullYear() &&
                       s.getMonth() === d.getMonth() &&
                       s.getDate() === d.getDate();
            case "weekly":
                return d >= s && s.getDay() === d.getDay();
            case "monthly":
                return d >= s && s.getDate() === d.getDate();
            case "yearly":
                return d >= s && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
            default:
                return false;
        }
    }
}

async function fetchEvents() {
    try {
        console.log("📡 Fetching events.json...");
        const response = await fetch("website/events.json");
        console.log("✅ Fetch status:", response.status, response.statusText);

        if (!response.ok) throw new Error(`Failed to fetch events.json (status ${response.status})`);

        const data = await response.json();
        console.log("📜 Events loaded:", data);

        const events = data.map(e => new Event(e.name, e.frequency, e.start, e.end));
        renderCalendar(events);

    } catch (err) {
        console.error("❌ fetchEvents error:", err);
        const calendar = document.getElementById("calendar");
        if (calendar) calendar.innerHTML = `<p>Could not load events: ${err.message}</p>`;
    }
}

function renderCalendar(events) {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots before first day
    for (let i = 0; i < startingDay; i++) {
        const empty = document.createElement("div");
        empty.classList.add("calendar-day");
        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day");
        if (day === now.getDate()) cell.classList.add("today");

        const label = document.createElement("div");
        label.classList.add("date");
        label.textContent = day;
        cell.appendChild(label);

        const date = new Date(year, month, day);

        events.forEach(event => {
            if (event.occursOn(date)) {
                const ev = document.createElement("div");
                ev.classList.add("event");
                ev.innerHTML = `<strong>${event.name}</strong><br>${event.formatDate()}`;
                cell.appendChild(ev);
            }
        });

        calendar.appendChild(cell);
    }
}

if (document.getElementById("calendar")) fetchEvents();
