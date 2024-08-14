/* App.js
 * Last Edited: 8/14/24
 *
 * Renders different pages based on user interactions and selected data
 *
 * Known Bugs:
 * -
 *
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Availability from './components/Availability';
import { Routes, Route } from 'react-router-dom';

function App() {
  const [courseId, setCourseId] = useState('');
  const [courseRole, setCourseRole] = useState('');
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState([]);
  const [terms, setTerms] = useState([]);
  const [chosenTerm, setChosenTerm] = useState('');
  const [courseTermList, setCourseTermList] = useState([]);
  const [coursesInTerm, setCoursesInTerm] = useState([]);
  const [allCourseDetails, setAllCourseDetails] = useState([]);
  const [name, setName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      // Fetch courses and terms
      fetch('/api/fetch-courses-and-terms')
        .then(response => response.json())
        .then(data => {
          const courses = data.courses || [];
          const terms = data.terms || [];
          setAllCourseDetails(courses);
          console.log('All courses:', courses);
          setTerms(terms);

          // // Automatically select the current term
          // const currentTerm = getCurrentTerm(terms);
          // console.log('Current term:', currentTerm);
          // if (currentTerm) {
          //   setChosenTerm(currentTerm.id);
          //   setSelectedTerm(currentTerm.id);
          //   const coursesInSelectedTerm = courses.filter(course => course.term && course.term.id === currentTerm.id);
          //   setCoursesInTerm(coursesInSelectedTerm);
          // }
        })
        .catch(error => console.error('Error fetching courses and terms:', error));
    }
  }, [isLoggedIn]);

  // const getCurrentTerm = (terms) => {
  //   const currentDate = new Date();
  //   return terms.find(term => {
  //     const startDate = new Date(term.start_at);
  //     const endDate = new Date(term.end_at);
  //     return currentDate >= startDate && currentDate <= endDate;
  //   });
  // };

  const handleChange = async (event) => {
    const selectedCourse = event.target.value;
    console.log("selectedCourse", selectedCourse);
    setName(selectedCourse.name);
    setCourseId(selectedCourse.id);
    setCourseRole(selectedCourse.role);
    setSelectedCourse(selectedCourse);
    try {
      console.log("Trying to fetch the course role");
      const response = await fetch('/api/fetch-course-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ course_id: selectedCourse }),
      });

      if (response.ok) {
        const result = await response.json();
        setCourseRole(result.role);
        console.log("Course role fetched successfully");
      } else {
        console.error("Failed to fetch course role");
      }
    } catch (error) {
      console.error("Error fetching course role:", error);
    }
  };

  const handleTermChange = (event) => {
    const selectedTerm = event.target.value;
    console.log('Selected term:', selectedTerm);
    setChosenTerm(selectedTerm);
    const coursesInSelectedTerm = allCourseDetails.filter(course => course.term && course.term.id === selectedTerm);
    setCoursesInTerm(coursesInSelectedTerm);
    setSelectedTerm(selectedTerm);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div>
      <Navbar
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        roles={roles}
        courses={allCourseDetails}
        terms={terms}
        handleChange={handleChange}
        handleTermChange={handleTermChange}
        selectedCourse={selectedCourse}
        selectedTerm={selectedTerm}
        coursesInTerm={coursesInTerm}
      />
      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
