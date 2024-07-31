import React, { useContext, useEffect } from "react";
import { Link, useMatch, useResolvedPath } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import LoginButton from './CanvasLogin';
import CalendarView from './CalendarView';
import Home from '../pages/Home';
import DropdownMenu from "./DropdownMenu";
import TermsDropdownMenu from "./TermsDropdownMenu";

export default function Navbar({ isLoggedIn, setIsLoggedIn, roles = [], courses = [], terms = [], handleChange, handleTermChange, selectedCourse, selectedTerm }) {
  const { user } = useContext(UserContext);

  useEffect(() => {
    console.log('Navbar component rendered');
    console.log('isLoggedIn state:', isLoggedIn);
    console.log('User roles:', roles);
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
            <DropdownMenu courses={courses} handleChange={handleChange} selectedCourse={selectedCourse} />
            <TermsDropdownMenu terms={terms} handleTermChange={handleTermChange} selectedTerm={selectedTerm} />
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
                <CustomLink to="/view-my-calendar" className="hover:text-gold font-headlines" element={<CalendarView />}>
                  VIEW MY CALENDAR
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
