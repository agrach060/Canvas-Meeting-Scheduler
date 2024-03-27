/* AppointmentsTable.js
 * Last Edited: 3/26/24
 *
 * Table UI to show appointment history for Students and Instructors.
 * Students and Instructors can sort, edit, and cancel appointments.
 * Students and Instructors can view appointment details and Instructors
 * can edit appointment details.
 *
 * Known bugs:
 * - frontend and backend cancel functions haven't been thoroughly tested for bugs
 * - configure feedback features to work with onBlur like the rest of the project(no save/cancel buttons)
 * - appoinment details should be converted into a popup
 * - feedback form should be converted into a popup too
 * - implement handleProvideFeedback
 *
 */

import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext.js";
import {
  formatTime,
  formatDate,
  getDayFromDate,
  capitalizeFirstLetter,
} from "../utils/FormatDatetime.js";
import { getCookie } from "../utils/GetCookie.js";
import { Tooltip } from "./Tooltip.js";
import Comment from "./Comment.js";
import { isnt_Student_Or_Instructor } from "../utils/checkUser.js";

export default function AppointmentsTable({ courseId, reloadTable }) {
  // General Variables
  const { user } = useContext(UserContext);
  const csrfToken = getCookie("csrf_access_token");

  // Load Variables
  const [initialLoad, setInitialLoad] = useState(true);

  // Appointment Table Variables
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showTable, setShowTable] = useState(true);
  const [sortedBy, sortBy] = useState("Name");
  const [hoveringDateOrTime, setHoveringDateOrTime] = useState(false);

  // Appointment Data Variables
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [programDetails, setProgramDetails] = useState({}); // [type: string]: string
  const [feedbackPresent, setFeedbackPresent] = useState(false);
  const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({
    notes: "",
    meeting_url: "",
  });
  const [feedbackData, setFeedbackData] = useState({
    satisfaction: "",
    additional_comments: "",
  });

  ////////////////////////////////////////////////////////
  //               Fetch Get Functions                  //
  ////////////////////////////////////////////////////////

  // fetch the appointments for upcoming, pending, past tabs
  const fetchAppointments = async () => {
    // If there's no user or course, return
    if (isnt_Student_Or_Instructor(user) || courseId === "") return;

    const apiEndpoint =
      user.account_type === "instructor"
        ? `/instructor/appointments`
        : `/student/appointments`;

    try {
      const response = await fetch(`${apiEndpoint}?type=${activeTab}`, {
        credentials: "include",
      });

      const fetchedData = await response.json();

      const key =
        user.account_type === "instructor"
          ? "instructor_appointments"
          : "student_appointments";

      // sort the appointments by date and time
      const sortedData = (fetchedData[key] || []).sort((a, b) => {
        const dateComparison = new Date(a.date) - new Date(b.date);
        if (dateComparison === 0) {
          return (
            new Date(`${a.date}T${a.start_time}`) -
            new Date(`${b.date}T${b.start_time}`)
          );
        }
        return dateComparison;
      });

      // set data to sorted data
      setAppointments(sortedData);
    } catch (error) {
      console.error("Error fetching appointment data for user:", error);
    }
  };

  // fetch program details for all programs
  const fetchProgramDetails = async () => {
    // If there's no user or courseId, return
    if (isnt_Student_Or_Instructor(user) || courseId === "") return;

    const apiEndpoint =
      user.account_type === "instructor"
        ? `/instructor/programs/descriptions`
        : `/student/programs/descriptions`;

    try {
      const response = await fetch(apiEndpoint, {
        credentials: "include",
      });

      const fetchedData = await response.json();

      // store programs as objects with id, name, and description
      if (fetchedData.length > 0) {
        const programDetails = fetchedData.map((program) => ({
          id: program.id,
          name: program.name,
          description: program.description,
        }));

        // setProgramDetails
        setProgramDetails(programDetails);
      }
    } catch (error) {
      console.error("Error fetching program descriptions:", error);
    }
  };

  // fetch feedback associated with appointment id
  const fetchFeedback = async () => {
    // If there's no user, return
    if (!selectedAppointment || isnt_Student_Or_Instructor(user)) return;

    try {
      const response = await fetch(
        `/feedback/${selectedAppointment.appointment_id}`,
        {
          credentials: "include",
        }
      );
      const apiData = await response.json();

      let feedbackExists = false;
      // if the account type is student, store the student rating or notes in to feedbackExists
      if (user.account_type === "student") {
        feedbackExists = apiData.attendee_rating || apiData.attendee_notes;
      } else if (user.account_type === "instructor") {
        // else if the account type is instructor, store the instructor rating or notes in to feedbackExists
        feedbackExists = apiData.host_rating || apiData.instructor_notes;
      }

      // setFeedbackPresent to feedbackExists
      setFeedbackPresent(feedbackExists);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  ////////////////////////////////////////////////////////
  //               Fetch Post Functions                 //
  ////////////////////////////////////////////////////////

  // posts appointment notes and/or appointment url to the Appointment table
  const handleSaveChanges = async () => {
    // If there's no user or selectedAppointment, return
    if (!selectedAppointment || isnt_Student_Or_Instructor(user)) return;

    const appendAppointmentId = {
      ...formData,
      appointment_id: selectedAppointment.appointment_id,
    };

    try {
      const response = await fetch(`/appointment/update`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(appendAppointmentId),
      });

      if (response.ok) {
        // update the selected appointment with the new formData
        setSelectedAppointment({ ...selectedAppointment, ...formData });
        fetchAppointments(); // re-fetch appointments
      } else {
        throw new Error("Failed to update the appointment");
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
    }
  };

  // called when the instructor Approve Appointment, Attended, Missing button
  // posts new status of appointment to the Appointment table
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    // If there's no user, return
    if (isnt_Student_Or_Instructor(user)) {
      return;
    }

    const payload = {
      appointment_id: appointmentId,
      status: newStatus,
    };

    try {
      const response = await fetch(`/appointment/update/status`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // update the selected appointment status
        setSelectedAppointment({ ...selectedAppointment, status: newStatus });
        alert("Appointment status updated successfully!");
        fetchAppointments(); // re-fetch appointments
      } else {
        throw new Error("Failed to update the appointment status");
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
    }
  };

  // called on save changes
  // posts feedback data to Feedback Table
  const handleProvideFeedback = async (event) => {
    // If there's no user, return
    if (isnt_Student_Or_Instructor(user)) {
      return;
    }

    event.preventDefault();

    const payload = {
      ...feedbackData,
    };

    try {
      const response = await fetch(`/feedback/add`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Thank you for your feedback!");
        // reset feedback data
        setIsProvidingFeedback(false);
        setFeedbackData({
          satisfaction: "",
          additional_comments: "",
          appointment_id: null,
        });
        fetchAppointments(); // re-fetch appointments
      } else {
        throw new Error("Failed to provide feedback");
      }
    } catch (error) {
      console.error("Error providing feedback:", error);
    }
  };

  // posts cancel status for instructor and posted for student to Appointment table
  const handleCancelAppointment = async (appointmentId) => {
    // If there's no user, return
    if (isnt_Student_Or_Instructor(user)) {
      return;
    }

    if (window.confirm("Are your sure you want to cancel this appointment?")) {
      // Construct the endpoint based on account type
      const cancelEndpoint =
        user.account_type === "instructor"
          ? `/instructor/appointments/cancel/${appointmentId}`
          : `/student/appointments/cancel/${appointmentId}`;

      try {
        const response = await fetch(cancelEndpoint, {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRF-TOKEN": csrfToken,
          },
        });

        // successful cancel
        if (response.ok) {
          alert("Appointment canceled successfully!");
          setActiveTab("upcoming");
          setSelectedAppointment(null); // Deselect the appointment as it is now cancelled
          fetchAppointments(); // Re-fetch appointments to update the list
        } else {
          throw new Error("Failed to cancel the appointment");
        }
      } catch (error) {
        console.error("Error cancelling appointment:", error);
      }
    }
  };

  ////////////////////////////////////////////////////////
  //                 Handler Functions                  //
  ////////////////////////////////////////////////////////

  // called when instructor wants to enter appointment URL or appointment notes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // invalid account types
    if (
      (user.account_type !== "instructor" && name === "meeting_url") ||
      (user.account_type !== "student" && name === "notes")
    ) {
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  // called when instructor or student clicks on upcoming, pending, or past tab
  const handleTabClick = (tabName) => {
    setActiveTab(tabName); // Update the active tab state
    setSelectedAppointment(null); // Reset the selected appointment details
  };

  // called when instructor or student clicks on a appointment
  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment); // update selected appointment state
    fetchFeedback();
  };

  // called when instructor or student rates satisfaction or enters explanation
  const handleFeedbackInputChange = (e) => {
    const { name, value } = e.target;
    setFeedbackData({ ...feedbackData, [name]: value }); // update feedbackData with comments/satisfaction rating
  };

  // called when instrucor or student clicks on cancel changes button
  const handleCancelFeedbackChanges = () => {
    // reset feedback data
    setFeedbackData({
      satisfaction: "",
      additional_comments: "",
    });
  };

  // called when instructor or student clicks on provide feedback button
  const handleFeedbackClick = () => {
    setIsProvidingFeedback(true);
    // Set the initial state for feedbackData including the appointment_id from the selected appointment
    setFeedbackData({
      satisfaction: "",
      additional_comments: "",
      appointment_id: selectedAppointment
        ? selectedAppointment.appointment_id
        : null,
    });
  };

  // sort appointments
  const sortTable = (sort) => {
    const daysOfWeekOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ];

    // iterate through data array and sort
    const sortedData = [...appointments].sort((a, b) => {
      switch (sort) {
        // sort based on appointment name
        case "Name":
          return a.name.localeCompare(b.name);
        // sort based on course_name
        case "course_name":
          return a.course_name.localeCompare(b.course_name);
        // sort based on day
        case "Day":
          return (
            daysOfWeekOrder.indexOf(getDayFromDate(a.date)) -
            daysOfWeekOrder.indexOf(getDayFromDate(b.date))
          );
        // sort based on Date
        case "Date":
          const dateComparison = new Date(a.date) - new Date(b.date);
          if (dateComparison === 0) {
            return (
              new Date(`${a.date}T${a.start_time}`) -
              new Date(`${b.date}T${b.start_time}`)
            );
          }
          return dateComparison;
        // sort based on location
        case "Location":
          return a.physical_location.localeCompare(b.physical_location);
        // sort based on status
        case "Status":
          return a.status.localeCompare(b.status);
        // sort doesn't match any of the case statements above
        default:
          return 0;
      }
    });

    // setAppointments to sortedData
    setAppointments(sortedData);
  };

  ////////////////////////////////////////////////////////
  //               UseEffect Functions                  //
  ////////////////////////////////////////////////////////

  // reset selected appointment when selectedAppointment updates
  useEffect(() => {
    if (selectedAppointment) {
      setFormData({
        notes: selectedAppointment.notes || "",
        meeting_url: selectedAppointment.meeting_url || "",
        status: selectedAppointment.status || "",
      });
    }
  }, [selectedAppointment]);

  // fetch appointments and program details when use, activeTab, or reloadTable updates and on initial load
  useEffect(() => {
    if (!initialLoad || reloadTable) {
      fetchAppointments();
      fetchProgramDetails();
    }

    setInitialLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab, initialLoad, reloadTable]);

  // fetch feedback when selectedAppointment is updated
  useEffect(() => {
    fetchFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppointment]);

  // sortTable function called when sortedBy is updated
  useEffect(() => {
    sortTable(sortedBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedBy]);

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // render the provide feedback form if user clicks on provide feedback button
  const renderProvideFeedbackForm = () => {
    if (!isProvidingFeedback) {
      return null;
    }

    // Define the satisfaction levels and the statements to rate
    const satisfactionLevels = [
      "Very Dissatisfied",
      "Dissatisfied",
      "Neutral",
      "Satisfied",
      "Highly Satisfied",
    ];

    // HTML for webpage
    return (
      // Define Feedback Form
      <div id="feedback-form">
        {/* Define border and color of Feedback Form*/}
        <div className="border bg-gray mt-2 p-5 relative">
          <div className="flex flex-row justify-between mt-5">
            {/* Feedback Form title and close button of Feedback Form */}
            <h2 className="m-auto text-2xl font-bold">Feedback Form</h2>
            <div
              className="absolute top-1 right-1 cursor-pointer"
              onClick={() => setIsProvidingFeedback(false)}
            >
              <i className="fas fa-times"></i>
            </div>
          </div>

          <div>
            {/* Feedback satisfaction scale for student and instructor */}
            <div className="flex flex-col">
              <label className="font-bold pt-5">
                How satisfied are you with the appointment?
              </label>
              <div className="flex flex-row justify-between">
                {satisfactionLevels.map((level) => (
                  <div key={level} className="flex flex-col">
                    <label>{level}</label>
                    <input
                      type="radio"
                      name="satisfaction" // This should match the key in feedbackData
                      value={level}
                      checked={feedbackData.satisfaction === level}
                      onChange={handleFeedbackInputChange}
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Text area for student and instructor to write about satisfaction */}
              <div id="additional-comments" className="mt-5">
                <label className="font-bold">Please Explain</label>
                <textarea
                  className="w-full border border-light-gray h-20"
                  name="additional_comments" // This should match the key in feedbackData
                  value={feedbackData.additional_comments}
                  onChange={handleFeedbackInputChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // render the appointment details if a appointment is selected
  const renderAppointmentDetails = () => {
    if (!selectedAppointment) {
      return null;
    }

    // HTML for webpage
    return (
      // Define AppointmentDetails popup dimensions, color, and position for display
      <div className="fixed top-1/2 left-1/2 w-11/12 transform -translate-x-1/2 -translate-y-1/2 bg-popup-gray border border-gray-300 shadow-md p-8 relative">
        {/* Label for Appointment Details and close button for popup */}
        <div className="flex flex-row ">
          <h2 className="m-auto text-2xl font-body font-bold">
            Appointment Details
          </h2>
          <div
            className="absolute top-1 right-1 cursor-pointer"
            onClick={() => {
              setSelectedAppointment(null);
              setIsProvidingFeedback(false);
            }}
          >
            <i className="fas fa-times"></i>
          </div>
        </div>

        {/* Based on account type and when appointment happened, define buttons to approve or cancel appointment, 
            if the appointment was attended or missed, and provide feedback for appointment */}
        <div className="flex justify-end">
          <div className="flex">
            {/* Student and instructor can cancel appointments by clicking on Cancel Appointment button */}
            {((user.account_type === "student" && activeTab !== "past") ||
              (user.account_type === "instructor" &&
                activeTab === "upcoming")) && (
              <button
                className="bg-purple text-white p-2 mt-3 ml-2 rounded-md hover:bg-gold"
                onClick={() =>
                  handleCancelAppointment(selectedAppointment.appointment_id)
                }
              >
                Cancel Appointment
              </button>
            )}

            {/* Instructor can approve or cancel appointment */}
            {user.account_type === "instructor" && activeTab === "pending" && (
              <div>
                <button
                  className="bg-purple text-white p-2 mt-3 ml-2 rounded-md hover:bg-gold"
                  type="button"
                  onClick={() =>
                    handleStatusUpdate(
                      selectedAppointment.appointment_id,
                      "reserved"
                    )
                  }
                >
                  Approve Appointment
                </button>
                <button
                  className="bg-purple text-white p-2 mt-3 ml-2 rounded-md hover:bg-gold"
                  type="button"
                  onClick={() =>
                    handleCancelAppointment(selectedAppointment.appointment_id)
                  }
                >
                  Cancel Appointment
                </button>
              </div>
            )}

            {/* Allow instructor can indicate that appointment was attended or missed when appointment date passed */}
            {user.account_type === "instructor" && activeTab === "past" && (
              <div className="flex flex-row">
                <button
                  className="bg-purple text-white p-2 mt-3 ml-2 rounded-md hover:bg-gold"
                  type="button"
                  onClick={() =>
                    handleStatusUpdate(
                      selectedAppointment.appointment_id,
                      "completed"
                    )
                  }
                >
                  Attended
                </button>
                <button
                  className="bg-purple text-white p-2 mt-3 ml-2 rounded-md hover:bg-gold"
                  type="button"
                  onClick={() =>
                    handleStatusUpdate(
                      selectedAppointment.appointment_id,
                      "missed"
                    )
                  }
                >
                  Missed
                </button>
              </div>
            )}

            {/* Instructor and student can provide feedback if there isn't one and appointment date already passed */}
            {activeTab === "past" && !feedbackPresent && (
              <div className="flex flex-row ml-2 mt-3">
                <br />
                <button
                  className=" bg-purple text-white hover:bg-gold rounded-md p-2"
                  onClick={handleFeedbackClick}
                >
                  Provide Feedback
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Display the Appointment Details along with the Feedback Form */}
        {isProvidingFeedback && renderProvideFeedbackForm()}
        <br />
        <div className="grid grid-cols-2">
          {/* Left Side of the Appointment Details showing program, date, and time */}
          <div className="flex flex-col">
            <div className="flex flex-row">
              <label className="font-bold">Program&nbsp;</label>
              <Tooltip
                text={
                  programDetails.find(
                    (desc) => desc.id === Number(selectedAppointment.program_id)
                  )?.description || "No description for this program :("
                }
              >
                <span>ⓘ</span>
              </Tooltip>
            </div>

            <label>
              {programDetails.find(
                (desc) => desc.id === Number(selectedAppointment.program_id)
              )?.name || "No name for this program"}
            </label>

            <label className="font-bold pt-2">Date</label>
            {getDayFromDate(selectedAppointment.date) +
              ", " +
              formatDate(selectedAppointment.date)}

            <label className="font-bold pt-2">Time</label>
            {`${formatTime(selectedAppointment.start_time)} - ${formatTime(
              selectedAppointment.end_time
            )} (PST)`}
          </div>

          {/* Right Side of the Appointment Details showing Course, Physical Location, and Current Status */}
          <div className="flex flex-col justify-self-end">
            <label className="font-bold pt-2">Course</label>
            {selectedAppointment.course_name}

            {selectedAppointment.physical_location ? (
              <>
                <label className="font-bold pt-2">Physical Location</label>
                {selectedAppointment.physical_location}
              </>
            ) : null}

            {selectedAppointment.meeting_url ? (
              <>
                <label className="font-bold pt-2">Your Appointment URL</label>
                <input
                  className={`w-full ${
                    user.account_type !== "instructor"
                      ? ""
                      : "border border-light-gray bg-gray"
                  }`}
                  type="text"
                  name="meeting_url"
                  value={formData.meeting_url}
                  onChange={handleInputChange}
                  disabled={
                    activeTab === "past" || user.account_type === "student"
                  }
                  onBlur={handleSaveChanges}
                />
              </>
            ) : null}

            <label className="font-bold pt-2">Current Status</label>
            {capitalizeFirstLetter(selectedAppointment.status)}
          </div>
        </div>

        <div className="flex flex-col">
          {/* Display text box for notes about Appointment */}
          <label className="font-bold pt-2">Appointment Notes</label>
          <textarea
            className={`w-full h-20 ${
              user.account_type !== "student" ? "" : "border border-light-gray"
            }`}
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            onBlur={handleSaveChanges}
            disabled={user.account_type !== "student"}
          />

          {/* Display student details if instructor view */}
          {user.account_type === "instructor" &&
            selectedAppointment.attendee && (
              <div className="flex flex-col pt-5">
                <h2 className="text-2xl font-bold">Student Info</h2>
                <label className="font-bold pt-2">Name</label>
                {selectedAppointment.attendee.name}

                <label className="font-bold pt-2">Pronouns</label>
                {selectedAppointment.attendee.pronouns}

                <label className="font-bold pt-2">Email</label>
                {selectedAppointment.attendee.email}
              </div>
            )}

          {/* Display instructor details if student view */}
          {user.account_type === "student" &&
            selectedAppointment.host &&
            activeTab !== "pending" && (
              <div className="flex flex-col pt-5">
                <h2 className="text-2xl font-bold">Instructor Info</h2>
                <label className="font-bold pt-2">Name</label>
                {selectedAppointment.host.title +
                  " " +
                  selectedAppointment.host.name}

                <label className="font-bold pt-2">Pronouns</label>
                {selectedAppointment.host.pronouns}

                <label className="font-bold pt-2">Email</label>
                {selectedAppointment.host.email}
              </div>
            )}
        </div>
        <br />

        {/* Comment box for students and instructor to type into */}
        <Comment appointmentId={selectedAppointment.appointment_id} />
      </div>
    );
  };

  // Global HTML for webpage, Display appointment list
  return (
    // Define AppointmentsTable component
    <div
      id="content-container"
      className="flex flex-col w-full m-auto items-center"
    >
      {/* Appointments label with upcoming, pending, and past tabs */}
      <div className="font-bold text-center text-2xl">
        <h1>Your {capitalizeFirstLetter(activeTab)} Appointments</h1>
      </div>
      <div id="tabs" className="p-2 m-2 rounded-md">
        <button
          className="bg-purple p-2 m-2 rounded-md text-white hover:text-gold"
          onClick={() => handleTabClick("upcoming")}
        >
          Upcoming
        </button>
        <button
          className="bg-purple p-2 m-2 rounded-md text-white hover:text-gold"
          onClick={() => handleTabClick("pending")}
        >
          Pending
        </button>
        <button
          className="bg-purple p-2 m-2 rounded-md text-white hover:text-gold"
          onClick={() => handleTabClick("past")}
        >
          Past
        </button>
      </div>

      {/* Button to show or hide Appointments table */}
      <button
        className="font-bold border border-light-gray rounded-md shadow-md text-sm px-3 py-1 mb-2 place-self-end"
        onClick={() => setShowTable(!showTable)}
      >
        {showTable ? "Hide Table" : "Show Table"}
      </button>

      {/* Appointments table itself */}
      <div id="table" className="w-11/12">
        {selectedAppointment ? (
          renderAppointmentDetails()
        ) : (
          // Table headers for Appointment table allows sorting by details relevant to Appointment
          <table className="w-full border text-center">
            {appointments.length > 0 ? (
              <>
                <thead className="bg-purple text-white">
                  <tr>
                    <th
                      className="border-r w-14% hover:bg-gold"
                      onClick={() => sortBy("Name")}
                    >
                      Program Name
                    </th>
                    <th
                      className="border-r w-14% cursor-pointer hover:bg-gold"
                      onClick={() => sortBy("course_name")}
                    >
                      Course Name
                    </th>
                    <th
                      className="border-r w-8% hover:bg-gold"
                      onClick={() => sortBy("Day")}
                    >
                      Day
                    </th>
                    <th
                      className={`border-r w-12% hover:bg-gold ${
                        hoveringDateOrTime ? "bg-gold" : ""
                      }`}
                      onClick={() => sortBy("Date")}
                      onMouseEnter={() => setHoveringDateOrTime(true)}
                      onMouseLeave={() => setHoveringDateOrTime(false)}
                    >
                      Date
                    </th>
                    <th
                      className={`border-r w-12% hover:bg-gold ${
                        hoveringDateOrTime ? "bg-gold" : ""
                      }`}
                      onClick={() => sortBy("Date")}
                      onMouseEnter={() => setHoveringDateOrTime(true)}
                      onMouseLeave={() => setHoveringDateOrTime(false)}
                    >
                      Time (PST)
                    </th>
                    <th
                      className="border-r w-12% hover:bg-gold"
                      onClick={() => sortBy("Location")}
                    >
                      Physical Location
                    </th>
                    <th className="border-r w-14%">Appointment URL</th>
                    <th
                      className="w-6% hover:bg-gold"
                      onClick={() => sortBy("Status")}
                    >
                      Status
                    </th>
                  </tr>
                </thead>

                {/* Table body showing Appointment and its details */}
                <tbody>
                  {showTable &&
                    appointments.map((appointment) => (
                      <tr
                        key={appointment.appointment_id}
                        onClick={() => handleAppointmentClick(appointment)}
                        className="cursor-pointer hover:bg-gray border-b"
                      >
                        <td className="border-r">
                          {appointment.name || "-------"}
                        </td>
                        <td className="border-r">
                          {appointment.course_name || "-------"}
                        </td>
                        <td className="border-r">
                          {getDayFromDate(appointment.date) || "-------"}
                        </td>
                        <td className="border-r">
                          {formatDate(appointment.date) || "-------"}
                        </td>
                        <td className="border-r">
                          {appointment.start_time && appointment.end_time
                            ? `${formatTime(
                                appointment.start_time
                              )} - ${formatTime(appointment.end_time)}`
                            : "-------"}
                        </td>
                        <td className="border-r">
                          {appointment.physical_location || "-------"}
                        </td>
                        <td className="border-r">
                          {appointment.meeting_url || "-------"}
                        </td>
                        <td>
                          {capitalizeFirstLetter(appointment.status) ||
                            "-------"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </>
            ) : (
              /* Show graphic to instructor and student if no appointments in all tabs */
              <tbody>
                <tr>
                  <td colSpan="5">
                    <div>
                      <img
                        src="https://assets.calendly.com/assets/frontend/media/no-events-2ed89b6c6379caebda4e.svg"
                        alt="No appointments"
                        className="m-auto"
                      />
                      <h2 className="text-center">
                        No {activeTab} appointments
                      </h2>
                    </div>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        )}
      </div>
    </div>
  );
}