/* App.js
 * Last Edited: 3/11/24
 *
 * Mapping front-end routes for public, admin, student, and instructor view.
 *
 * Known Bugs:
 * -
 *
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Profile from './pages/Profile';
import { Routes, Route } from 'react-router-dom';
import LoginButton from './components/CanvasLogin';

function App() {
  const [courseId, setCourseId] = useState('');
  const [courseRole, setCourseRole] = useState('');
  const [favoriteCourses, setFavoriteCourse] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState([]);
  const [terms, setTerms] = useState([]);
  const [chosenTerm, setChosenTerm] = useState('');
  const [courseTermList, setCourseTermList] = useState([]);
  const [coursesInTerm, setCourseInTerm] = useState([]);
  const [allCourseDetails, setAllCourseDetails] = useState([]);
  const [name, setName] = useState([]);
  const [name1, setName1] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleChange = (event) => {
    const selectedCourse = event.target.value;
    setName(selectedCourse.name);
    setCourseId(selectedCourse.id);
    setCourseRole(selectedCourse.role);
  };

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
  };

  const handleTermChange = (event) => {
    var courseList = [];
    setChosenTerm(event.target.value);

    allCourseDetails.forEach((singleCourse) => {
      if (singleCourse.term === event.target.value) {
        var entity = {
          name: singleCourse.name,
          id: singleCourse.id,
          role: singleCourse.role,
        };
        courseList.push(entity);
      }
    });

    setCourseInTerm(courseList);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/courseFavorites')
        .then((res) => res.json())
        .then((data) => {
          setFavoriteCourse(data.courses);
        });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/getDistinctRoles')
        .then((res) => res.json())
        .then((data) => {
          setRoles(data);
        });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/getTerms')
        .then((res) => res.json())
        .then((data) => {
          var terms = [];
          setAllCourseDetails(data);
          data.forEach((singleCourseDetail) => {
            if (terms.indexOf(singleCourseDetail.term) === -1) terms.push(singleCourseDetail.term);
          });
          setTerms(terms);
        });
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <div className="content">
        <Home />
        {isLoggedIn ? (
          <Routes>
            <Route path="/courses" element={<Courses />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
