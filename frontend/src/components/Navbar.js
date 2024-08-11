/* Navbar.js
 * Last Edited: 5/19/24
 *
 * Navigation bar displayed on top of the webpage which has different tabs.
 * Once user clicks on a tab, they're redirected to a different webpage which
 * contains the contents of the tab.
 *
 * Known Bugs:
 * -
 *
 */
import React, { useContext } from "react";
import { Link, useMatch, useResolvedPath } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Navbar() {
  // General Variables
  const { user } = useContext(UserContext);

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  return (
    // Define Navbar component
    <nav className="bg-purple text-white flex flex-row justify-between align-middle items-stretch gap-8 px-4 py-1">
      {/* Display UWTECHPREP on Navbar for all users with its CustomLink set */}
      <Link to="/" className="text-4xl hover:text-gold font-headlines">
        UWTechPrep
      </Link>

      {/* Unordered list of CustomLink components */}
      <ul className="flex gap-4 h-full">
        {/* If user isn't logged in, display HOME, LOGIN, and REGISTER on Navbar with their CustomLinks set */}
        {!user && (
          <>
            <CustomLink to="/" className="hover:text-gold font-headlines">
              HOME
            </CustomLink>
            <CustomLink to="/login" className="hover:text-gold font-headlines">
              LOGIN
            </CustomLink>
            <CustomLink
              to="/registerform"
              className="hover:text-gold font-headlines"
            >
              REGISTER
            </CustomLink>
          </>
        )}

        {/* If user account type is admin, display HOME, MANAGE USERS, MANAGE PROGRAMS, and VIEW FEEDBACK on Navbar with their CustomLinks set */}
        {user && user.account_type === "admin" && (
          <>
            <CustomLink to="/admin" className="hover:text-gold font-headlines">
              HOME
            </CustomLink>
            <CustomLink
              to="/admin/user-management"
              className="hover:text-gold font-headlines"
            >
              MANAGE USERS
            </CustomLink>
            <CustomLink
              to="/admin/program-management"
              className="hover:text-gold font-headlines"
            >
              MANAGE PROGRAMS
            </CustomLink>
            <CustomLink
              to="/admin/view-feedback"
              className="hover:text-gold font-headlines"
            >
              VIEW FEEDBACK
            </CustomLink>
          </>
        )}

        {/* If instructor or student logged in, check account type and status */}
        {user && (
          <>
            {/* If account type is student, display HOME on Navbar with its CustomLink set */}
            {user.account_type === "student" && (
              <CustomLink
                to="/student"
                className="hover:text-gold font-headlines"
              >
                HOME
              </CustomLink>
            )}

            {/* If account type is instructor, display HOME on Navbar with its CustomLink set */}
            {user.account_type === "instructor" && (
              <CustomLink
                to="/instructor"
                className="hover:text-gold font-headlines"
              >
                HOME
              </CustomLink>
            )}

            {/* If user status active, check account type */}
            {user.status === "active" && (
              <>
                {/* If account type student, display COURSES on Navbar with its CustomLink set */}
                {user.account_type === "student" && (
                  <>
                    <CustomLink
                      to="/student/courses"
                      className="hover:text-gold font-headlines"
                    >
                      COURSES
                    </CustomLink>
                  </>
                )}

                {/* If account type instructor, display TIMES and PROGRAM DETAILS on Navbar with their CustomLinks set */}
                {user.account_type === "instructor" && (
                  <>
                    <CustomLink
                      to="/instructor/manage-times"
                      className="hover:text-gold font-headlines"
                    >
                      TIMES
                    </CustomLink>
                    <CustomLink
                      to="/instructor/edit-class-availability"
                      className="hover:text-gold font-headlines"
                    >
                      PROGRAM DETAILS
                    </CustomLink>
                  </>
                )}
              </>
            )}

            {/* Display PROFILE to admin, instructor, and student on Navbar with its CustomLink set */}
            <CustomLink
              to="/profile"
              className="hover:text-gold font-headlines"
            >
              PROFILE
            </CustomLink>

            {/* Display the user's calendar depending on calendar type they are using */}
            <CustomLink to="/view-my-calendar" className="hover:text-gold font-headlines">
              VIEW MY CALENDAR
            </CustomLink>

            {/* Display LOGOUT to admin, instructor, and student on Navbar with its CustomLink set */}
            <CustomLink to="/logout" className="hover:text-gold font-headlines">
              LOGOUT
            </CustomLink>
          </>
        )}
      </ul>
    </nav>
  );
}

function CustomLink({ to, children, ...props }) {
  const resolvedPath = useResolvedPath(to);
  const isActive = useMatch({ path: resolvedPath.pathname, end: true });

  return (
    // If tab on NavBar is active, then highlight tab on Navbar
    <li className={isActive ? "text-gold underline" : ""}>
      {/* Pass the destination URL, any additional props, and content of link 
          from CustomLink to Link component and render Link component */}
      <Link to={to} {...props}>
        {children}
      </Link>
    </li>
  );
}
