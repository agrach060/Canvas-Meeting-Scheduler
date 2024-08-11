/* Logout.js
 * Last Edited: 8/6/24
 *
 * Logout tab that handles instructor, student, and admin logout.
 *
 * Known bugs:
 * -
 *
 */

import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

const Logout = () => {
  // General Variables
  const { setUser } = useContext(UserContext);

  // Webpage Navigate Variables
  const navigate = useNavigate();

  ////////////////////////////////////////////////////////
  //               Fetch Post Functions                 //
  ////////////////////////////////////////////////////////

  // Function to handle the logout process
  useEffect(() => {
    const handleLogout = async () => {
      try {
        // log out from the website
        const response = await fetch("/logout", {
          method: "POST",
          credentials: "include",
        });

        if (response.ok) {
          setUser(null);
          localStorage.removeItem("user"); // clear local storage
          // log out from Google OAuth2
          const googleResponse = await fetch("/api/logout", {
            method: "POST",
            credentials: "include",
          });

          if (!googleResponse.ok) {
            console.error("Google Logout failed");
          }

          navigate("/");
        } else {
          console.error("Logout failed");
        }
      } catch (error) {
        console.error("Network error", error);
      }
    };

    // call the handleLogout function immediately on component mount
    (async () => {
      await handleLogout();
    })();
  }, [navigate, setUser]); // Dependencies for useEffect

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  // Display logging out while logging out the admin, instructor, or student
  return <div>Logging out...</div>;
};

export default Logout;
