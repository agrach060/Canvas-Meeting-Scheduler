/* Navbar.js
 * Last Edited: 7/26/24
 *
 * Navigation bar displayed on top of the webpage which has different tabs.
 * Once user clicks on a tab, they're redirected to a different webpage which
 * contains the contents of the tab.
 *
 * Known Bugs:
 * -
 *
 */

import React, { useContext, useEffect } from "react";
import { Link, useMatch, useResolvedPath } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import LoginButton from './CanvasLogin';
import Home from '../pages/Home';
import Availability from './Availability';
import CoursesDropdownMenu from "./CoursesDropdownMenu";
import TermsDropdownMenu from "./TermsDropdownMenu";

export default function Navbar({ isLoggedIn, setIsLoggedIn, roles = [], courses = [], terms = [], handleChange, handleTermChange, selectedCourse, selectedTerm, coursesInTerm }) {
  const { user } = useContext(UserContext);

  useEffect(() => {
    console.log('isLoggedIn state:', isLoggedIn);
    console.log('Courses:', courses);
    console.log('Terms:', terms);
  }, [isLoggedIn, roles, courses, terms]);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <nav className="bg-purple text-white flex flex-row justify-between align-middle items-stretch gap-8 px-4 py-1">
      <Link to="/" className="text-4xl hover:text-gold font-headlines">
        UWTechPrep
      </Link>
      <ul className="flex gap-4 h-full">
        {isLoggedIn && (
          <>
            <TermsDropdownMenu terms={terms} handleTermChange={handleTermChange} selectedTerm={selectedTerm} />
            <CoursesDropdownMenu courses={coursesInTerm} handleChange={handleChange} selectedCourse={selectedCourse} />
          </>
        )}
        {!user && (
          <>
            <CustomLink to="/" className="hover:text-gold font-headlines" element={<Home />}>
              HOME
            </CustomLink>
            {!isLoggedIn ? (
              <CustomLink to="/login" className="hover:text-gold font-headlines">
                <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
              </CustomLink>
            ) : (
              <>
                <CustomLink to="/profile" className="hover:text-gold font-headlines">
                  PROFILE
                </CustomLink>
                <CustomLink to="/availability" className="hover:text-gold font-headlines" element={<Availability />}>
                  AVAILABILITY
                </CustomLink>
                <li>
                  <Link to="/" className="hover:text-gold font-headlines" onClick={handleLogout}>
                    LOGOUT
                  </Link>
                </li>
              </>
            )}
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
    <li className={isActive ? "text-gold underline" : ""}>
      <Link to={to} {...props}>
        {children}
      </Link>
    </li>
  );
}
