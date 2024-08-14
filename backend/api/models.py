""" 
 * models.py
 * Last Edited: 8/14/24
 *
 * Contains all Tables and their attributes using SQLAlchemy
 *
 * Known Bugs:
 * - 
 *
"""

from . import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    status = db.Column(db.String(50)) # pending, active, inactive
    email = db.Column(db.String(150), unique=True)
    title = db.Column(db.String(10))
    name = db.Column(db.String(150))
    sortable_name = db.Column(db.String(150))
    pronouns = db.Column(db.String(150))
    discord_id = db.Column(db.String(255))
    zoom_link = db.Column(db.String(255))
    calendar_type = db.Column(db.String(150))
    calendar_link = db.Column(db.String(255))
    availabilities = db.relationship('Availability')
    appointment_comment = db.relationship('AppointmentComment', backref='user', cascade='all, delete-orphan')

class CourseDetails(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    quarter = db.Column(db.String(50))
    name = db.Column(db.String(255))
    physical_location = db.Column(db.String(255))
    meeting_url = db.Column(db.String(255))
    recordings_link = db.Column(db.String(255))
    discord_link = db.Column(db.String(255))
    comments = db.Column(db.Text)
    times = db.relationship("CourseTimes", back_populates="course_details")
    google_credentials = db.Column(db.JSON, nullable=True)
    instructor_email = db.Column(db.String(255))

class CourseTimes(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course_details.id'))
    day = db.Column(db.String(50))
    start_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    end_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    course_details = db.relationship("CourseDetails", back_populates="times")
    
class CourseMembers(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course_details.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    enrollment_type = db.Column(db.String(150))

class ProgramDetails(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course_details.id'))
    instructor_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    name = db.Column(db.String(150))
    description = db.Column(db.Text)
    physical_location = db.Column(db.String(255))
    meeting_url = db.Column(db.String(255))
    duration = db.Column(db.Integer)  # Duration in minutes
    auto_approve_appointments = db.Column(db.Boolean, default=True)
    max_daily_meetings = db.Column(db.Integer)
    max_weekly_meetings = db.Column(db.Integer)
    max_monthly_meetings = db.Column(db.Integer)
    isDropins = db.Column(db.Boolean)
    isRangeBased = db.Column(db.Boolean)
    availability = db.relationship("Availability", back_populates="program_details")
    program_times = db.relationship("ProgramTimes", back_populates="program_details")

class ProgramTimes(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    program_id = db.Column(db.Integer, db.ForeignKey('program_details.id'))
    day = db.Column(db.String(50))
    start_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    end_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    program_details = db.relationship("ProgramDetails", back_populates="program_times")

class Availability(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    program_id = db.Column(db.Integer, db.ForeignKey('program_details.id'))  
    date = db.Column(db.String(150))  # YYYY-MM-DD
    start_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    end_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    status = db.Column(db.String(50))  # active, inactive
    appointments = db.relationship(
        'Appointment', 
        back_populates='availability', 
        cascade='all, delete-orphan'
    )
    program_details = db.relationship("ProgramDetails", back_populates="availability")

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    host_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    course_id = db.Column(db.Integer, db.ForeignKey('course_details.id'))  
    attendee_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    availability_id = db.Column(db.Integer, db.ForeignKey('availability.id'))
    appointment_date = db.Column(db.String(150))  # YYYY-MM-DD
    start_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    end_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    physical_location = db.Column(db.String(255))
    meeting_url = db.Column(db.String(255))
    notes = db.Column(db.Text)
    status = db.Column(db.String(50))  # posted, booked, cancelled
    availability = db.relationship('Availability', back_populates='appointments')
    appointment_comment = db.relationship('AppointmentComment', backref='appointment', cascade='all, delete-orphan')
    
class AppointmentComment(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    appointment_comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'))
    attendee_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    host_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    attendee_rating = db.Column(db.String(255))
    attendee_notes = db.Column(db.Text)
    host_rating = db.Column(db.String(255))
    host_notes = db.Column(db.Text)