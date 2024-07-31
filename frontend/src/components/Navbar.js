/* Navbar.js
 * Last Edited: 3/26/24
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
import LoginButton from './CanvasLogin'; // Import the LoginButton component

export default function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const { user } = useContext(UserContext);

  useEffect(() => {
    console.log('Navbar component rendered');
    console.log('isLoggedIn state:', isLoggedIn);
  }, [isLoggedIn]);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <nav className="bg-purple text-white flex flex-row justify-between align-middle items-stretch gap-8 px-4 py-1">
      <Link to="/" className="text-4xl hover:text-gold font-headlines">
        UWTechPrep
      </Link>
      <ul className="flex gap-4 h-full">
        {!user && (
          <>
            <CustomLink to="/" className="hover:text-gold font-headlines">
              HOME
            </CustomLink>
            {!isLoggedIn ? (
              <CustomLink to="/login" className="hover:text-gold font-headlines">
                <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
              </CustomLink>
            ) : (
              <li>
                <Link to="/" className="hover:text-gold font-headlines" onClick={handleLogout}>
                  LOGOUT
                </Link>
              </li>
            )}
          </>
        )}

        {user && user.account_type === "admin" && (
          <>
            <CustomLink to="/admin" className="hover:text-gold font-headlines">
              HOME
            </CustomLink>
            <CustomLink to="/admin/user-management" className="hover:text-gold font-headlines">
              MANAGE USERS
            </CustomLink>
            <CustomLink to="/admin/program-management" className="hover:text-gold font-headlines">
              MANAGE PROGRAMS
            </CustomLink>
            <CustomLink to="/admin/view-feedback" className="hover:text-gold font-headlines">
              VIEW FEEDBACK
            </CustomLink>
          </>
        )}

        {user && (
          <>
            {user.account_type === "student" && (
              <CustomLink to="/student" className="hover:text-gold font-headlines">
                HOME
              </CustomLink>
            )}
            {user.account_type === "instructor" && (
              <CustomLink to="/instructor" className="hover:text-gold font-headlines">
                HOME
              </CustomLink>
            )}
            {user.status === "active" && (
              <>
                {user.account_type === "student" && (
                  <CustomLink to="/student/courses" className="hover:text-gold font-headlines">
                    COURSES
                  </CustomLink>
                )}
                {user.account_type === "instructor" && (
                  <>
                    <CustomLink to="/instructor/manage-times" className="hover:text-gold font-headlines">
                      TIMES
                    </CustomLink>
                    <CustomLink to="/instructor/edit-class-availability" className="hover:text-gold font-headlines">
                      PROGRAM DETAILS
                    </CustomLink>
                  </>
                )}
              </>
            )}
            <CustomLink to="/profile" className="hover:text-gold font-headlines">
              PROFILE
            </CustomLink>
            <CustomLink to="/view-my-calendar" className="hover:text-gold font-headlines">
              VIEW MY CALENDAR
            </CustomLink>
            <li>
              <Link to="/" className="hover:text-gold font-headlines" onClick={handleLogout}>
                LOGOUT
              </Link>
            </li>
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
