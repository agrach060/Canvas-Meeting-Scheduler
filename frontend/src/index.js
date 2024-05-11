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
import { createClient } from '@supabase/supabase-js'
import { SessionContextProvider } from "@supabase/auth-helpers-react";

const supabase = createClient(
  "https://mowpxtptperjungmlhzm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vd3B4dHB0cGVyanVuZ21saHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ5NzM0MTMsImV4cCI6MjAzMDU0OTQxM30.Xvu3JSjkA9GElg5QIa2h32i8NN1Lk6aUoUVW94Yo3Qo"
);


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
        <SessionContextProvider supabaseClient={supabase}>
          <App />
        </SessionContextProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
