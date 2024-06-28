import os # interact with operating system
import datetime # handle date and time operations
from flask import Blueprint, request, redirect, session, jsonify # Flask web framework components
from flask_cors import CORS # Cross-Origin Resource Sharing
from google_auth_oauthlib.flow import Flow # manage OAuth2 authorization flow
from googleapiclient.discovery import build # access Google APIs
from google.oauth2.credentials import Credentials # handle OAuth2 credentials
from googleapiclient.errors import HttpError # handle API errors
from dotenv import load_dotenv # load environment variables from a .env file
from dateutil import parser # parse date strings into datetime objects
from datetime import timedelta 
import pytz # handle time zones
from ..models import db, User, CourseDetails # import database models
import jwt # handle JSON Web Tokens

# Set environment variable to allow OAuth2 insecure transport (HTTP instead of HTTPS)
# For testing purposes only, can be deleted after deployment
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
load_dotenv()

# Create a Blueprint for the Google Calendar API
google_calendar_bp = Blueprint('google_calendar_bp', __name__)
# Enable CORS with credentials support
CORS(google_calendar_bp, supports_credentials=True)

# Define a path to credentials file
credentials_path = os.path.join(os.path.dirname(__file__), '..', '..', 'credentials.json')

# Google Calendar Service class to handle all calendar-related operations
class GoogleCalendarService:
    SCOPES = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar'
    ]

    """""""""""""""""""""""""""""""""""""""""""""""""""""
    ""             Backend Only Functions              ""
    """""""""""""""""""""""""""""""""""""""""""""""""""""

    # Initialization function to set up the OAuth2 flow
    def __init__(self):
        self.flow = Flow.from_client_secrets_file(
            credentials_path,
            scopes=self.SCOPES,
            redirect_uri='http://localhost:5000/api/callback'
        )

    # Fetch credentials from the session
    def get_credentials(self):
        if 'credentials' not in session:
            raise Exception("Missing credentials")

        return Credentials(**session['credentials'])

    # Get Google Calendar service using the credentials
    def get_calendar_service(self):
        credentials = self.get_credentials()
        return build('calendar', 'v3', credentials=credentials)

    # Get events from the user's primary calendar
    def get_events(self):
        try:
            service = self.get_calendar_service()
            now = datetime.datetime.isoformat() + 'Z'
            events_result = service.events().list(
                calendarId='primary', timeMin=now, maxResults=10,
                singleEvents=True, orderBy='startTime'
            ).execute()
            events = events_result.get('items', [])
            return events
        except HttpError as http_err:
            raise Exception(f"HttpError: {http_err}")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")

    # Return events that are within a specified time range
    def get_events_in_time_range(self, credentials, start_time, end_time):
        try:
            # google service instance
            service = build('calendar', 'v3', credentials=credentials)
            # make a request to the Google Calendar API to fetch events in the specified time range
            events_result = service.events().list(
                calendarId='primary', timeMin=start_time, timeMax=end_time,
                singleEvents=True, orderBy='startTime'
            ).execute()
            # extract the list of events from the API response
            events = events_result.get('items', [])
            return events
        except HttpError as http_err:
            raise Exception(f"HttpError: {http_err}")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")
    
    # Create a new event in the user's primary calendar    
    def create_event(self, event_details):
        try:
            service = self.get_calendar_service()
            event = {
                'summary': event_details['summary'],
                'description': event_details.get('description', ''),
                'start': {
                    'dateTime': event_details['start'],
                    'timeZone': event_details.get('timeZone', 'America/Los_Angeles')
                },
                'end': {
                    'dateTime': event_details['end'],
                    'timeZone': event_details.get('timeZone', 'America/Los_Angeles')
                },
                'attendees': [{'email': email} for email in event_details.get('attendees', [])],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 10},
                    ],
                },
                'colorId': '11',
                'extendedProperties': {
                'private': {
                    'isGoogleEvent': 'true'
                }, 
            }
            }
            created_event = service.events().insert(calendarId='primary', body=event).execute()
            print("event id: ", created_event.get('id'))
            return created_event['id']
        except HttpError as http_err:
            raise Exception(f"HttpError: {http_err}")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")
        
    # Delete an event from the user's primary calendar
    def delete_event(self, event_id):
        try:
            service = self.get_calendar_service()
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            return {'status': 'success', 'message': 'Event deleted successfully'}
        except HttpError as http_err:
            raise Exception(f"HttpError: {http_err}")
        except Exception as e:
            raise Exception(f"Error: {str(e)}")

    # Generate the authorization URL and save the state in the session
    def login(self):
        authorization_url, state = self.flow.authorization_url(
            access_type='offline', include_granted_scopes='true'
        )
        session['state'] = state
        return authorization_url

    # Exchange the authorization code for credentials and save them in the session
    def callback(self, url):
        try:
            self.flow.fetch_token(authorization_response=url)
            credentials = self.flow.credentials
            session['credentials'] = self.credentials_to_dict(credentials)

            id_info = jwt.decode(credentials.id_token, options={"verify_signature": False})
            user_email = id_info.get('email')

            print(f"User Email: {user_email}")

            user = User.query.filter_by(email=user_email).first()
            if not user:
                user = User(email=user_email, account_type='instructor', status='active')
                db.session.add(user)
            db.session.commit()
            instructor = CourseDetails.query.filter_by(instructor_email=user_email).first()
            print("instructor = ", instructor)
            if instructor:
                instructor.google_credentials = self.credentials_to_dict(credentials)
                print("instructor credentials successfully updated")
                db.session.commit()
            return 'http://localhost:3000/view-my-calendar'
        except Exception as e:
            raise Exception(f"Error during callback: {str(e)}")

    # Convert credentials to a dictionary
    def credentials_to_dict(self, credentials):
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
    
