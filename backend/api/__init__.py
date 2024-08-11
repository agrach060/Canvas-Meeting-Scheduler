""" 
 * __init__.py
 * Last Edited: 5/19/24
 *
 * Contains initialization of the Flask App
 *
 * Known Bugs:
 * - 
 *
"""

from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from datetime import timedelta
from flask_session import Session

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Allow requests from localhost (React app during development)
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['SESSION_TYPE'] = 'filesystem'

    Session(app)
    CORS(app, supports_credentials=True)

    from .auth import auth
    from .admin import admin
    from .student import student
    from .instructor import instructor
    from .programs import programs
    from .feedback import feedback
    from .models import User
    from .user import user
    from .calendars.google_calendar import google_calendar_bp 
    
    ##create MySQL database##    
    load_dotenv()

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
