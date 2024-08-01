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
import CalendarView from "./components/CalendarView";

function App() {
  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  return (
    <>
      <Navbar />
      <div id="container" className="">
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

          <Route
            path="/view-my-calendar"
            element={
              <ProtectedRoute
                allowedAccountTypes={["instructor", "student", "admin"]}
              >
                <CalendarView />
              </ProtectedRoute>
            }
          />

        </Routes>
      </div >
    </>
  );
}

export default App;
