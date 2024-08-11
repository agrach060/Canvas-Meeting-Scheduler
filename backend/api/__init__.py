""" 
 * __init__.py
 * Last Edited: 8/6/24
 *
 * Contains initialization of the Flask App
 *
 * Known Bugs:
 * - 
 *
"""
from flask import Flask, request, jsonify, redirect, url_for, session as flask_session
from flask import session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from datetime import timedelta
from flask_session import Session
from datetime import datetime
import pytz
import requests

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    load_dotenv()

    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_COOKIE_SECURE'] = True  # Ensure the session cookie is sent over HTTPS
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI')  # Set the app's database connection string
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    app.config["JWT_COOKIE_SECURE"] = False  # Set to True in production with HTTPS
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=3)

    # Extensions initialization
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True) # Allow requests from localhost (React app during development)
    Session(app)
    jwt.init_app(app)  # Initialize the JWTManager with the Flask app
    db.init_app(app)  # Bind the SQLAlchemy instance to this Flask app
    migrate = Migrate(app, db)

    # Registering Blueprints
    from .auth import auth
    from .admin import admin
    from .student import student
    from .instructor import instructor
    from .programs import programs
    from .feedback import feedback
    from .models import User, Availability, CourseDetails, CourseMembers
    from .user import user

    app.register_blueprint(auth, url_prefix='/')
    app.register_blueprint(admin, url_prefix='/')
    app.register_blueprint(student, url_prefix='/')
    app.register_blueprint(instructor, url_prefix='/')
    app.register_blueprint(programs, url_prefix='/')
    app.register_blueprint(feedback, url_prefix='/')
    app.register_blueprint(user, url_prefix='/')
    
    # Creating tables
    with app.app_context():
        db.create_all()

    """""""""""""""""""""""""""""""""""""""""""""""""""""
    ""             Endpoint Functions                  ""
    """""""""""""""""""""""""""""""""""""""""""""""""""""
    # Getting Client ID 
    @app.route("/api/get-client-id", methods=["GET"])
    def get_client_id():
        print("Reached /api/get-client-id endpoint.")
        return jsonify({"client_id": os.getenv("CLIENT_ID")})

    # Clearing current user session
    @app.route("/api/clear_session", methods=["POST"])
    def clear_session_endpoint():
        print("Received request to clear the current user session.")
        flask_session.pop("access_token", None)
        flask_session.pop("refresh_token", None)
        flask_session.pop("token_expiry", None)
        return jsonify({"message": "Session cleared successfully"}), 200

    # Obtaining authorization code
    @app.route("/api/authorization-code", methods=["POST"])
    def receive_authorization_code():
        print("Reached /api/authorization-code endpoint.")
        data = request.get_json()
        code = data.get("code")
        current_url = data.get("currentUrl")
        try:
            exchange_code_for_token(code, current_url)
            flask_session["current_url"] = current_url
            return jsonify({"status": "200"})
        except:
            return jsonify({"status": "400"})

    # Fetch user's courses and terms
    @app.route("/api/fetch-courses-and-terms", methods=["GET"])
    def fetch_courses_and_terms():
        print("Fetching courses and terms.")
        access_token = flask_session.get("access_token")
        if not access_token:
            return jsonify({"error": "User not authenticated"}), 401

        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        try:
            # Fetch courses with additional details
            response = requests.get("https://canvas.uw.edu/api/v1/courses?include[]=term", headers=headers)
            response.raise_for_status()
            courses = response.json()

            # Extract terms from courses
            terms = {}
            for course in courses:
                term = course.get("term")
                if term:
                    term_id = term.get("id")
                    term_name = term.get("name")
                    if term_id not in terms:
                        terms[term_id] = term

                if term_name == "Summer 2024":
                # Extract course details
                    course_id = course['id']
                    # Fetch instructor details
                    instructor_response = requests.get(f"https://canvas.uw.edu/api/v1/courses/{course_id}/search_users?enrollment_type[]=teacher", headers=headers)
                    instructor_response.raise_for_status()
                    instructors = instructor_response.json()
                    
                    if instructors:
                        instructor = instructors[0]  
                        instructor_id = instructor.get('id')
                        instructor_name = instructor.get('name')

                        # Check if the instructor already exists in the database
                        existing_instructor = User.query.get(instructor_id)
                        if not existing_instructor:
                            new_instructor = User(
                                id=instructor_id,
                                status='active',
                                account_type='instructor',
                                name=instructor_name
                            )
                            db.session.add(new_instructor)

                        existing_course = CourseDetails.query.filter_by(id=course_id).first()
                        if not existing_course:
                            # Insert course details into the CourseDetails table
                            course_details = CourseDetails(
                                id=course_id,
                                instructor_id=instructor_id,
                                quarter=term_name,
                                name=course.get("name"),
                                physical_location='N/A',
                                meeting_url='N/A',
                                recordings_link='N/A',
                                discord_link='N/A',
                                comments='N/A',
                                google_credentials='N/A',
                                instructor_email='N/A'
                            )
                            db.session.add(course_details)

                        # Check if the course member already exists
                        existing_member = CourseMembers.query.filter_by(course_id=course_id, user_id=instructor_id).first()
                        if not existing_member:
                            course_member = CourseMembers(
                                course_id=course_id,
                                user_id=instructor_id,
                                enrollment_type='instructor'
                            )
                            db.session.add(course_member)

            db.session.commit()

            return jsonify({"courses": courses, "terms": list(terms.values())}), 200
        except requests.exceptions.RequestException as e:
            print(f"HTTP error occurred while fetching courses: {e}")
            return jsonify({"error": str(e)}), 500

    # Check if the user is logged in
    @app.route("/api/check-login", methods=["GET"])
    def check_login():
        print("checking /api/check-login ")
        access_token = flask_session.get("access_token")
        if access_token is None or access_token == "":
            return jsonify({"isLoggedIn": False}), 401

        token_expiry_str = flask_session.get("token_expiry")
        if not token_expiry_str:
            return jsonify({"isLoggedIn": False}), 401
        
        try:
            token_expiry = datetime.fromisoformat(token_expiry_str)
        except ValueError:
            return jsonify({"isLoggedIn": False}), 401

        current_time = datetime.now(pytz.utc)

        if (token_expiry - current_time).total_seconds() < 0:
            refresh_token = flask_session.get("refresh_token")
            if refresh_token is None:
                flask_session.pop("access_token", None)
                flask_session.pop("refresh_token", None)
                flask_session.pop("token_expiry", None)
                print("No refresh token found. Access token has expired.")
                return jsonify({"isLoggedIn": False}), 401
            else:
                access_token_response = refresh_access_token(refresh_token)
                if access_token_response is None:
                    flask_session.pop("access_token", None)
                    flask_session.pop("refresh_token", None)
                    flask_session.pop("token_expiry", None)
                    print("Error refreshing access token.")
                    return jsonify({"isLoggedIn": False}), 401
                else:
                    save_access_token_info(access_token_response)
                    print("isLoggedIn will be true")
                    return jsonify({"isLoggedIn": True, "roles": flask_session.get("user_roles", [])})
        else:
            return jsonify({"isLoggedIn": True, "roles": flask_session.get("user_roles", [])})
    
    # Fetch the user's role 
    @app.route("/api/fetch-roles", methods=["GET"])
    def fetch_roles():
        roles = flask_session.get("user_roles", [])
        return jsonify({"roles": roles})

    # Delete access token from the session
    @app.route("/api/access_token", methods=["DELETE"])
    def delete_access_token():
        print("Reached /api/access_token endpoint ")
        try:
            flask_session.pop("access_token", None)
            flask_session.pop("token_type", None)
            flask_session.pop("token_expiry", None)
            flask_session.pop("current_url", None)
            return "", 204
        except:
            return "Error occured while deleting access token", 500

    # Add availability for the user 
    @app.route('/api/availability', methods=['POST'])
    def add_availability():
        data = request.get_json()

        # Check if the same availability already exists
        existing_availability = Availability.query.filter_by(
            user_id=data['user_id'],
            date=data['date'],
            start_time=data['start_time'],
            end_time=data['end_time']
        ).first()

        if existing_availability:
            return jsonify({'error': 'Availability already exists for the specified time and date.'}), 409

        new_availability = Availability(
            user_id=data['user_id'],
            program_id=data.get('program_id'),
            date=data['date'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            status='active'
        )
        
        db.session.add(new_availability)
        db.session.commit()
        return jsonify({'message': 'Availability added successfully!'}), 201
    
    @app.route("/api/user/profile", methods=["GET"])
    def get_user_profile():
        user_id = flask_session.get('user_id')
        if not user_id:
            print("User ID not found in session")
            return jsonify({"error": "User not authenticated"}), 401
        if not user_id:
            return jsonify({"error": "User not authenticated"}), 401
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        if request.method == "GET":
            user_info = {
                "name": user.name,
                "pronouns": user.pronouns,
                "email": user.email,
                "discord_id": user.discord_id, 
                "zoom_link": user.zoom_link,
                "calendar_type": user.calendar_type,
                "calendar_link": user.calendar_link 
            }

            return jsonify(user_info)
        
        
    @app.route("/api/user/profile/update", methods=["POST"])
    def update_user_profile():
        user_id = flask_session.get('user_id')
        if not user_id:
            return jsonify({"error": "User not authenticated"}), 401
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        user.discord_id = data.get("discord_id", user.discord_id)
        user.zoom_link = data.get("zoom_link", user.zoom_link)
        user.calendar_type = data.get("calendar_type", user.calendar_type)
        user.calendar_link = data.get("calendar_link", user.calendar_link)

        db.session.commit()
        return jsonify({"message": "Profile updated successfully!"}), 200
    
    """""""""""""""""""""""""""""""""""""""""""""""""""""
    ""             Backend Only Functions              ""
    """""""""""""""""""""""""""""""""""""""""""""""""""""
    def save_access_token_info(access_token_response):
        print("Reached save_access_token_info function.")
        flask_session["access_token"] = access_token_response["access_token"]
        flask_session["refresh_token"] = access_token_response["refresh_token"]
        expiry_time = datetime.now(pytz.utc) + timedelta(seconds=access_token_response["expires_in"])
        flask_session["token_expiry"] = expiry_time.isoformat()
        print("Saved access token and expiry time in session.")

    def exchange_code_for_token(code, current_url):
        print("Reached exchange_code_for_token function.")
        scopes = [
            "url:GET|/api/v1/courses",
            "url:GET|/api/v1/users/self/enrollments"
        ]

        token_url = "https://canvas.uw.edu/login/oauth2/token"
        data = {
            "code": code,
            "client_id": os.getenv("CLIENT_ID"),
            "client_secret": os.getenv("CLIENT_SECRET"),
            "redirect_uri": current_url,
            "grant_type": "authorization_code",
        }
        print(f"Authorization code: {code}")

        try:
            response = requests.post(token_url, data=data)
            if response.status_code != 200:
                print(f"Error exchanging code for token: {response.text}")
                return {"status": "400", "error": response.text}
            
            print("Token exchange successful")
            access_token_response = response.json()
            flask_session.clear()
            save_access_token_info(access_token_response)
            print("Saved access token info successfully.")
            print(f"Access Token: {access_token_response['access_token']}")
            print("About to call fetch_and_store_user_info")
            fetch_and_store_user_info(access_token_response["access_token"])
            return {"status": "200"}
        except requests.exceptions.RequestException as e:
            print(f"HTTP error occurred: {e}")
            return {"status": "400", "error": str(e)}
        
    def fetch_and_store_user_info(access_token):
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get("https://canvas.uw.edu/api/v1/users/self/profile", headers=headers)
        if response.status_code == 200:
            user_profile = response.json()
            flask_session['user_id'] = user_profile.get('id')
            # Check if user already exists in the database
            existing_user = User.query.get(user_profile.get('id'))
            if not existing_user:
                new_user = User(
                    id=user_profile.get('id'),
                    status='active',
                    email=user_profile.get('primary_email'),
                    title=user_profile.get('title'),
                    name=user_profile.get('name'),
                    sortable_name=user_profile.get('sortable_name'),
                    pronouns=user_profile.get('pronouns'),
                    discord_id=None,
                    zoom_link=None,
                    calendar_type=None,
                    calendar_link=None,
                )
                with app.app_context():
                    db.session.add(new_user)
                    db.session.commit()

    def refresh_access_token(refresh_token):
        print("Reached refresh_access_token function ")
        token_url = "https://canvas.uw.edu/login/oauth2/token"
        data = {
            "refresh_token": refresh_token,
            "client_id": os.getenv("CLIENT_ID"),
            "client_secret": os.getenv("CLIENT_SECRET"),
            "grant_type": "refresh_token",
        }
        response = requests.post(token_url, data=data)

        if response.status_code == 200:
            access_token_response = response.json()
            save_access_token_info(access_token_response)
            return access_token_response
        else:
            print("Error refreshing access token:", response.text)
            return None
    return app

# Application setup
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)

