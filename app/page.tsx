"use client";

import { useState } from "react";

export default function Home() {
  const [district, setDistrict] = useState("Georgetown Independent School District");
  const [city, setCity] = useState("Georgetown");
  const [state, setState] = useState("Texas");

  const submit = async () => {
    await fetch("/api/research", {
      method: "POST",
      body: JSON.stringify({
        district_name: district,
        city,
        state
      })
    });
  };

  return (
    <main className="max-w-xl mx-auto p-10">
      <h1 className="text-4xl font-bold mb-6">
        DistrictHub AI
      </h1>

      <input
        className="border p-2 w-full mb-4"
        placeholder="District Name"
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-4"
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-4"
        placeholder="State"
        value={state}
        onChange={(e) => setState(e.target.value)}
      />

      <button
        onClick={submit}
        className="bg-black text-white px-4 py-2"
      >
        Research District
      </button>
    </main>
  );
}