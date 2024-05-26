import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/CalendarView.css';
import '../styles/GoogleLoginButton.css';

// initialize the moment localizer for react-big-calendar
// moment localizer handles date and time operations
const localizer = momentLocalizer(moment);

function CalendarView() {
  const [events, setEvents] = useState([]); // events data
  const [error, setError] = useState(''); // error messages
  const [isAuthenticated, setIsAuthenticated] = useState(false); // authentication

  ////////////////////////////////////////////////////////
  //               Fetch Get Functions                  //
  ////////////////////////////////////////////////////////

  // fetch calendar events from the backend
  const fetchEvents = async () => {
    try {
      // make an API request to fetch events with credentials
      const result = await axios.get('http://localhost:5000/api/get_calendar_events', {
        withCredentials: true,
      });

      // format the fetched events to match the calendar requirements
      const formattedEvents = result.data.map(event => {
        const { summary, start, end, id, extendedProperties } = event;

        let startDate, endDate;
        let allDay = false;

        if (start.date) {
          // All-day event
          // add 1 day to make it a correct date. Without it events are shifted one day early
          startDate = moment.utc(start.date).add(1, 'days').toDate();
          endDate = moment.utc(end.date).toDate();
          allDay = true;
        } else {
          // Timed event
          startDate = moment(start.dateTime).toDate();
          endDate = moment(end.dateTime).toDate();
        }
        return {
          id,
          title: summary,
          start: startDate,
          end: endDate,
          allDay: allDay,
          isGoogleEvent: extendedProperties?.private?.isGoogleEvent === 'true'
        };
      });
      // update the state with the formatted events
      setEvents(formattedEvents);
      // set authentication status to true
      setIsAuthenticated(true);
    } catch (error) {
      // error message based on the response
      setError(error.response?.data?.error || 'Failed to fetch events');
      // if the response status is 401, set authentication status to false
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
      } else if (error.response?.status === 403) {
        console.log("Access Forbidden: ", error.response?.data?.error);
        // redirect to unauthorized page if status is 403
        window.location.href = 'http://localhost:3000/unauthorized';
      }
    }
  };

  ////////////////////////////////////////////////////////
  //               UseEffect Functions                  //
  ////////////////////////////////////////////////////////

  // useEffect hook to check authentication status and fetch events on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // make an API request to check authentication status
        await axios.get('http://localhost:5000/api/get_calendar_events', {
          withCredentials: true,
        });
        // set authentication status to true if request is successful
        setIsAuthenticated(true);
        // fetch events if authenticated
        fetchEvents();
      } catch (error) {
        // set authentication status to false if request fails
        setIsAuthenticated(false);
        // redirect to unauthorized page if status is 403
        if (error.response?.status === 403) {
          console.log("Access Forbidden: ", error.response?.data?.error);
          window.location.href = 'http://localhost:3000/unauthorized';
        }
      }
    };
    // call the checkAuthStatus function on component mount
    checkAuthStatus();
  }, []);

  ////////////////////////////////////////////////////////
  //                 Render Functions                   //
  ////////////////////////////////////////////////////////

  // if the user is not authenticated, show the login button
  if (!isAuthenticated) {
    return (
      <div>
        <h1 className="text-purple text-center text-4xl font-headlines p-5">Your Google Calendar Events</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button className="google-login-button" onClick={() => window.location.href = 'http://localhost:5000/api/login'}>
            <img src="/google_logo.png" alt="Google logo" width="20" height="20" />
            Continue with Google
          </button>
        </div>
        {error && <p>Error: {error}</p>}
      </div>
    );
  }

  // HTML for webpage
  // if the user is authenticated, render the calendar with events
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div>
        <h1 className="text-purple text-center text-4xl font-headlines p-5">Your Google Calendar Events</h1>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500, width: 1000 }}
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
          onSelectEvent={event => alert(event.title)}
          onSelectSlot={slotInfo => console.log(slotInfo)}
          eventPropGetter={(event) => ({
            className: event.isGoogleEvent ? 'google-event' : ''
          })}
        />
      </div>
    </div>
  );
}

export default CalendarView;