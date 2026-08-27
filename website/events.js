class Event {
    constructor(name, frequency, start, end) {
        this.name = name;
        this.frequency = frequency; // "once", "weekly", "monthly", "yearly"
        this.start = start ? new Date(start) : null;
        this.end = end ? new Date(end) : null;
    }

    formatDate(currentDate) {
        if (!this.start) return "No start date";

        const targetDate = currentDate || this.start;

        // Project the original UTC time onto the CURRENT calendar day to prevent DST bugs
        const displayStart = new Date(Date.UTC(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            this.start.getUTCHours(),
            this.start.getUTCMinutes()
        ));

        const startStr = displayStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (this.end) {
            const displayEnd = new Date(Date.UTC(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate(),
                this.end.getUTCHours(),
                this.end.getUTCMinutes()
            ));
            const endStr = displayEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `${startStr} – ${endStr}`;
        }
        return startStr;
    }

    occursOn(date) {
        if (!this.start) return false;

        const startMidnight = new Date(this.start);
        startMidnight.setHours(0, 0, 0, 0);

        if (date < startMidnight) return false;

        switch (this.frequency) {
            case "once":
                return date.getTime() === startMidnight.getTime();
            case "weekly":
                return this.start.getDay() === date.getDay();
            case "monthly":
                return this.start.getDate() === date.getDate();
            case "yearly":
                return this.start.getMonth() === date.getMonth() && this.start.getDate() === date.getDate();
            default:
                return false;
        }
    }
}

async function fetchEvents() {
    try {
        const response = await fetch("website/events.json");
        if (!response.ok) throw new Error(`Failed to fetch events.json (status ${response.status})`);
        
        const data = await response.json();
        const events = data.map(e => new Event(e.name, e.frequency, e.start, e.end));
        renderCalendar(events);

    } catch (err) {
        console.error("fetchEvents error:", err);
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

    for (let i = 0; i < startingDay; i++) {
        const empty = document.createElement("div");
        empty.classList.add("calendar-day");
        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day");
        
        if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
            cell.classList.add("today");
        }

        const date = new Date(year, month, day);

        const label = document.createElement("div");
        label.classList.add("date");
        
        // NEW: Force the text to never wrap to a second line
        label.style.whiteSpace = "nowrap"; 
        
        const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
        label.textContent = `${day} ${dayName}`;
        cell.appendChild(label);

        const todaysEvents = events.filter(event => event.occursOn(date));

        todaysEvents.sort((a, b) => {
            const dateA = new Date(Date.UTC(year, month, day, a.start.getUTCHours(), a.start.getUTCMinutes()));
            const timeA = dateA.getHours() * 60 + dateA.getMinutes();
            
            const dateB = new Date(Date.UTC(year, month, day, b.start.getUTCHours(), b.start.getUTCMinutes()));
            const timeB = dateB.getHours() * 60 + dateB.getMinutes();
            
            return timeA - timeB;
        });

        todaysEvents.forEach(event => {
            const ev = document.createElement("div");
            ev.classList.add("event");
            
            // Format the event name and time into separate block elements
            ev.innerHTML = `
                <div class="event-name"><strong>${event.name}</strong></div>
                <div class="event-time" style="margin-top: 4px;">${event.formatDate(date)}</div>
            `;
            
            cell.appendChild(ev);
        });

        calendar.appendChild(cell);
    }
}

if (document.getElementById("calendar")) fetchEvents();
