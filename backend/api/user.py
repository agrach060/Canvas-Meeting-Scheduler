""" 
 * user.py
 * Last Edited: 3/26/24
 *
 * Contains functions which are applicable to
 * students and instructor user types
 *
 * Known Bugs:
 * - 
 *
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, \
    set_access_cookies, get_jwt, create_access_token
from .models import User, Appointment, ProgramDetails, CourseDetails, CourseMembers, ProgramTimes, CourseTimes
from . import db
from .mail import send_email
from ics import Calendar, Event
from datetime import datetime, timedelta, timezone

user = Blueprint('user', __name__)

# token generator
@user.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()["exp"]
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=30))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(identity=get_jwt_identity())
            set_access_cookies(response, access_token)
        return response
    except (RuntimeError, KeyError):
        # Case where there is not a valid JWT. Just return the original response
        return response
    
"""""""""""""""""""""""""""""""""""""""""""""""""""""
""             Backend Only Functions              ""
"""""""""""""""""""""""""""""""""""""""""""""""""""""

# check if user is an instructor
def is_instructor(user_id):
    instructor = User.query.get(user_id)
    return instructor.account_type == 'instructor' if instructor else False

# check if user is an student
def is_student(user_id):
    student = User.query.get(user_id)
    return student.account_type == 'student' if student else False

# convert a military time object to a standard time object
def convert_to_standard_time(military_time):
    military_time_obj = datetime.strptime(military_time, "%H:%M")
    formatted_hours = military_time_obj.strftime("%I").lstrip("0")
    standard_time = military_time_obj.strftime(f"{formatted_hours}:%M %p")

    return standard_time

# based on the given program id and name, print the times for the program in a string format
def findStandardTimes(id, name):
    try:
        # search through CourseTimes
        if name == "Course Details":
            tuples = (
                CourseTimes.query
                .join(CourseDetails, CourseTimes.course_id == CourseDetails.id)
                .filter(CourseDetails.id == id)
            )
            details = tuples.first().course_details if tuples.first() else None

        # search through ProgramTimes
        else:
            tuples = (
                ProgramTimes.query
                .join(ProgramDetails, ProgramTimes.program_id == ProgramDetails.id)
                .filter(ProgramDetails.course_id == id, ProgramDetails.name == name)
            )
            details = tuples.first().program_details if tuples.first() else None

        # set physical_location and link
        times = ""
        physical_location = details.physical_location if details else "No Location"
        link = details.meeting_url if details else "No URL"

        tuples = tuples.all()

        if tuples:
            # convert the times to a string format
            tempString = ""
            for obj in tuples:
                if tempString:
                    tempString += "/"
                tempString += (
                    obj.day + " " + convert_to_standard_time(obj.start_time) + "-" +
                    convert_to_standard_time(obj.end_time)
                )
            times = tempString
        else:
            times = "No Known Times"

        return {'times': times, 'physical_location': physical_location, 'link': link }
    except Exception as e:
        return {"error": str(e)}, 404

# based on the given program name and instructor_id, print the times for their office hours in a string format
def findInstructorOfficeHours(name, instructor_id):
    try:
        # search through ProgramTimes
        program = (
            ProgramTimes.query
            .join(ProgramDetails, ProgramTimes.program_id == ProgramDetails.id)
            .filter(ProgramDetails.course_id == None, ProgramDetails.name == name, ProgramDetails.instructor_id == instructor_id)
        )

        program_details = program.first().program_details if program.first() else None

        # set physical_location and link
        times = ""
        physical_location = program_details.physical_location if program_details else "No Location"
        link = program_details.meeting_url if program_details else "No URL"
        
        program = program.all()

        if len(program) > 0:
            # convert the times to a string format
            tempString = ""
            for obj in program:
                if tempString != "":
                    tempString += "/"
                tempString += (obj.day + " " + convert_to_standard_time(obj.start_time) + "-" + convert_to_standard_time(obj.end_time))
            times = tempString
        else:
            times = "No Known Times"

        return {'times': times, 'physical_location': physical_location, 'link': link }
    except Exception as e:
        return jsonify({"error": str(e)}), 401

# get all of the attributes of a user_id from the User table
def get_user_data(user_id):
    try:
        user = User.query.get(user_id)

        if user:
            return {
                'id': user.id,
                'name': user.name,
                'pronouns': user.pronouns,
                'title': user.title,
                'discord_id': user.discord_id,
                'email': user.email,
                'account_type': user.account_type,
                'status': user.status,
                'calendar_link': user.calendar_link,
            }
        else:
            return {'error': 'User does not exist'}
    except Exception as e:
        return jsonify({"error": str(e)}), 401
    
# Helper function to send confirmation email to attendee and host
def send_confirmation_email(appointment):
    attendee = User.query.get(appointment.attendee_id)
    host = User.query.get(appointment.host_id)

    if attendee and host:
        attendee_email_subject = f'{appointment.availability.program_details.name} Status Update'
        if appointment.status == 'reserved':
            attendee_email_content = f'Your {appointment.availability.program_details.name} appointment with {host.name} has been reserved for {appointment.appointment_date} at {appointment.start_time}.'
        else:
            attendee_email_content = f'Your {appointment.availability.program_details.name} appointment has been rejected for unknown reason {appointment.appointment_date} at {appointment.start_time}.'
        attendee_email_content = f'Your {appointment.availability.program_details.name} appointment with {host.name} is confirmed for {appointment.appointment_date} at {appointment.start_time}.'

        host_email_subject = f'{appointment.availability.program_details.name} confirmation: {appointment.appointment_date} at {appointment.start_time}.'
        host_email_content = f'Your {appointment.availability.program_details.name} appointment with {attendee.name} is confirmed for {appointment.appointment_date} at {appointment.start_time}.'

        # Create datetime objs for ics file
        timezone_offset = "-08:00"  # PST timezone offset
        date_obj = datetime.strptime(appointment.appointment_date, "%Y-%m-%d")
        start_time_obj = datetime.strptime(appointment.start_time, "%H:%M")
        end_time_obj = datetime.strptime(appointment.end_time, "%H:%M")

        # Combine date and time
        combined_start_datetime = date_obj + timedelta(hours=start_time_obj.hour, minutes=start_time_obj.minute)
        combined_end_datetime = date_obj + timedelta(hours=end_time_obj.hour, minutes=end_time_obj.minute)

        # Format the combined datetime with timezone offset
        formatted_start_datetime = combined_start_datetime.strftime("%Y-%m-%dT%H:%M:%S") + timezone_offset
        formatted_end_datetime = combined_end_datetime.strftime("%Y-%m-%dT%H:%M:%S") + timezone_offset
        
        # Create an .ics file for the appointment
        cal = Calendar()
        event = Event()
        event.name = str(appointment.availability.program_details.name)
        event.begin = formatted_start_datetime
        event.end = formatted_end_datetime
        cal.events.add(event)
        ics_data = cal.serialize()
        
        # Attach the .ics file to the email
        send_email(attendee.email, attendee_email_subject, attendee_email_content, ics_data)
        return True
    return False

"""""""""""""""""""""""""""""""""""""""""""""""""""""
""               Endpoint Functions                ""
"""""""""""""""""""""""""""""""""""""""""""""""""""""
    
# get the course info for all courses a user is registered in
@user.route('/user/courses', methods=['GET'])
@jwt_required()
def get_user_courses():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user:
            user_courses_info = CourseDetails.query.join(CourseMembers, CourseDetails.id == CourseMembers.course_id).filter_by(user_id=user_id).all()

            courses_list = []
            for course in user_courses_info:
                # get the course times
                courseTimes = findStandardTimes(course.id, "Course Details")

                # get the office hours attached to the instructor
                globalOfficeHours = findInstructorOfficeHours("Office Hours", course.instructor_id)

                # get the office hours attached to the course
                courseOfficeHours = findStandardTimes(course.id, "Office Hours")

                # set the office hours to the course office hours if they exist, otherwise set them to the global office hours
                if courseOfficeHours['times'] != "No Known Times":
                    officeHours = courseOfficeHours
                else:
                    officeHours = globalOfficeHours

                # convert attributes to a object
                course_info = {
                    'id': course.id,
                    'course_name': course.name,
                    'comments': course.comments,
                    'physical_location': course.physical_location,
                    'meeting_url': course.meeting_url,
                    'recordings_link': course.recordings_link,
                    'discord_link': course.discord_link,
                    'instructor_id': course.instructor_id,
                    'course_times': courseTimes,
                    'office_hours': officeHours
                }
                
                # append object to return list
                courses_list.append(course_info)
            return jsonify(courses_list), 200
        else:
            return jsonify({"error": "user not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500  
    
# get the profile details for a user
@user.route('/user/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    user = User.query.get(user_id)
    
    if user:
        return jsonify({
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'title': user.title,
            'pronouns': user.pronouns,
            'discord_id': user.discord_id,
            'account_type': user.account_type,
            'calendar_link': user.calendar_link,
        }), 200
    else:
        return jsonify({'error': 'User does not exist'}), 404
    
# edit the profile details for a user
@user.route('/user/profile', methods=['POST'])
@jwt_required()
def update_user_profile():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        user = User.query.filter_by(id=user_id).first()
        
        if not user:
            return jsonify({"error": "User doesn't exist"}), 404

        # Update fields if they are provided in the request
        if 'name' in data:
            user.name = data['name']
        if 'pronouns' in data:
            user.pronouns = data['pronouns']
        if 'title' in data:
            user.title = data['title']
        if 'discord_id' in data:
            user.discord_id = data['discord_id']
       

        db.session.commit()

        # return updated user data
        return jsonify(get_user_data(user_id)), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Update an appointments's notes and meeting_url
@user.route('/appointment/update', methods=['POST'])
@jwt_required()
def update_meeting():
    try:
        data = request.get_json()

        appointment_id = data.get('appointment_id')
        notes = data.get('notes', None)  # Default to None if not provided
        meeting_url = data.get('meeting_url', None)  # Default to None if not provided

        appointment = Appointment.query.filter_by(id=appointment_id).first()

        if appointment:
            if notes is not None:
                appointment.notes = notes
            if meeting_url is not None:
                appointment.meeting_url = meeting_url
            db.session.commit()
            return jsonify({"message": "Meeting updated successfully"}), 200
        else:
            return jsonify({"error": "Appointment doesn't exist"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# update an appointment's status
@user.route('/appointment/update/status', methods=['POST'])
@jwt_required()
def update_meeting_status():
    try:
        data = request.get_json()
        
        appointment_id = data.get('appointment_id')
        status = data.get('status')

        appointment = Appointment.query.get(appointment_id)

        if appointment:
            appointment.status = status
            db.session.commit()
            if appointment.status == 'reserved':
                send_confirmation_email(appointment)
            return jsonify({"message": "status updated successfully"}), 200
        else:
            return jsonify({"error": "appointment not found"}), 404
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500
