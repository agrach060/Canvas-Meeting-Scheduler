from . import db
from datetime import datetime
from sqlalchemy import UniqueConstraint

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(150), unique=True)                                                          #  ADDED
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    first_name = db.Column(db.String(150))
    last_name = db.Column(db.String(150))                                                                        #  ADDED
    title = db.Column(db.String(10))                                                                             #  ADDED
    pronouns = db.Column(db.String(150))                                                                         #  ADDED(could change to array of string or something else)
    discord_id = db.Column(db.String(255))                                                                       #  ADDED
    calendar_link = db.Column(db.String(255))                                                                    #  ADDED
    status = db.Column(db.String(50)) # pending, active, inactive
    account_type=db.Column(db.String(50)) # student, mentor, admin
    about=db.Column(db.Text())
    linkedin_url = db.Column(db.String(255))
    meeting_url = db.Column(db.String(255))
    auto_approve_appointments = db.Column(db.Boolean, default=True)
    availabilities = db.relationship('Availability')
    mentor_settings = db.relationship('MentorMeetingSettings', backref='mentor', uselist=False)
    appointment_comment = db.relationship('AppointmentComment', backref='user', cascade='all, delete-orphan')
    
class MentorMeetingSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    max_daily_meetings = db.Column(db.Integer)
    max_weekly_meetings = db.Column(db.Integer)
    max_monthly_meetings = db.Column(db.Integer)

class ProgramType(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_id = db.Column(db.Integer, db.ForeignKey('class_information.id'))                                      # ADDED
    instructor_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    physical_location = db.Column(db.String(255))                                                                # ADDED
    virtual_link = db.Column(db.String(255))                                                                     # ADDED
    type = db.Column(db.String(150))
    description = db.Column(db.Text)
    duration = db.Column(db.Integer)  # Duration in minutes
    auto_approve_appointments = db.Column(db.Boolean, default=True)
    max_daily_meetings = db.Column(db.Integer)
    max_weekly_meetings = db.Column(db.Integer)
    max_monthly_meetings = db.Column(db.Integer)
    isDropins = db.Column(db.Boolean)


class Availability(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    class_id = db.Column(db.Integer, db.ForeignKey('class_information.id'))                                      # ADDED
    type = db.Column(db.String(50))
    date = db.Column(db.String(150))  # YYYY-MM-DD
    start_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    end_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    status = db.Column(db.String(50))  # active, inactive
    appointments = db.relationship(
        'Appointment', 
        back_populates='availability', 
        cascade='all, delete-orphan'
    )

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    class_id = db.Column(db.Integer, db.ForeignKey('class_information.id'))                                      # ADDED
    physical_location = db.Column(db.String(255))                                                                # ADDED
    type = db.Column(db.String(50))
    appointment_date = db.Column(db.String(150))  # YYYY-MM-DD
    start_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    end_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS
    status = db.Column(db.String(50))  # posted, booked, cancelled
    notes = db.Column(db.Text)    
    meeting_url = db.Column(db.String(255))
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    availability_id = db.Column(db.Integer, db.ForeignKey('availability.id'))
    availability = db.relationship('Availability', back_populates='appointments')
    appointment_comment = db.relationship('AppointmentComment', backref='appointment', cascade='all, delete-orphan')
    class_information = db.relationship('ClassInformation', back_populates='appointments')
    
    
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    student_rating = db.Column(db.String(255))
    student_notes = db.Column(db.Text)
    mentor_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    mentor_rating = db.Column(db.String(255))
    mentor_notes = db.Column(db.Text)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'))
    
class AppointmentComment(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    appointment_comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class ClassInformation(db.Model):                                                                          # ADDED
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)                                       # ADDED
    teacher_id = db.Column(db.Integer, db.ForeignKey('user.id'))                                           # ADDED
    quarter = db.Column(db.String(50))                                                                     # ADDED
    class_name = db.Column(db.String(255))                                                                 # ADDED
    class_location = db.Column(db.String(255))                                                             # ADDED
    class_link = db.Column(db.String(255))                                                                 # ADDED
    class_recordings_link = db.Column(db.String(255))                                                      # ADDED
    office_hours_location = db.Column(db.String(255))                                                      # ADDED
    office_hours_link = db.Column(db.String(255))                                                          # ADDED
    discord_link = db.Column(db.String(255))                                                               # ADDED
    class_comment = db.Column(db.Text)                                                                     # ADDED
    appointments = db.relationship('Appointment', back_populates='class_information')

class studentGroup(db.Model):                                                                              # ADDED
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)                                       # ADDED
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'))                                           # ADDED
    class_id = db.Column(db.Integer, db.ForeignKey('class_information.id'))                                # ADDED
    group_name = db.Column(db.String(150))                                                                 # ADDED
    
class CourseMembers(db.Model):                                                                             # ADDED
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)                                       # ADDED
    class_id = db.Column(db.Integer, db.ForeignKey('class_information.id'))                                # ADDED
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))                                              # ADDED
    role=db.Column(db.String(50)) # student, mentor, admin                                                 # ADDED

class ClassTimes(db.Model):                                                                                # ADDED
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)                                       # ADDED
    class_id = db.Column(db.Integer, db.ForeignKey('class_information.id'))                                # ADDED
    day = db.Column(db.String(50))                                                                         # ADDED
    start_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS                                          # ADDED
    end_time = db.Column(db.String(150))  # YYYY-MM-DDTHH:MM:SS                                            # ADDED
    program_id = db.Column(db.Integer, db.ForeignKey('program_type.id'))                                   # ADDED