"""""""""""""""""""""""""""""""""""""""""""""""""""""
""               Endpoint Functions                ""
"""""""""""""""""""""""""""""""""""""""""""""""""""""
# Instantiate the GoogleCalendarService class
google_calendar_service = GoogleCalendarService()

# Get calendar events
@google_calendar_bp.route('/get_calendar_events', methods=['GET'])
def get_calendar_events():
    if 'credentials' not in session:
        return jsonify({'error': 'Missing credentials'}), 401
    try:
        credentials = google_calendar_service.get_credentials()
        service = google_calendar_service.get_calendar_service()
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        events_result = service.events().list(
            calendarId='primary', timeMin=now, maxResults=100, singleEvents=True, orderBy='startTime'
        ).execute()
        events = events_result.get('items', [])
        return jsonify(events)
    except HttpError as http_err:
        print(f"HttpError: {http_err}")
        return jsonify({'error': 'Failed to fetch events', 'details': str(http_err)}), 500
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': 'An error occurred', 'details': str(e)}), 500

# Login route to start the OAuth2 flow
@google_calendar_bp.route('/login')
def login():
    try:
        authorization_url = google_calendar_service.login()
        return redirect(authorization_url)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# OAuth2 callback route to handle the redirect from Google's authorization server
@google_calendar_bp.route('/callback')
def callback():
    try:
        redirect_url = google_calendar_service.callback(request.url)
        return redirect(redirect_url)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Create a new event in the user's calendar    
@google_calendar_bp.route('/create_event', methods=['POST'])
def create_event():
    if 'credentials' not in session:
        return jsonify({'error': 'Missing credentials'}), 401

    event_details = request.json

    try:
        event_id = google_calendar_service.create_event(event_details)
        print("Event_id: " , event_id)
        return jsonify({'event_id': event_id}), 200
    except HttpError as http_err:
        return jsonify({'error': 'Failed to create event', 'details': str(http_err)}), 500
    except Exception as e:
        return jsonify({'error': 'An error occurred', 'details': str(e)}), 500
    
