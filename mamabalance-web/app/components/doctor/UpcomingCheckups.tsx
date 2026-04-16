"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import { useRouter } from "next/navigation";
import "react-calendar/dist/Calendar.css";

export default function UpcomingCheckups() {
  const [date, setDate] = useState(new Date());
  const router = useRouter();

  const todayCheckups = [
    { id: 1, name: "Checkup 01", time: "08:00", color: "orange" },
    { id: 2, name: "Checkup 02", time: "09:00", color: "red" },
    { id: 3, name: "Checkup 03", time: "10:00", color: "orange" },
    { id: 4, name: "Checkup 04", time: "12:00", color: "green" },
  ];

  return (
    <div className="dashboard-card checkup-card">

      <h3>Upcoming Checkups</h3>

      <div className="checkup-content">

        {/* REAL CALENDAR */}
        <Calendar
          onChange={(value) => setDate(value as Date)}
          value={date}
          className="real-calendar"
        />

        {/* TODAY LIST */}
        <div className="today-checkups">

          <h4>Today</h4>

          {todayCheckups.map((item) => (
            <div key={item.id} className="checkup-item">
              <span className={`dot ${item.color}`}></span>
              {item.name}
              <span className="time">{item.time}</span>
            </div>
          ))}

          <button
            className="btn-primary view-checkups"
            onClick={() => router.push("/doctor/upcoming-checkup")}
          >
            View All Checkups
          </button>

        </div>

      </div>

    </div>
  );
}