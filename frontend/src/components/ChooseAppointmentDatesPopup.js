/* ChooseAppointmentDatesPopup.js
 * Last Edited: 3/26/24
 *
 * UI popup shown when Instructor clicks on "Choose Appointment Dates" button
 * in the "Program Details" tab. Allows instructor to set availabilities
 * based on what days times they have scheduled for program already
 *
 * Known Bugs:
 *  -
 *
 */

import React, { useContext, useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { getCookie } from "../utils/GetCookie";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "@wojtekmaj/react-timerange-picker/dist/TimeRangePicker.css";
import { UserContext } from "../context/UserContext";
import { isnt_Instructor } from "../utils/CheckUserType.js";

const ChooseAppointmentDatesPopup = ({
  onClose,
  data,
  id,
  duration,
  physical_location,
  meeting_url,
  program_id,
  program_name,
  isDropins,
}) => {
  // General Variables
  const { user } = useContext(UserContext);

  // Calendar Data Variables
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [weeklyTimes, setWeeklyTimes] = useState([]);

  // Load Variables
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateSelected, setDateSelected] = useState(false);
  const [showPopup, setShowPopup] = useState(true);

  // Course Variables
  const [courseId, setCourseId] = useState();

  ////////////////////////////////////////////////////////
  //               Fetch Post Functions                 //
  ////////////////////////////////////////////////////////

  // posts added availbility data to the Availability table
  const createTimeSlot = async () => {
    // user isn't an instructor
    if (isnt_Instructor(user)) return;

    try {
      const csrfToken = getCookie("csrf_access_token");
      let convertedAvailability = [];

      // iterate from the start date till the end date
      for (
        let date = new Date(startDate);
        date <= endDate;
        date = addDays(date, 1)
      ) {
        // obtain day of week based on date
        const dayOfWeek = format(date, "EEEE");

        // if days of week in weekly times,
        // push available time into converted availability list
        if (weeklyTimes[dayOfWeek]) {
          const { start_time, end_time } = weeklyTimes[dayOfWeek];
          const formattedDate = format(date, "yyyy-MM-dd");

          convertedAvailability.push({
            id: program_id,
            name: program_name,
            date: formattedDate,
            start_time: start_time,
            end_time: end_time,
          });
        }
      }

      // if no duration set to 0
      if (!duration || duration === "") {
        duration = 0;
      } else {
        duration = Number(duration);
      }

      const payload = {
        availabilities: convertedAvailability,
        duration: duration,
        physical_location: physical_location,
        meeting_url: meeting_url,
        isDropins: isDropins,
        program_id: program_id,
      };

      const response = await fetch(
        `/instructor/availability/${encodeURIComponent(courseId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        window.alert("Availabilities created successfully!");
        setShowPopup(false);
      }
    } catch (error) {
      console.error("Error creating availability:", error);
    }
  };

  ////////////////////////////////////////////////////////
  //                 Handler Functions                  //
  ////////////////////////////////////////////////////////

  // change start and end date to what instructor selects
  const handleCalendarChange = (event) => {
    // start end date could be one date, or range
    setStartDate(event[0]);
    setEndDate(event[1]);
    setDateSelected(true);

    // once start and end date are set, show button to create availability
    setShowTimePicker(true);
  };

  ////////////////////////////////////////////////////////
  //               UseEffect Functions                  //
  ////////////////////////////////////////////////////////

  // set weekly times when data prop is changed
  useEffect(() => {
    setWeeklyTimes(data);
  }, [data]);

  // set course id when id prop is changed
  useEffect(() => {
    setCourseId(id);
  }, [id]);

  // when the availability is set, close out of CreateAppointmentBlock
  useEffect(() => {
    if (!showPopup) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPopup]);

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // HTML for webpage
  return (
    // Define ChooseAppointmentDatesPopup component dimensions, color, and position for display
    <div className="fixed top-1/2 left-1/2 w-1/3 transform -translate-x-1/2 -translate-y-1/2 bg-calendar-popup-gray border border-gray-300 shadow-md pb-7 relative">
      {/* Button to close out of ChooseAppointmentDatesPopup */}
      <button
        className="absolute top-1 right-1 cursor-pointer fas fa-times"
        onClick={onClose}
      ></button>

      <div className="flex flex-row py-5 m-auto">
        <div className="w-2/3 m-auto font-body">
          {/* Define Calendar Container */}
          <div>
            <div className="flex flex-col items-center">
              {/* Label to inform instructor on how to interact with the popup */}
              <h2 className="font-bold pt-5">Choose A Start And End Date:</h2>
              {/* Call Calendar component which instructor interacts with to pick a date or range of dates */}
              <Calendar
                onChange={handleCalendarChange}
                selectRange={true} // Enable range selection
                value={[startDate, endDate]}
                minDate={new Date()} // disables past dates from being selected
              />

              {/* Start and end date labels shown once selected */}
              {dateSelected && (
                <>
                  <label>
                    {format(startDate, "MMMM do, yyyy") +
                      " -- " +
                      format(endDate, "MMMM do, yyyy")}
                  </label>
                </>
              )}
              <br />

              {/* Create button at the bottom of the popup once dates chosen */}
              {showTimePicker && (
                <div className="flex flex-col py-5">
                  <button
                    className="bg-purple text-white p-2 rounded-md m-2 hover:text-gold"
                    onClick={createTimeSlot}
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChooseAppointmentDatesPopup;
