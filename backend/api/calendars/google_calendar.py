import os
import datetime
from flask import Blueprint, request, redirect, session, jsonify
from flask_cors import CORS
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
from dotenv import load_dotenv

# Set environment variable to allow OAuth2 insecure transport (HTTP instead of HTTPS)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
load_dotenv()

# Create a Blueprint for the Google Calendar API
google_calendar_bp = Blueprint('google_calendar_bp', __name__)
CORS(google_calendar_bp, supports_credentials=True)

# Path to credentials file
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
    
# clear the session credentials
@google_calendar_bp.route('/logout', methods=['POST'])
def logout():
    # Clear Google OAuth2 credentials from the session
    session.pop('credentials', None)
    return jsonify({'message': 'Logged out successfully'}), 200