/* LoginSignup.js
 * Last Edited: 3/26/24
 *
 * Parent component of Login.js and Signup.js where instructor,
 * student, and admin can login to Canvas Meeting Scheduler or
 * user can sign up for Canvas Meeting Scheduler.
 *
 * Known bugs:
 * -
 *
 */

import React, { useState } from "react";
import Signup from "../components/Signup";
import Login from "../components/Login";

export default function LoginSignup() {
  // Form Data Variables
  const [currentForm] = useState("login");

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  // Conditional rendering of Login or Signup component based on currentForm value
  return <div>{currentForm === "login" ? <Login /> : <Signup />}</div>;
}
