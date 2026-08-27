class Event {
    constructor(name, frequency, start, end, cancelled = false, reason = "") {
        this.name = name;
        this.frequency = frequency; 
        this.start = start ? new Date(start) : null;
        this.end = end ? new Date(end) : null;
        this.cancelled = cancelled; 
        this.reason = reason; 
    }

    formatDate(currentDate) {
        if (!this.start) return "No start date";

        const targetDate = currentDate || this.start;

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

function getActiveBlackouts(currentDate, allEvents) {
    const blackouts = allEvents.filter(e => e.cancelled);
    
    return blackouts.filter(b => {
        if (!b.start) return false;
        
        let s = new Date(b.start);
        let e = b.end ? new Date(b.end) : new Date(b.start); 
        
        if (b.frequency === "once") {
            s.setHours(0, 0, 0, 0);
            e.setHours(23, 59, 59, 999);
            return currentDate >= s && currentDate <= e;
        } else if (b.frequency === "yearly") {
            let dateMD = (currentDate.getMonth() + 1) * 100 + currentDate.getDate();
            let startMD = (s.getMonth() + 1) * 100 + s.getDate();
            let endMD = (e.getMonth() + 1) * 100 + e.getDate();
            
            if (startMD > endMD) { 
                return dateMD >= startMD || dateMD <= endMD;
            } else {
                return dateMD >= startMD && dateMD <= endMD;
            }
        }
        return false;
    });
}

async function fetchEvents() {
    try {
        const response = await fetch("website/events.json");
        if (!response.ok) throw new Error(`Failed to fetch events.json (status ${response.status})`);
        
        const data = await response.json();
        const events = data.map(e => new Event(e.name, e.frequency, e.start, e.end, e.cancelled, e.reason));
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
        label.style.whiteSpace = "nowrap"; 
        
        const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
        label.textContent = `${day} ${dayName}`;
        cell.appendChild(label);

        let todaysEvents = events.filter(event => !event.cancelled && event.occursOn(date));
        const activeBlackouts = getActiveBlackouts(date, events);
        const globalBlackout = activeBlackouts.find(b => !events.some(e => e.name === b.name && !e.cancelled));

        const uniqueEventsMap = new Map();
        todaysEvents.forEach(event => {
            if (!uniqueEventsMap.has(event.name)) {
                uniqueEventsMap.set(event.name, event);
            } else {
                if (event.frequency === "once") {
                    uniqueEventsMap.set(event.name, event);
                }
            }
        });
        todaysEvents = Array.from(uniqueEventsMap.values());

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
            
            let timeDisplay = event.formatDate(date);
            let reasonDisplay = ""; 

            const specificBlackout = activeBlackouts.find(b => b.name === event.name);
            
            let isCancelled = false;
            let cancelReason = "";

            if (specificBlackout) {
                isCancelled = true;
                cancelReason = specificBlackout.reason || (globalBlackout ? globalBlackout.name : "");
            } else if (globalBlackout) {
                isCancelled = true;
                cancelReason = globalBlackout.name; 
            }

            // --- NEW: Check if this event's specific end time has passed ---
            let isPast = false;
            const refTime = event.end ? event.end : event.start;
            if (refTime) {
                // Determine exactly what time this event occurs today based on local timezone
                const displayStart = new Date(Date.UTC(year, month, day, event.start.getUTCHours(), event.start.getUTCMinutes()));
                const displayEnd = new Date(Date.UTC(year, month, day, refTime.getUTCHours(), refTime.getUTCMinutes()));
                
                let endDayOffset = 0;
                // If the end time is numerically smaller than the start time (e.g., 23:00 to 01:00), it crosses midnight locally!
                if (displayEnd.getHours() < displayStart.getHours()) {
                    endDayOffset = 1;
                }
                
                // Construct the absolute exact moment this event ends
                const trueEndTime = new Date(year, month, day + endDayOffset, displayEnd.getHours(), displayEnd.getMinutes());
                
                if (now > trueEndTime) {
                    isPast = true;
                }
            }
            // ---------------------------------------------------------------

            if (isCancelled) {
                ev.classList.add("cancelled-event"); 
                ev.style.backgroundColor = "rgba(180, 40, 40, 0.4)"; 
                ev.style.border = "1px solid #ff4d4d";
                timeDisplay = `<span style="text-decoration: line-through; opacity: 0.7;">${timeDisplay}</span> <b style="color: #ff6b6b; font-size: 0.9em;">Canceled</b>`;
                if (cancelReason) {
                    reasonDisplay = `<div style="font-size: 0.85em; margin-top: 6px; color: #ffb3b3; font-style: italic;">Reason: ${cancelReason}</div>`;
                }
            }

            // --- NEW: Apply gray-out styles for past events ---
            if (isPast) {
                ev.style.opacity = "0.45"; 
                ev.style.filter = "grayscale(80%)";
            }
            // --------------------------------------------------
            
            ev.innerHTML = `
                <div class="event-name"><strong>${event.name}</strong></div>
                <div class="event-time" style="margin-top: 4px;">${timeDisplay}</div>
                ${reasonDisplay} 
            `;
            
            cell.appendChild(ev);
        });

        calendar.appendChild(cell);
    }
}

if (document.getElementById("calendar")) fetchEvents();
