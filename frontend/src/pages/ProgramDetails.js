/* ProgramDetails.js
 * Last Edited: 3/26/24
 *
 * Program Details tab for Instructor account_type.
 * Instructor can choose if they're creating, updating, or deleting
 * programs, availability, description,
 * appointment duration, location, and virtual meeting links
 * for a course or globally that applies to all courses.
 *
 * Known Bugs:
 * - if duration is over max size, then the warning message
 *   will show repeatedly until the duration is less than it
 * - course title sizing bug: border cuts off the last character sometimes
 * - When the physical_location or meeting_url changes and appointments have
 *   already been created for the program, the appointments physical_location
 *   and meeting_url do not update. Fix this by getting rid of these attributes
 *   in the Appointment Table and instead reference the ProgramDetails Table
 *   physical_location and meeting_url attributes.
 *
 */

import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../context/UserContext.js";
import { getCookie } from "../utils/GetCookie.js";
import { Tooltip } from "../components/Tooltip.js";
import WeeklyCalendar from "../components/WeeklyCalendar.js";
import ChooseAppointmentDatesPopup from "../components/ChooseAppointmentDatesPopup.js";
import ProgramLocation from "../components/ProgramLocation.js";
import CreateProgramPopup from "../components/CreateProgramPopup.js";
import CreateAppointmentBlock from "../components/CreateAppointmentBlock.js";
import AutoAcceptAppointments from "../components/AutoAcceptAppointments.js";
import CreateCoursePopup from "../components/CreateCoursePopup.js";
import CourseDetails from "../components/CourseDetails.js";
import { isnt_Instructor } from "../utils/CheckUserType.js";

