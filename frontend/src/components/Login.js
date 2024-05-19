/* Login.js
 * Last Edited: 3/26/24
 *
 * Login for students, instructors, admins,
 * to enter email and password, or reset password, or create account
 *
 * Known Bugs:
 * -
 */

import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Login() {
  // General Variables
  const { setUser } = useContext(UserContext);

  // Login Data Variables
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Webpage Navigate Variable
  const navigate = useNavigate();

  ////////////////////////////////////////////////////////
  //               Fetch Get Functions                  //
  ////////////////////////////////////////////////////////

  // called when attempting login into the website
  const login = async (userData) => {
    // validate if the user's email and password exist in the database
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include", // include the HTTP-only cookies
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        setLoginError(errorResponse.error);
      }

      // fetch profile information associated with user
      const profileResponse = await fetch("/profile", {
        credentials: "include", // include the HTTP-only cookies
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to retrieve user profile.");
      }

      const userProfile = await profileResponse.json();

      // set user based on user profile
      setUser(userProfile);
      localStorage.setItem("user", JSON.stringify(userProfile)); // Persist user in local storage
      navigate(`/${userProfile.account_type}`); // navigate to appropriate webpage view based on account type
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("An error occurred during login. Please try again.");
    }
  };

  ////////////////////////////////////////////////////////
  //                 Handler Functions                  //
  ////////////////////////////////////////////////////////

  // when user clicks submit, attempt to login user
  const handleSubmit = (e) => {
    // prevent submit event from happening if email, password, or both are invalid
    e.preventDefault();
    login({ email, password });
  };

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  return (
    // Define Login component
    <div className="flex flex-col m-auto w-1/4 p-5 border shadow-lg border-light-gray rounded-md mt-8">
      {/* Login header */}
      <h1 className="text-xl text-center pb-5">Login</h1>
      <form className="" onSubmit={handleSubmit}>
        {/* Email input field*/}
        <div className="flex flex-col pb-2">
          <label>Email</label>
          <input
            className="border-b"
            value={email}
            type="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password input field*/}
        <div className="flex flex-col">
          <label>Password</label>
          <input
            className="border-b"
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Forgot password label */}
          <div className="text-purple pb-5">Forgot password?</div>

          {/* Login button */}
          <button
            className="bg-purple text-white h-10 w-full hover:text-gold hover:bg-purple rounded-lg"
            type="submit"
          >
            Login
          </button>

          {/* Notify user of login error */}
          {loginError && (
            // Logo to indicate login error
            <p>
              <span role="img" aria-label="error-icon" style={{ color: "red" }}>
                ❌&nbsp;&nbsp;&nbsp;
              </span>
              {loginError}
            </p>
          )}

          {/* Link user to Register tab if they're not signed up to use Canvas Meetig Scheduler */}
          <strong className="p-5 text-center">OR</strong>
          <div className="p-1 text-center">
            New user?{" "}
            <Link to="/registerform">
              <span className="text-purple hover:text-gold underline">
                Create Account
              </span>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
