/* Profile.js
 * Last Edited: 8/14/24
 *
 * Frontend form to fetch, display, and update user's profile information
 *
 * Known Bugs:
 * -
 *
 */

import React, { useState, useEffect } from "react";
import { getCookie } from "../utils/GetCookie";

export default function Profile() {
  // CSRF Token
  const csrfToken = getCookie("csrf_access_token");

  // State Variables for User Information
  const [profileData, setProfileData] = useState({
    name: "",
    pronouns: "",
    email: "",
    discord_id: "",
    zoom_link: "",
    calendar_type: "",
    calendar_link: "",
  });

  // Fetch User Profile Data from API
  const fetchProfileData = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData({
          ...profileData,
          name: data.name || "",
          pronouns: data.pronouns || "",
          email: data.email || "",
          discord_id: data.discord_id || "",
          zoom_link: data.zoom_link || "",
          calendar_type: data.calendar_type || "",
          calendar_link: data.calendar_link || "",
        });
      } else {
        console.error("Failed to fetch profile data");
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  };

  // Handle Form Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(JSON.stringify(profileData, null, 2));
    try {
      const response = await fetch("/api/user/profile/update", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        alert("Profile updated successfully!");
      } else {
        console.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  // Fetch Profile Data on Component Mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  // Render Form
  return (
    <div className="flex flex-col w-1/3 m-auto mt-8">
      <form onSubmit={handleSubmit} className="flex flex-col w-full">
        <h2 className="pb-10 text-center font-bold text-2xl">Profile</h2>

        {/* Name */}
        <label className="font-bold">Name</label>
        <input
          className="border border-light-gray mb-3"
          type="text"
          name="name"
          value={profileData.name}
          onChange={handleInputChange}
        />

        {/* Pronouns */}
        <label className="font-bold">Pronouns</label>
        <input
          className="border border-light-gray mb-3"
          type="text"
          name="pronouns"
          value={profileData.pronouns}
          onChange={handleInputChange}
        />

        {/* Email (disabled) */}
        <label className="font-bold">Email</label>
        <input
          className="border border-light-gray mb-3 bg-gray-100"
          type="email"
          name="email"
          value={profileData.email}
          disabled
        />

        {/* Discord ID */}
        <label className="font-bold">Discord ID</label>
        <input
          className="border border-light-gray mb-3"
          type="text"
          name="discord_id"
          value={profileData.discord_id}
          onChange={handleInputChange}
        />

        {/* Zoom Link */}
        <label className="font-bold">Zoom Link</label>
        <input
          className="border border-light-gray mb-3"
          type="text"
          name="zoom_link"
          value={profileData.zoom_link}
          onChange={handleInputChange}
        />

        {/* Preferred Calendar */}
        <label className="font-bold">Preferred Calendar</label>
        <select
          className="border border-light-gray mb-3"
          name="calendar_type"
          value={profileData.calendar_type}
          onChange={handleInputChange}
        >
          <option value="">Select...</option>
          <option value="Google Calendar">Google Calendar</option>
          <option value="Outlook Calendar">Outlook Calendar</option>
          <option value="Canvas Calendar">Canvas Calendar</option>
        </select>

        {/* Calendar Link */}
        <label className="font-bold">Calendar Link</label>
        <input
          className="border border-light-gray mb-3"
          type="text"
          name="calendar_link"
          value={profileData.calendar_link}
          onChange={handleInputChange}
        />

        {/* Submit Button */}
        <button
          type="submit"
          style={{ backgroundColor: "#4b2e83", color: "white" }}
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
