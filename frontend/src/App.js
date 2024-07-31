import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Profile from './pages/Profile';
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
      // Fetch roles
      fetch('/api/fetch-roles')
        .then(response => response.json())
        .then(data => setRoles(data.roles || []))
        .catch(error => console.error('Error fetching roles:', error));

      // Fetch courses and terms
      fetch('/api/fetch-courses-and-terms')
        .then(response => response.json())
        .then(data => {
          const courses = data.courses || [];
          const terms = data.terms || [];
          setAllCourseDetails(courses);
          setTerms(terms);
        })
        .catch(error => console.error('Error fetching courses and terms:', error));
    }
  }, [isLoggedIn]);

  const handleChange = (event) => {
    const selectedCourse = event.target.value;
    setName(selectedCourse.name);
    setCourseId(selectedCourse.id);
    setCourseRole(selectedCourse.role);
    setSelectedCourse(selectedCourse);
  };

  const handleTermChange = (event) => {
    const selectedTerm = event.target.value;
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
      />
      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/view-my-calendar" element={<CalendarView />} /> */}
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
