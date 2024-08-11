/* UserContext.js
 * Last Edited: 5/19/24
 *
 * Allows to pass down user data to a component without having
 * to pass props through every level in the component tree of Canvas Meeting Scheduler.
 *
 * Known bugs:
 * -
 *
 */

import React, { createContext, useState, useEffect } from "react";

// Context Variables
export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  // User Data Variables
  const [user, setUser] = useState(() => {
    // Load the user from local storage
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    // Save the user to local storage whenever it changes
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  return (
    // Provide Child components with access to values user and setUser and their data
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