export default function ProgramDetails() {
  // General Variables
  const csrfToken = getCookie("csrf_access_token");
  const { user } = useContext(UserContext);

  // Load Variables
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadProgramTimesTable, setLoadProgramTimesTable] = useState(true);
  const [isCourseSelected, setIsCourseSelected] = useState(true);
  const [isProgramSelected, setIsProgramSelected] = useState(false);
  const [locationChecker, setLocationChecker] = useState(false);
  const [newProgramId, setNewProgramId] = useState();
  const [postTimes, setPostTimes] = useState(false);

  // Layouts
  const [isAllCoursesSelected, setIsAllCoursesSelected] = useState(true);
  const [isDropinsLayout, setIsDropinsLayout] = useState(true);
  const [isRangedBasedLayout, setIsRangedBasedLayout] = useState(true);
  const [isCourseDetails, setIsCourseDetails] = useState(false);

  // Popup Load Variables
  const [
    isChooseAppointmentDatesPopUpVisible,
    setChooseAppointmentDatesPopUpVisible,
  ] = useState(false);
  const [isCreateAvailabilityPopUpVisible, setCreateAvailabilityPopUpVisible] =
    useState(false);
  const [isCreateCoursePopup, setCreateCoursePopup] = useState(false);
  const [isCreateProgramPopup, setCreateProgramPopup] = useState(false);
  const [showDurationDetails, setShowDurationDetails] = useState(false);
  const [showDurationInputField, setShowDurationInputField] = useState(false);

  // Course Data Variables
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [allCoursesData, setAllCoursesData] = useState([]);
  const [selectedCourseData, setSelectedCourseData] = useState({
    id: "",
    course_name: "",
    programs: [],
  });
  const [selectedProgramData, setSelectedProgramData] = useState({});

  // Times Data Variables
  const [allProgramTimesInCourse, setAllProgramTimesInCourse] = useState({});

  ////////////////////////////////////////////////////////
  //               Fetch Get Functions                  //
  ////////////////////////////////////////////////////////

  // fetch all courses the instructor is associated with
  const fetchAllInstructorCourses = async () => {
    // user isn't an instructor
    if (isnt_Instructor(user)) return;

    try {
      const response = await fetch(`/instructor/programs`, {
        credentials: "include",
      });

      const fetchedCourses = await response.json();

      setAllCoursesData(fetchedCourses);
    } catch (error) {
      console.error("Error fetching all instructor courses:", error);
    }
  };

  // fetch all times for a course
  const fetchTimesData = async (courseId) => {
    // no course selected or user isn't an instructor
    if (courseId <= -1 || isnt_Instructor(user)) {
      return;
    }

    try {
      const response = await fetch(
        `/course/programs/times/${encodeURIComponent(courseId)}`,
        {
          credentials: "include",
        }
      );

      const fetchedCourseTimes = await response.json();

      if (fetchedCourseTimes !== null) {
        // create a tempData object and loop through fetchedCourseTimes
        const tempData = fetchedCourseTimes.reduce((acc, item) => {
          const programId = item.program_id;

          // check if the programId exists in the accumulator object,
          // if it doesn't, initialize accumulator as an empty object with programId
          if (!acc[programId]) {
            acc[programId] = {};
          }

          // add start_time and end_time to the accumulator object based on the program id and day
          acc[programId][item.day] = {
            start_time: item.start_time,
            end_time: item.end_time,
          };

          return acc;
        }, {});

        // setAllProgramTimesInCourse
        setAllProgramTimesInCourse(tempData);
      } else {
        setAllProgramTimesInCourse({});
      }
    } catch (error) {
      console.error("Error fetching times:", error);
    }
  };

  ////////////////////////////////////////////////////////
  //               Fetch Post Functions                 //
  ////////////////////////////////////////////////////////

  // posts updated program data to the ProgramDetails table
  const postProgramToDatabase = async () => {
    // user isn't an instructor
    if (isnt_Instructor(user)) return;

    try {
      // Set default values for max_daily_meetings, max_weekly_meetings, and max_monthly_meetings if they are empty or null
      const setDefaultMeetingValue = (value) => {
        return value === "" || value === null ? 999 : value;
      };

      selectedProgramData.max_daily_meetings = setDefaultMeetingValue(
        selectedProgramData.max_daily_meetings
      );
      selectedProgramData.max_weekly_meetings = setDefaultMeetingValue(
        selectedProgramData.max_weekly_meetings
      );
      selectedProgramData.max_monthly_meetings = setDefaultMeetingValue(
        selectedProgramData.max_monthly_meetings
      );

      const payload = {
        data: selectedProgramData,
        course_id: selectedCourseId,
      };

      console.log("Payload:", payload);

      await fetch(`/program/details`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      fetchAllInstructorCourses();
    } catch (error) {
      console.error("Error saving program details:", error);
    }
  };

  // post the times for the program to ProgramTimes Table
  const postProgramTimes = async () => {
    // user isn't an instructor
    if (isnt_Instructor(user)) return;

    try {
      await fetch(
        `/course/programs/times/${encodeURIComponent(selectedProgramData.id)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken,
          },
          body: JSON.stringify(allProgramTimesInCourse),
        }
      );
    } catch (error) {
      console.error("Error saving course details:", error);
    }
  };

  // delete a program from the ProgramDetails Table and all related data
  const handleDeleteProgram = async () => {
    // user isn't an instructor
    if (isnt_Instructor(user)) return;

    // user boolean option popup
    if (window.confirm("Are your sure you want to delete this program?")) {
      try {
        const response = await fetch(`/program/delete/${selectedProgramId}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRF-TOKEN": csrfToken,
          },
        });

        if (response.ok) {
          alert("Program deleted successfully!");
          // reload webpage details and update variable data
          await handleCourseChange({ target: { value: selectedCourseId } });
          handleProgramChange({ target: { value: -1 } });
        } else {
          throw new Error("Failed to delete program");
        }
      } catch (error) {
        console.error("Error deleting program:", error);
      }
    }
  };

  ////////////////////////////////////////////////////////
  //                  Handler Functions                 //
  ////////////////////////////////////////////////////////

  // handles updating course and program variables on a course change
  const handleCourseChange = async (e) => {
    if (!e) {
      return;
    }

    const selectedCourse =
      e.target.value === null ? null : parseInt(e.target.value);

    // reload allCoursesData
    await fetchAllInstructorCourses();

    // setSelectedCourseId
    setSelectedCourseId(selectedCourse);

    // update course info displayed on page to selectedCourse
    updateCourseInfo(selectedCourse);

    // set program to default state
    setSelectedProgramId(-1);
    updateProgramInfo(-1);

    // update allProgramTimesInCourse to selectedCourse
    fetchTimesData(selectedCourse);
  };

  // handles updating program variables on a course change
  const handleProgramChange = (e) => {
    if (!e) {
      return;
    }

    const selectedProgram =
      e.target.value === null ? null : parseInt(e.target.value);

    // check if the CourseDetails option has been selected
    if (selectedProgram === -2) {
      setIsCourseDetails(true);
    } else {
      setIsCourseDetails(false);
    }

    // setSelectedProgramId to selectedProgram
    setSelectedProgramId(selectedProgram);

    // update programinfo displayed on page to selectedProgram
    updateProgramInfo(selectedProgram);

    // reload program times table
    setLoadProgramTimesTable(true);
  };

  // update the selectedCourseData to a new course
  const updateCourseInfo = async (courseId) => {
    // no course selected
    if (courseId === -1) {
      setSelectedCourseData({
        id: "",
        course_name: "",
        programs: [],
      });
      return;
    }

    // find course in allCoursesData
    const selectedCourse = allCoursesData.find(
      (course) => course.id === courseId
    );

    // if found
    if (selectedCourse) {
      // setSelectedCourseData to selectedCourse
      setSelectedCourseData(selectedCourse);
    }

    // no found
    else {
      setSelectedCourseData({
        id: "",
        course_name: "",
        programs: [],
      });
    }
  };

  // update the selectedProgramData based on a programId
  const updateProgramInfo = (programId) => {
    // no program selected
    if (!programId || programId === -1) {
      setSelectedProgramData({});
      setShowDurationInputField(false);
      return;
    }

    // find course in allCoursesData
    const selectedCourse = allCoursesData.find(
      (course) => course.id === selectedCourseId
    );

    // find program in selectedCourse
    const selectedProgram = selectedCourse.programs.find(
      (program) => program.id === programId
    );

    // if program found
    if (selectedProgram) {
      // Update selectedProgramData with selectedProgram.id
      if (!selectedProgram.duration) {
        selectedProgram.duration = "";
      }

      setSelectedProgramData(selectedProgram);

      if (!selectedProgram.duration || selectedProgram.duration === "") {
        setShowDurationInputField(false);
      }
    }
  };

  // update courseData with instructor input
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // exit if invalid char for duration
    if (!e || (name === "duration" && value.includes("a"))) {
      return;
    }

    // if name is duration check the duration provided by instructor
    if (name === "duration") {
      if (Number(value) > 0) {
        let maxRecommendedDuration = 1440;

        // iterate through allProgramTimesInCourse[selectedProgramId]
        for (const data of Object.entries(
          allProgramTimesInCourse[selectedProgramId]
        )) {
          const startDate = new Date(`1970-01-01T${data[1].start_time}`);
          const endDate = new Date(`1970-01-01T${data[1].end_time}`);

          // calculate timeDifference into minutes
          const timeDifference = endDate - startDate;
          const minutes = Math.floor(timeDifference / (1000 * 60));

          // if maxRecommendedDuration larger than minutes, set maxRecommendedDuration to minutes
          if (minutes < maxRecommendedDuration) {
            maxRecommendedDuration = minutes;
          }
        }

        // inform instructor that duration is too long
        if (value > maxRecommendedDuration) {
          setTimeout(() => {
            window.alert("Duration value is too large. Lower your duration");
          }, 10);
        }
      }
    }

    let newValue = value;

    // Handle the radio button specifically
    if (e.target.type === "radio") {
      newValue = value === "true"; // Convert the value to boolean
    }

    // setSelectedProgramData
    setSelectedProgramData({
      ...selectedProgramData,
      [name]: newValue,
    });
  };

  // update timesData based on instructor entries
  const handleTimesChange = (e) => {
    if (!e) {
      return;
    }

    const tempDay = e.name;
    const tempValue = e.value;

    // set updatedTimesData initially to times for the selected program
    let updatedTimesData = { ...allProgramTimesInCourse[selectedProgramId] };

    // if no days in object
    if (tempValue.length === 0) {
      // delete the day
      if (updatedTimesData[tempDay]) {
        delete updatedTimesData[tempDay];
      }
    }
    // if days in object
    else {
      // override its values
      updatedTimesData = {
        ...updatedTimesData,
        [tempDay]: {
          start_time: tempValue[0],
          end_time: tempValue[1],
        },
      };
    }

    // setAllProgramTimesInCourse
    setAllProgramTimesInCourse({
      ...allProgramTimesInCourse,
      [selectedProgramId]: updatedTimesData,
    });

    // post the times to the ProgramTimes Table
    setPostTimes(true);
  };

  // check program name and post to database if valid
  const handleSaveChanges = async () => {
    if (Object.entries(selectedProgramData).length > 0) {
      // check if program name is valid
      if (
        selectedProgramData.name === "" ||
        selectedProgramData.name === "Course Details" ||
        !selectedProgramData.name
      ) {
        alert("Program Name must be changed.");
        return;
      }

      // post program details to ProgramDetails Table
      postProgramToDatabase();
    }
  };

  // select new program and reload allCoursesData
  const loadNewProgram = (programId) => {
    setNewProgramId(programId);
    fetchAllInstructorCourses();
  };

  // setShowDurationInputField when instructor clicks on checkbox
  const showBox = () => {
    if (showDurationInputField) {
      // reset input field value
      handleInputChange({ target: { name: "duration", value: "" } });
      setShowDurationInputField(false);
    } else {
      setShowDurationInputField(true);
    }
  };

  // change course to correct value and set program to default on tab select
  const tabSelect = (isTrue) => {
    setIsAllCoursesSelected(isTrue);
    if (isTrue) {
      handleCourseChange({ target: { value: null } }); // null associated with all course programs having global type
    } else {
      handleCourseChange({ target: { value: -1 } }); // default value for single course programs: no course selected
    }
    handleProgramChange({ target: { value: -1 } }); // no program selected
  };

  ////////////////////////////////////////////////////////
  //               UseEffects Functions                 //
  ////////////////////////////////////////////////////////

  // on initial page load, select all course programs tab
  useEffect(() => {
    if (!initialLoad) {
      tabSelect(true);
    }
    setInitialLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoad, user]);

  // post to times to ProgramTimes Table when changes are made
  useEffect(() => {
    if (postTimes) {
      postProgramTimes();
      setPostTimes(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postTimes]);

  // reload the WeeklyCalendar data when allProgramTimesInCourse updates
  useEffect(() => {
    setLoadProgramTimesTable(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProgramTimesInCourse]);

  // update courseInfo when any course data is changed
  useEffect(() => {
    const fetchDataAndUpdate = async () => {
      // course is selected
      if (selectedCourseId !== -1) {
        await updateCourseInfo(selectedCourseId);

        // select the new program if it exists and reset temp programId variable
        if (newProgramId) {
          handleProgramChange({ target: { value: newProgramId } });
          setNewProgramId();
        }

        setIsCourseSelected(true);
      }
      // no course selected
      else {
        setIsCourseSelected(false);
      }
    };

    // call async function
    fetchDataAndUpdate();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, allCoursesData]);

  // update isProgramSelected when selectedProgramId is updated
  useEffect(() => {
    if (selectedProgramId && selectedProgramId !== -1) {
      setIsProgramSelected(true); // if, programid valid set to true
    } else {
      setIsProgramSelected(false);
    }
  }, [selectedProgramId]);

  // - update showDurationInputField if duration is greater than 0
  // - update setIsDropinsLayout when selectedProgramData updates
  // - update setLocationChecker when selectedProgramData physical location or virtual link is
  useEffect(() => {
    // check if duration is greater than 0 to show the box
    const isDurationValid = Number(selectedProgramData.duration) > 0;
    setShowDurationInputField(isDurationValid);

    // check and set isDropinsLayout
    const isDropinsLayoutValid =
      selectedProgramData.isDropins !== "" && !selectedProgramData.isDropins;
    setIsDropinsLayout(!isDropinsLayoutValid);

    // check and set isRangedBasedLayout
    const isRangedBasedLayoutValid =
      selectedProgramData.isRangeBased !== "" &&
      !selectedProgramData.isRangeBased;
    setIsRangedBasedLayout(!isRangedBasedLayoutValid);

    // check if physical_location or meeting_url is valid and set locationChecker
    const isLocationValid =
      (selectedProgramData.physical_location &&
        selectedProgramData.physical_location !== "") ||
      (selectedProgramData.meeting_url &&
        selectedProgramData.meeting_url !== "");
    setLocationChecker(isLocationValid);
  }, [
    selectedProgramData.duration,
    selectedProgramData.isDropins,
    selectedProgramData.isRangeBased,
    selectedProgramData.physical_location,
    selectedProgramData.meeting_url,
  ]);

  // post a null duration to database when duration box is unchecked
  useEffect(() => {
    if (!showDurationInputField && selectedProgramId) {
      handleSaveChanges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDurationInputField]);

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  if (!user) {
    return <div>Loading user data...</div>;
  }

  // HTML for webpage
  return (
    // Container for the Program Details webpage
    <div>
      <div className="flex flex-col m-auto">
        <div className="flex w-full cursor-pointer justify-center">
          {/* Left Half of Course Program Bar where instructor can select All Course Programs */}
          <div
            className={`w-1/2 text-center text-white text-lg font-bold p-1 border-2 hover:border-green ${isAllCoursesSelected
                ? "bg-gold border-gold"
                : "bg-metallic-gold border-metallic-gold"
              }`}
            onClick={() => {
              if (!isAllCoursesSelected) {
                tabSelect(true);
              }
            }}
          >
            All Course Programs
          </div>

          {/* Right Half of Course Program Bar where instructor can select Single Course Programs */}
          <div
            className={`w-1/2 text-center text-white text-lg font-bold p-1 border-2 ${isAllCoursesSelected
                ? "bg-metallic-gold border-metallic-gold hover:border-green"
                : "bg-gold border-gold hover:border-green"
              }`}
            onClick={() => {
              if (isAllCoursesSelected) {
                tabSelect(false);
              }
            }}
          >
            Single Course Programs
          </div>
        </div>

        {/* Container for UI elements below Course Program Bar */}
        <div className="w-3/4 p-5 m-auto">
          <div className="flex justify-between">
            <div className="ml-10">
              {/* Render Courses Selection and Create Course button if Single Course Programs chosen */}
              {!isAllCoursesSelected && (
                // UI guide for instructor to select or create a Course
                <div
                  className={`flex ${!isCourseSelected
                      ? "animate-blink flex border-4 border-white p-4 rounded-3xl"
                      : "p-5"
                    }`}
                >
                  {/* Course header */}
                  <h1>
                    <strong>Course:</strong>
                  </h1>

                  {/* Course selection */}
                  <select
                    className="border border-light-gray rounded ml-2 hover:bg-gray hover:cursor-pointer"
                    id="course-dropdown"
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e)}
                  >
                    <option className="bg-white" key={-1} value={-1}>
                      Select...
                    </option>
                    {allCoursesData.map(
                      (course) =>
                        course.id && (
                          <option
                            className="bg-white"
                            key={course.id}
                            value={course.id}
                          >
                            {course.course_name}
                          </option>
                        )
                    )}
                  </select>

                  {/* Create Course button */}
                  <button
                    className={`font-bold border border-light-gray rounded-md shadow-md text-sm px-1 py-1 ml-4 hover:bg-gray`}
                    onClick={() => setCreateCoursePopup(!isCreateCoursePopup)}
                  >
                    Create Course
                  </button>
                </div>
              )}
            </div>

            {/* UI guide for instructor to select or create a Course */}
            <div
              className={`flex items-center mr-10 ${isCourseSelected && !isProgramSelected
                  ? "animate-blink border-4 border-white p-4 rounded-3xl"
                  : "p-5"
                }`}
            >
              {/* Program header */}
              <h1>
                <strong>Program:</strong>
              </h1>

              {/* Program selection */}
              <select
                className="border border-light-gray rounded ml-2 hover:bg-gray hover:cursor-pointer"
                value={selectedProgramId}
                onChange={(e) => handleProgramChange(e)}
                disabled={!isCourseSelected}
              >
                <option className="bg-white" key="" value="">
                  Select...
                </option>

                {/* Show default Course Details as option for each Course in Single Course Programs */}
                {!isAllCoursesSelected && (
                  <option className="bg-white" key={-2} value={-2}>
                    Course Details
                  </option>
                )}

                {selectedCourseData.programs.map((program) => (
                  <option
                    className="bg-white"
                    key={program.id}
                    value={program.id}
                  >
                    {program.name}
                  </option>
                ))}
              </select>

              {/* Create Program button for instructors to create new Programs */}
              <button
                className={`font-bold border border-light-gray rounded-md shadow-md text-sm px-1 py-1 ml-4 hover:bg-gray ${!isCourseSelected ? "opacity-50" : ""
                  }`}
                onClick={() => setCreateProgramPopup(!isCreateProgramPopup)}
                disabled={!isCourseSelected}
              >
                Create Program
              </button>

              {/* Tooltip to aid instructors in viewing Office Hours and Course Details Programs*/}
              <Tooltip
                text={`For Office Hours programs, please use the title "Office Hours". To view your Courses' details, select the "Course Details" program.`}
                flip={true}
              >
                <span>ⓘ</span>
              </Tooltip>
            </div>
          </div>
        </div>

        {isCourseSelected ? (
          <>
            {isProgramSelected ? (
              <>
                {/* Call Course Details component if instructor selects Course Details as Program */}
                {isCourseDetails ? (
                  <CourseDetails courseId={selectedCourseId} />
                ) : (
                  <>
                    {/* Display if Program is Drop-Ins or Appointment and Range Based or Specific Dates */}
                    <div className="flex justify-center items-center">
                      {/* Drop-Ins or Appointment button */}
                      <button
                        className="w-12% font-bold border border-light-gray bg-gray rounded-md shadow-md px-1 py-1 mb-2 mr-1"
                        disabled
                      >
                        {isDropinsLayout ? "Drop-Ins" : "Appointment Based"}
                      </button>

                      {/* Range Based or Specific Dates button */}
                      <button
                        className="w-12% font-bold border border-light-gray bg-gray rounded-md shadow-md px-1 py-1 mb-2 ml-1"
                        disabled
                      >
                        {isRangedBasedLayout ? "Range Based" : "Specific Dates"}
                      </button>
                    </div>

                    {/* Container for UI elements below the Drop-Ins or Appointment and Range Based or Specific Dates buttons */}
                    <div className="flex flex-col w-3/4 px-5 m-auto">
                      <div className="py-5 border border-light-gray rounded-md shadow-md">
                        {/* Auto Generate Details button */}
                        <div className="relative">
                          <button
                            className={`font-bold border border-light-gray rounded-md shadow-md text-sm px-3 py-3 absolute inset-y-10 left-0 flex justify-center items-center ml-6 hover:bg-gray z-10`}
                          >
                            Auto Generate Details
                          </button>

                          {/* Delete Program button */}
                          <button
                            className={`font-bold border border-light-gray rounded-md shadow-md text-sm px-3 py-3 absolute inset-y-10 right-0 flex justify-center items-center mr-6 hover:bg-gray z-10`}
                            onClick={handleDeleteProgram}
                          >
                            Delete Program
                          </button>
                        </div>

                        {/* Container for Program Name and Tooltip UI element */}
                        <div className="pb-10 flex justify-center relative">
                          {/* Display Course name and allow for it to change with input field */}
                          <input
                            className="text-center font-bold text-2xl px-2"
                            style={{
                              width: `${selectedProgramData.name
                                  ? selectedProgramData.name.length * 18
                                  : ""
                                }px`,
                            }}
                            name="name"
                            value={selectedProgramData.name}
                            onChange={handleInputChange}
                            onBlur={handleSaveChanges}
                          />

                          {/* Tooltip to aid instructors in viewing and editing the selected Program Name*/}
                          <Tooltip
                            text="Click Program Name To Change Value."
                            position="top"
                          >
                            <span className="absolute transform">ⓘ</span>
                          </Tooltip>
                        </div>

                        {/* Container for UI elements Program Description and below */}
                        <div className="flex flex-col">
                          <div className="w-3/4 m-auto">
                            <div className="flex flex-col p-5 border border-light-gray rounded-md shadow-md mt-5">
                              <div>
                                {/* Program Description label */}
                                <label className="font-bold">
                                  Program Description &nbsp;
                                </label>

                                {/* Tooltip to aid instructors in viewing and editing the selected Program description */}
                                <Tooltip text="Description of the program related to meetings for a course.">
                                  <span>ⓘ</span>
                                </Tooltip>
                              </div>

                              {/* Text area for instructors to enter program description */}
                              <textarea
                                className="border border-light-gray mt-3 hover:bg-gray"
                                name="description"
                                value={selectedProgramData.description || ""}
                                onChange={(event) => handleInputChange(event)}
                                onBlur={handleSaveChanges}
                              />
                            </div>

                            {/* Call ProgramLocation component for instructors to enter physical location and virtual meeting link */}
                            <ProgramLocation
                              isCourseInfoProgram={false}
                              functions={{
                                inputChangeFunction: handleInputChange,
                                saveChangeFunction: handleSaveChanges,
                              }}
                              data={selectedProgramData}
                            />

                            {/* Call AutoAcceptAppointments component if Program is Appointment based */}
                            {!isDropinsLayout && (
                              // Instructors can choose to AutoAcceptAppointments and set Appointment limits
                              <AutoAcceptAppointments
                                functions={{
                                  setSelectedProgramData:
                                    setSelectedProgramData,
                                  handleInputChange: handleInputChange,
                                  saveChangeFunction: handleSaveChanges,
                                }}
                                userInstance={user}
                                data={selectedProgramData}
                              />
                            )}

                            {/* Inform instructor to enter a location or virtual meeting link if both aren't entered*/}
                            {!locationChecker ? (
                              <div className="flex flex-row p-5 m-auto mt-5 justify-center">
                                <label className="font-bold text-xl">
                                  *Enter A Location And/Or Virtual Meeting Link
                                  To Create Times*
                                </label>
                              </div>
                            ) : (
                              // If Drop-Ins or Appointments for specific Dates, render Create Appointment Block button
                              !isRangedBasedLayout && (
                                // Create Appointment Block button
                                <button
                                  className="flex flex-row p-5 m-auto mt-5 justify-center font-bold border border-light-gray rounded-md shadow-md text-xl px-5 py-3 hover:bg-gray"
                                  onClick={() =>
                                    setCreateAvailabilityPopUpVisible(
                                      !isCreateAvailabilityPopUpVisible
                                    )
                                  }
                                >
                                  Create Appointment Block
                                </button>
                              )
                            )}

                            {/* Display Weekly Calendar once location is entered */}
                            {locationChecker === true &&
                              (isRangedBasedLayout ? (
                                <>
                                  {/* Call WeeklyCalendar component where instructors can enter Program Times */}
                                  <div className="flex-1 flex-col p-5 border border-light-gray rounded-md shadow-md mt-5">
                                    <WeeklyCalendar
                                      functions={{
                                        timesChangeFunction: handleTimesChange,
                                        loadPageFunction:
                                          setLoadProgramTimesTable,
                                        setShowDuration: setShowDurationDetails,
                                        saveChangeFunction: handleSaveChanges,
                                      }}
                                      times={
                                        allProgramTimesInCourse[
                                        selectedProgramId
                                        ]
                                      }
                                      loadPage={loadProgramTimesTable}
                                      program_id={selectedProgramData.id}
                                    />
                                  </div>

                                  {/* Display Duration element for instructor to use if Appointment or Drop-In has duration */}
                                  {showDurationDetails && (
                                    <div className="flex flex-row items-center mt-4 p-5 border border-light-gray rounded-md shadow-md mt-5">
                                      {/* Define Appointment Duration? label */}
                                      <label className="whitespace-nowrap font-bold text-2xl">
                                        Define Appointment Duration?
                                      </label>

                                      {/* Appointment duration checkbox */}
                                      <input
                                        type="checkbox"
                                        class="form-checkbox h-6 w-7 text-blue-600 ml-2 mt-1 hover:cursor-pointer"
                                        checked={showDurationInputField}
                                        onChange={showBox}
                                      ></input>

                                      {/* Display Duration input field if instructor wants to add duration */}
                                      {showDurationInputField && (
                                        <div className="flex items-end">
                                          {/* Appointment duration input field */}
                                          <input
                                            className="border border-light-gray ml-3 mt-1 w-20 hover:bg-gray"
                                            name="duration"
                                            value={selectedProgramData.duration}
                                            onChange={(event) => {
                                              const inputValue =
                                                event.target.value;
                                              const numericValue =
                                                inputValue.replace(
                                                  /[^0-9]/g, // Remove non-numeric characters
                                                  "a"
                                                );
                                              handleInputChange({
                                                target: {
                                                  name: "duration",
                                                  value: numericValue,
                                                },
                                              });
                                            }}
                                            onBlur={handleSaveChanges}
                                          />

                                          {/* Minutes label once instructor clicks on checkbox to enter duration */}
                                          <label className="whitespace-nowrap font-bold text-sm ml-1">
                                            minutes
                                          </label>
                                        </div>
                                      )}

                                      {/* Choose Appointment Dates button for instructor to make availability based on date */}
                                      <button
                                        className={`ms-auto font-bold border border-light-gray rounded-md shadow-md text-sm px-2 py-2 hover:bg-gray`}
                                        onClick={() =>
                                          setChooseAppointmentDatesPopUpVisible(
                                            !isChooseAppointmentDatesPopUpVisible
                                          )
                                        }
                                      >
                                        Choose Appointment Dates
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                // Call CreateAppointmentBlockPopup component if instructor clicks on the Create Appointment Block button
                                isCreateAvailabilityPopUpVisible && (
                                  <div className="fixed inset-0 z-10">
                                    {/* Display CreateAppointmentBlockPopup where instructor can create time-blocks 
                                        for an Appointment or Drop-In based Program */}
                                    <CreateAppointmentBlock
                                      id={selectedCourseId}
                                      program_id={selectedProgramData.id}
                                      program_name={selectedProgramData.name}
                                      duration={selectedProgramData.duration}
                                      physical_location={
                                        selectedProgramData.physical_location
                                      }
                                      meeting_url={
                                        selectedProgramData.meeting_url
                                      }
                                      isDropins={selectedProgramData.isDropins}
                                      onClose={() =>
                                        setCreateAvailabilityPopUpVisible(false)
                                      }
                                    />
                                  </div>
                                )
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              // Inform instructor to select a Program to view its details
              <div className="m-auto mt-40 py-10 px-16 border border-light-gray rounded-3xl shadow-md">
                <label className="font-bold text-3xl">
                  Please Select A Program
                </label>
              </div>
            )}
          </>
        ) : (
          // Inform instructor to select a course to view Programs and their details
          <div className="m-auto mt-40 py-10 px-16 border border-light-gray rounded-3xl shadow-md">
            <label className="font-bold text-3xl">Please Select A Course</label>
          </div>
        )}
      </div>

      {/* Call ChooseAppointmentDatesPopup component if instructor clicks on the Choose Appointment Dates button */}
      {isChooseAppointmentDatesPopUpVisible && (
        // Display ChooseAppointmentDatesPopup where instructor can choose dates of Availability for an Appointment or Drop-In
        <div className="fixed inset-0 z-10">
          <ChooseAppointmentDatesPopup
            onClose={() => setChooseAppointmentDatesPopUpVisible(false)}
            data={allProgramTimesInCourse[selectedProgramId]}
            id={selectedCourseId}
            duration={selectedProgramData.duration}
            physical_location={selectedProgramData.physical_location}
            meeting_url={selectedProgramData.meeting_url}
            program_id={selectedProgramId}
            program_name={selectedProgramData.name}
            isDropins={selectedProgramData.isDropins}
          />
        </div>
      )}

      {/* Call CreateCoursePopup component if instructor clicks on the Create Course button */}
      {isCreateCoursePopup && (
        // Display CreateCoursePopup where instructor can create a Course
        <div className="fixed inset-0 z-10">
          <CreateCoursePopup
            onClose={() => setCreateCoursePopup(false)}
            user_id={user.id}
            loadFunction={fetchAllInstructorCourses}
          />
        </div>
      )}

      {/* Call CreateProgramPopup component if instructor clicks on the Create Program button */}
      {isCreateProgramPopup && (
        // Display CreateProgramPopup where instructor can create a Program for a Course
        <div className="fixed inset-0 z-10">
          <CreateProgramPopup
            onClose={() => setCreateProgramPopup(false)}
            courseId={selectedCourseId}
            loadFunction={loadNewProgram}
          />
        </div>
      )}

      {/* Empty Space at bottom of webpage */}
      <div className="p-10"></div>
    </div>
  );
}
