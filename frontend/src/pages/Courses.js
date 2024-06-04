/* Courses.js
 * Last Edited: 3/26/24
 *
 * Courses Tab for students's view of courses they're registered in,
 * details of each course, drop in times for all and specific courses,
 * upcoming, pending, and past appointments, as well as the option to
 * schedule new meetings
 *
 * Known Bugs:
 * -
 *
 */

import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../context/UserContext.js";
import ScheduleAppointmentPopup from "../components/ScheduleAppointmentPopup.js";
import AppointmentsTable from "../components/AppointmentsTable.js";
import CourseDetailsPopup from "../components/CourseDetailsPopup.js";
import DropinsTable from "../components/DropinsTable.js";
import { isnt_Student } from "../utils/CheckUserType.js";

export default function Courses() {
  // General Variables
  const { user } = useContext(UserContext);

  // Load Variables
  const [initialLoad, setInitialLoad] = useState(true);
  const [coursesFound, setCoursesFound] = useState(true);
  const [reloadAppointmentsTable, setReloadAppointmentsTable] = useState(false);
  const [
    isScheduleAppointmentPopUpVisible,
    setScheduleAppointmentPopUpVisible,
  ] = useState(false);
  const [isCourseDetailsPopupVisible, setCourseDetailsPopupVisible] =
    useState(false);

  // Course Data Variables
  const [selectedCourseId, setSelectedCourseId] = useState();
  const [selectedCourseName, setSelectedCourseName] = useState();
  const [allCoursesData, setAllCoursesData] = useState([]);
  const [courseData, setCourseData] = useState({});
  const [instructorData, setInstructorData] = useState({
    id: "",
    email: "",
    title: "",
    name: "",
    pronouns: "",
  });

  ////////////////////////////////////////////////////////
  //               Fetch Get Functions                  //
  ////////////////////////////////////////////////////////

  // fetch all courses the student is associated with from database
  const fetchAllStudentCourses = async () => {
    // user isn't a student
    if (isnt_Student(user)) return;

    try {
      const response = await fetch(`/user/courses`, {
        credentials: "include",
      });

      const fetchedData = await response.json();

      // set courses a student is enrolled in with fetched data
      if (fetchedData.length > 0) {
        setAllCoursesData(fetchedData);
      } else {
        setCoursesFound(false);
        alert("No courses found.");
      }
    } catch (error) {
      console.error("Error fetching all student courses:", error);
    }
  };

  // fetch instructor details from a user based on their ID
  const fetchInstructorDetails = async (instructorId) => {
    // user isn't a student
    if (isnt_Student(user)) return;

    try {
      const response = await fetch(
        `/user/profile/${encodeURIComponent(instructorId)}`,
        {
          credentials: "include",
        }
      );

      const fetchedInstructorDetails = await response.json();

      // set instructor data with fetched data
      setInstructorData(fetchedInstructorDetails);
    } catch (error) {
      console.error("Error fetching instructor details:", error);
    }
  };

  ////////////////////////////////////////////////////////
  //               Handler Functions                    //
  ////////////////////////////////////////////////////////

  // called when a student clicks on a Course Details button
  // show CourseDetailsPopup
  const handleButtonClick = (course) => {
    setCourseDetails(course.id);

    // QOL delay
    setTimeout(() => {
      setCourseDetailsPopupVisible(true);
    }, 10);
  };

  // called when student clicks to change selected course
  const handleCourseChange = (e) => {
    if (!e) {
      return;
    }

    // setSelectedCourseId
    setSelectedCourseId(parseInt(e.target.value));

    // find course
    const course = allCoursesData.find(
      (course) => course.id === parseInt(e.target.value)
    );

    // setSelectedCourseName
    if (course) {
      setSelectedCourseName(course.course_name);
    } else {
      setSelectedCourseName();
    }
  };

  // reload appointments table
  const reloadAppointments = () => {
    setReloadAppointmentsTable(true);
  };

  // update the course details being displayed on the webpage
  const setCourseDetails = (courseId) => {
    if (!courseId) {
      return;
    }

    // find course
    const selectedCourse = allCoursesData.find(
      (course) => course.id === courseId
    );

    // if course was found
    if (selectedCourse) {
      // setCourseData
      setCourseData(selectedCourse);

      // fetch instructor details from selected course
      fetchInstructorDetails(selectedCourse.instructor_id);
    }
  };

  ////////////////////////////////////////////////////////
  //               UseEffect Function                   //
  ////////////////////////////////////////////////////////

  // called only once
  // on initial page load, fetchCourseList()
  useEffect(() => {
    if (!initialLoad) {
      fetchAllStudentCourses();
    }
    setInitialLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoad, user]);

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  return (
    <div>
      {/* Container for Courses webpage */}
      <div className="flex flex-col m-auto relative justify-center items-center">
        {/* Displays Course Details buttons of all Courses a student is enrolled in currently */}
        <div className="flex flex-row w-2/3 p-5 m-auto justify-center">
          {allCoursesData.map((course) => (
            // Course Details Button
            <button
              key={course.id}
              className="m-2 p-2 border border-light-gray rounded-md shadow-md font-bold"
              onClick={() => handleButtonClick(course)}
            >
              {course.course_name}: Course Details
            </button>
          ))}
        </div>

        {/* Students can choose which Course they want to see Drop-Ins for */}
        <div className="flex w-2/3">
          {/* Course header */}
          <h1>
            <strong>Course:</strong>
          </h1>

          {/* Course Selection */}
          <select
            className="border border-light-gray rounded ml-2 hover:cursor-pointer"
            value={selectedCourseId}
            onChange={(e) => handleCourseChange(e)}
          >
            <option key={-1} value="">
              Select...
            </option>
            {allCoursesData.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_name}
              </option>
            ))}
          </select>
        </div>

        {/* Drop-Ins table when an instructor has set Drop-In Availabilities for their courses */}
        <div className="flex flex-col w-2/3 p-5 m-auto border border-light-gray rounded-md shadow-md mt-5">
          <DropinsTable
            courseId={selectedCourseId}
            courseName={selectedCourseName}
          />
        </div>

        {/* Appointments Table so a student can see Appointments they booked */}
        <div className="flex flex-col w-2/3 p-5 m-auto border border-light-gray rounded-md shadow-md mt-5">
          <AppointmentsTable
            courseId={selectedCourseId}
            reloadTable={reloadAppointmentsTable}
          />
        </div>

        {/* Schedule New Appointment Button students can interact with to schedule a new appointment for a Course */}
        <div className="flex flex-col w-1/6 p-2 m-auto border border-light-gray rounded-md shadow-md mt-5">
          {/* Schedule New Appointment Button */}
          <button
            className={`bg-purple p-2 rounded-md text-white ${coursesFound ? "hover:text-gold" : "opacity-50"
              }`}
            onClick={() =>
              setScheduleAppointmentPopUpVisible(
                !isScheduleAppointmentPopUpVisible
              )
            }
            disabled={!coursesFound}
          >
            Schedule New Appointment
          </button>
        </div>
      </div>

      {/* Call CourseDetailsPopup component if student clicks on a Course Details button */}
      {isCourseDetailsPopupVisible && (
        // Display the details of the chosen course
        <div className="fixed inset-0">
          <CourseDetailsPopup
            onClose={() => setCourseDetailsPopupVisible(false)}
            courseData={courseData}
            instructorData={instructorData}
          />
        </div>
      )}

      {/* Call ScheduleAppointmentPopup component if student clicks on the Schedule New Meeting button */}
      {isScheduleAppointmentPopUpVisible && (
        // Display ScheduleAppointmentPopup where student can schedule an appointment for a Program in a Course
        <div className="fixed inset-0">
          <ScheduleAppointmentPopup
            onClose={() => setScheduleAppointmentPopUpVisible(false)}
            functions={{ reloadAppointments: reloadAppointments }}
          />
        </div>
      )}

      {/* Empty Space at bottom of webpage */}
      <div className="p-10"></div>
    </div>
  );
}
