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
import datetime
import pytz
import requests

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    load_dotenv()

    app = Flask(__name__)

    # Allow requests from localhost (React app during development)
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['SESSION_TYPE'] = 'filesystem'

    Session(app)
    CORS(app, supports_credentials=True)

    # Ensure the session cookie is sent over HTTPS
    app.config['SESSION_COOKIE_SECURE'] = True

# -----------------------------------Canvas OAuth 2.0 Routes------------------------------------------------------------

    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")


    @app.route("/api/get-client-id", methods=["GET"])
    def get_client_id():
        print("Reached /api/get-client-id endpoint.")
        return jsonify({"client_id": client_id})


    @app.route("/api/clear_session", methods=["POST"])
    def clear_session_endpoint():
        print("Received request to clear the current user session.")
        flask_session.pop("access_token", None)
        flask_session.pop("refresh_token", None)
        flask_session.pop("token_expiry", None)
        return jsonify({"message": "Session cleared successfully"}), 200


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


    def save_access_token_info(access_token_response):
        print("Reached save_access_token_info function.")
        flask_session["access_token"] = access_token_response["access_token"]
        flask_session["refresh_token"] = access_token_response["refresh_token"]
        expiry_time = datetime.datetime.now(pytz.utc) + datetime.timedelta(
            seconds=access_token_response["expires_in"]
        )
        flask_session["token_expiry"] = expiry_time.isoformat()


    def exchange_code_for_token(code, current_url):
        print("Reached exchange_code_for_token function.")
        scopes = [
            "url:GET|/api/v1/courses",
            "url:GET|/api/v1/users/self/enrollments"
        ]

        token_url = "https://canvas.uw.edu/login/oauth2/token"
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
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

             # Fetch user email
            print("Fetching user email")
            user_email = fetch_user_email(access_token_response["access_token"])
            print("User email: ", user_email)
            flask_session["user_email"] = user_email

            # Fetch user roles
            print("Fetching user roles")
            user_roles = fetch_user_roles(access_token_response["access_token"])
            print("User roles: ", user_roles)
            flask_session["user_roles"] = user_roles
            return {"status": "200"}
        except requests.exceptions.RequestException as e:
            print(f"HTTP error occurred: {e}")
            return {"status": "400", "error": str(e)}

    def fetch_user_email(access_token):
        print("FETCHING USER EMAIL")
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        try:
            response = requests.get("https://canvas.uw.edu/api/v1/users/self/profile", headers=headers)
            response.raise_for_status()
            user_profile = response.json()
            return user_profile.get('primary_email')
        except requests.exceptions.RequestException as e:
            print(f"HTTP error occurred while fetching email: {e}")
            return None

    def fetch_user_roles(access_token):
        print("FETCHING USER ROLES")
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        try:
            response = requests.get("https://canvas.uw.edu/api/v1/courses", headers=headers)
            response.raise_for_status()
            enrollments = response.json()
            print("Enrollments from Canvas:", enrollments)

            role_mapping = {
                "StudentEnrollment": "student",
                "TeacherEnrollment": "instructor",
                "TaEnrollment": "ta"
            }

            roles = list(set(role_mapping.get(enrollment['type'], 'unknown') for enrollment in enrollments if enrollment['type'] in role_mapping))
            print("Mapped Roles:", roles)
            return roles
        except requests.exceptions.RequestException as e:
            print(f"HTTP error occurred while fetching roles: {e}")
            return []

    @app.route("/api/fetch-courses-and-terms", methods=["GET"])
    def fetch_courses_and_terms():
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
                    if term_id not in terms:
                        terms[term_id] = term

            return jsonify({"courses": courses, "terms": list(terms.values())}), 200
        except requests.exceptions.RequestException as e:
            print(f"HTTP error occurred while fetching courses: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/check-login", methods=["GET"])
    def check_login():
        print("checking /api/check-login ")
        access_token = flask_session.get("access_token")
        if access_token is None or access_token == "":
            return jsonify({"isLoggedIn": False}), 401

        token_expiry_str = flask_session.get("token_expiry")
        token_expiry = datetime.datetime.fromisoformat(token_expiry_str)
        current_time = datetime.datetime.now(pytz.utc)

        if token_expiry is None or (token_expiry - current_time).total_seconds() < 0:
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
                    print(f"isLoggedIn will be true")
                    return jsonify({"isLoggedIn": True, "roles": flask_session.get("user_roles", [])})
        else:
            return jsonify({"isLoggedIn": True, "roles": flask_session.get("user_roles", [])})
        
    @app.route("/api/fetch-roles", methods=["GET"])
    def fetch_roles():
        roles = flask_session.get("user_roles", [])
        return jsonify({"roles": roles})


    def refresh_access_token(refresh_token):
        print("Reached refresh_access_token function ")
        token_url = "https://canvas.uw.edu/login/oauth2/token"
        data = {
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
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

    from .auth import auth
    from .admin import admin
    from .student import student
    from .instructor import instructor
    from .programs import programs
    from .feedback import feedback
    from .models import User
    from .user import user
    from .calendars.google_calendar import google_calendar_bp 

    connection_string = os.environ.get('SQLALCHEMY_DATABASE_URI')

    # Set the app's database connection string
    app.config['SQLALCHEMY_DATABASE_URI'] = connection_string
    app.config["JWT_COOKIE_SECURE"] = False  # Set to True in production with HTTPS
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=3)
    jwt.init_app(app)  # Initialize the JWTManager with the Flask app
    
    # Bind the SQLAlchemy instance to this Flask app
    db.init_app(app)
    migrate = Migrate(app, db)

    app.register_blueprint(auth, url_prefix='/')
    app.register_blueprint(admin, url_prefix='/')
    app.register_blueprint(student, url_prefix='/')
    app.register_blueprint(instructor, url_prefix='/')
    app.register_blueprint(programs, url_prefix='/')
    app.register_blueprint(feedback, url_prefix='/')
    app.register_blueprint(user, url_prefix='/')
    app.register_blueprint(google_calendar_bp, url_prefix='/api')
    
    with app.app_context():
        db.create_all()

        def create_admin():
            admin = User.query.filter_by(name='admin', account_type='admin').first()
            if not admin:
                # Create the admin user with default values
                name=os.environ.get('ADMIN_NAME')
                email=os.environ.get('ADMIN_EMAIL')
                password=os.environ.get('ADMIN_PASSWORD')
                new_admin = User(name=name, email=email, 
                                 password=generate_password_hash(password, method='scrypt', salt_length=2), 
                                 status='active', account_type='admin')
                db.session.add(new_admin)
                db.session.commit()

        create_admin()  # Call the function directly
            
    return app
