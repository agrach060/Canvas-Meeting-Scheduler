/* App.js
 * Last Edited: 3/11/24
 *
 * Mapping front-end routes for public, admin, student, and instructor view.
 *
 * Known Bugs:
 * -
 *
 */

import Navbar from "./components/Navbar";
import Courses from "./pages/Courses";
import ViewFeedback from "./components/ViewFeedback";
import Home from "./pages/Home";
import LoginSignup from "./pages/LoginSignup";
import RegisterForm from "./pages/RegisterForm";
import { Route, Routes } from "react-router-dom";
import Logout from "./components/Logout";
import ManageUsers from "./components/ManageUsers";
import ManagePrograms from "./components/ManagePrograms";
import ProtectedRoute from "./context/ProtectedRoute";
import Unauthorized from "./context/Unauthorized";
import Times from "./pages/Times";
import ProgramDetails from "./pages/ProgramDetails";
import Profile from "./pages/Profile";
import { useSession, useSupabaseClient, useSessionContext } from "@supabase/auth-helpers-react";
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import { useState } from 'react';

function App() {
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const session = useSession(); // user and tokens, when session exists, we have a user
  const supabase = useSupabaseClient(); // talk to supabase
  const { isLoading } = useSessionContext();

  if (isLoading) {
    return <></>
  }

  async function googleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar'
      }
    });
    if (error) {
      alert("Error logging into Google provider with Supabase");
      console.log(error);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function createCalendarEvent() {
    console.log("Creating calendar event");
    const event = {
      'summary': eventName,
      'description': eventDescription,
      'start': {
        'dateTime': start.toISOString(), // Date.toISOString()
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone // America/Los_Angeles
      },
      'end': {
        'dateTime': end.toISOString(), // Date.toISOString()
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone // America/Los_Angeles
      }
    }
    await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token // Access token for Google
      },
      body: JSON.stringify(event)
    }).then((data) => {
      return data.json();
    }).then((data) => {
      console.log(data);
      alert("Event created, check your Google Calendar!");
    })
  }

  console.log(session);
  console.log(start);
  console.log(eventName);
  console.log(eventDescription);



  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  return (
    <>
      <Navbar />
      <div id="container" className="">
        <div style={{ width: "400px", margin: "30px auto", backgroundColor: "purple", padding: "30px" }}>
          {session ?
            <>
              <h2>Hey there {session.user.email}!</h2>
              <div className='p-5'>
                <p>Start of your event</p>
                <DateTimePicker onChange={setStart} value={start} />
                <p>End of your event</p>
                <DateTimePicker onChange={setEnd} value={end} />
              </div>
              <p>Event name</p>
              <input type="text" style={{ color: "#000000" }} onChange={(e) => setEventName(e.target.value)} />
              <p>Event description</p>
              <input type="text" style={{ color: "#000000" }} onChange={(e) => setEventDescription(e.target.value)} />
              <hr />
              <button onClick={() => createCalendarEvent()}>Create Calendar Event</button>
              <p></p>
              <button onClick={() => signOut()}>Sign Out</button>
            </>
            :
            <>
              <button onClick={() => googleSignIn()}>Sign In With Google</button>
            </>
          }
        </div>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/registerform" element={<RegisterForm />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedAccountTypes={["admin"]}>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/user-management"
            element={
              <ProtectedRoute allowedAccountTypes={["admin"]}>
                <ManageUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/program-management"
            element={
              <ProtectedRoute allowedAccountTypes={["admin"]}>
                <ManagePrograms />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/view-feedback"
            element={
              <ProtectedRoute allowedAccountTypes={["admin"]}>
                <ViewFeedback />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedAccountTypes={["student"]}>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/courses"
            element={
              <ProtectedRoute allowedAccountTypes={["student"]}>
                <Courses />
              </ProtectedRoute>
            }
          />

          {/* Instructor Routes */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute allowedAccountTypes={["instructor"]}>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/manage-times"
            element={
              <ProtectedRoute allowedAccountTypes={["instructor"]}>
                <Times />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/edit-class-availability"
            element={
              <ProtectedRoute allowedAccountTypes={["instructor"]}>
                <ProgramDetails />
              </ProtectedRoute>
            }
          />

          {/* Routes For All Roles*/}
          <Route
            path="/profile"
            element={
              <ProtectedRoute
                allowedAccountTypes={["instructor", "student", "admin"]}
              >
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div >
    </>
  );
}

export default App;
