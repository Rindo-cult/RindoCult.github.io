class Event {
    constructor(name, frequency, start, end) {
        this.name = name;
        this.frequency = frequency; // "once", "weekly", "monthly", "yearly"
        this.start = start ? new Date(start) : null;
        this.end = end ? new Date(end) : null;
    }

    formatDate() {
        if (!this.start) return "No start date";
        // Only show start and end time in user's local timezone
        const startStr = this.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (this.end) {
            const endStr = this.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `${startStr} – ${endStr}`;
        }
        return startStr;
    }

    // Check if this event occurs on a given date
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
                // same weekday, and after start date
                return d >= s &&
                s.getDay() === d.getDay();
            case "monthly":
                // same day of month, and after start date
                return d >= s && s.getDate() === d.getDate();
            case "yearly":
                // same month and day, after start date
                return d >= s && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
            default:
                return false;
        }
    }
}


async function fetchEvents() {
    try {
        const response = await fetch("events.json");
        if (!response.ok) throw new Error("Failed to fetch events.json");

        const data = await response.json();
        const events = data.map(e => new Event(e.name, e.frequency, e.start, e.end));
        renderCalendar(events);

    } catch (err) {
        console.error(err);
        document.getElementById("calendar").innerHTML = "<p>Could not load events.</p>";
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

        // Define the date for this cell
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


// Only run if calendar exists
if (document.getElementById("calendar")) fetchEvents();