# Delete an event in the user's calendar
@google_calendar_bp.route('/delete_event/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    try:
        print(f"Deleting event with ID: {event_id}")
        service = google_calendar_service.get_calendar_service()
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        print(f"Event with ID {event_id} deleted successfully")
        return jsonify({'message': 'Event deleted successfully'}), 200
    except HttpError as http_err:
        print(f"HttpError: {http_err}")
        return jsonify({'error': 'Failed to delete event', 'details': str(http_err)}), 500
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': 'An error occurred', 'details': str(e)}), 500
    
# Make sure there are no coflicts with the user's Google Calendar events when making an appointment 
@google_calendar_bp.route('/check_conflicts', methods=['POST'])
def check_conflicts():
    print("Endpoint check_conflicts reached")
    if 'credentials' not in session:
        print("Missing credentials in session")
        return jsonify({'error': 'Missing credentials'}), 401

    try:
        data = request.json
        print("Request data received:", data)
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        instructor_id = data.get('instructor_id')

        if not start_time_str or not end_time_str or not instructor_id:
            print("Missing required data: start_time, end_time, or instructor_id")
            return jsonify({'error': 'Start time, end time, and instructor_id are required'}), 400

        start_time = parser.isoparse(start_time_str).astimezone(pytz.utc)
        end_time = parser.isoparse(end_time_str).astimezone(pytz.utc)
        print("Parsed start_time:", start_time)
        print("Parsed end_time:", end_time)

        start_time += timedelta(hours=7)
        end_time += timedelta(hours=7)
        print("Adjusted start_time:", start_time)
        print("Adjusted end_time:", end_time)

        local_tz = pytz.timezone('America/Los_Angeles')
        start_time = start_time.astimezone(local_tz)
        end_time = end_time.astimezone(local_tz)
        print("Converted to local time zone start_time:", start_time)
        print("Converted to local time zone end_time:", end_time)

        student_credentials = Credentials(**session['credentials'])
        print("student_credentials = ", student_credentials)
        print(f"Checking CourseDetails for instructor_id: {instructor_id}")

        instructor_course = CourseDetails.query.filter_by(instructor_id=instructor_id).first()
        print("instructor_course = ", instructor_course)
        if not instructor_course:
            print(f"No course found with instructor_id {instructor_id}")
            return jsonify({'error': f'No course found with instructor_id {instructor_id}'}), 404
        if not instructor_course.google_credentials:
            print(f"Instructor credentials not found for instructor_id {instructor_id}")
            return jsonify({'error': 'Instructor credentials not found'}), 404

        instructor_credentials = Credentials(**instructor_course.google_credentials)
        print("instructor_credentials = ", instructor_credentials)
        print("Student credentials and instructor credentials retrieved")

        try:
            student_events = google_calendar_service.get_events_in_time_range(student_credentials, start_time.isoformat(), end_time.isoformat())
            print("Student events retrieved from Google Calendar:", student_events)
        except HttpError as http_err:
            print(f"HttpError when fetching student events: {http_err}")
            return jsonify({'error': 'Failed to fetch student events', 'details': str(http_err)}), 500
        except Exception as e:
            print(f"Error when fetching student events: {str(e)}")
            return jsonify({'error': 'An error occurred when fetching student events', 'details': str(e)}), 500

        try:
            instructor_events = google_calendar_service.get_events_in_time_range(instructor_credentials, start_time.isoformat(), end_time.isoformat())
            print("Instructor events retrieved from Google Calendar:", instructor_events)
        except HttpError as http_err:
            print(f"HttpError when fetching instructor events: {http_err}")
            return jsonify({'error': 'Failed to fetch instructor events', 'details': str(http_err)}), 500
        except Exception as e:
            print(f"Error when fetching instructor events: {str(e)}")
            return jsonify({'error': 'An error occurred when fetching instructor events', 'details': str(e)}), 500

        conflicts = []
        for event in student_events + instructor_events:
            if 'dateTime' in event['start'] and 'dateTime' in event['end']:
                event_start = parser.isoparse(event['start']['dateTime'])
                event_end = parser.isoparse(event['end']['dateTime'])

                event_start = event_start.astimezone(pytz.utc)
                event_end = event_end.astimezone(pytz.utc)

                if event_start < end_time and event_end > start_time:
                    conflicts.append(event)
        print("Conflicts found:", conflicts)
        return jsonify({'conflicts': conflicts}), 200
    except HttpError as http_err:
        print(f"HttpError in outer block: {http_err}")
        return jsonify({'error': 'Failed to fetch events', 'details': str(http_err)}), 500
    except Exception as e:
        print(f"Error in outer block: {str(e)}")
        return jsonify({'error': 'An error occurred', 'details': str(e)}), 500

# Get instructor's email to create an appointment on their Google Calendar    
@google_calendar_bp.route('/course/instructor/<int:course_id>', methods=['GET'])
def get_instructor_email(course_id):
    course = CourseDetails.query.get(course_id)
    if not course or not course.instructor:
        return jsonify({'error': 'Instructor not found'}), 404

    return jsonify({'instructor_email': course.instructor.email}), 200
    
# clear the session credentials
@google_calendar_bp.route('/logout', methods=['POST'])
def logout():
    # Clear Google OAuth2 credentials from the session
    session.pop('credentials', None)
    return jsonify({'message': 'Logged out successfully'}), 200