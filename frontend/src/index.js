/* Index.js
 * Last Edited: 3/25/24
 *
 * Main entry point of the Canvas Meeting Scheduler React app.
 *
 *
 * Known bugs:
 * -
 *
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./index.css";

// Root Variables
const root = ReactDOM.createRoot(document.getElementById("root")); // root div from index.html

////////////////////////////////////////////////////////
//                 Render Functions                   //
////////////////////////////////////////////////////////

// render App component into the DOM
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
