""" 
 * student.py
 * Last Edited: 3/26/24
 *
 * Contains functions which are applicable to
 * student user type
 *
 * Known Bugs:
 * - get_student_programs() can be simplified if it uses get_programs(course_id) from programs.py
 * - reserve_appointment(appointment_id, course_id): figure out a way to not use course_id as a parameter
 * - There are a good amount of functions that are close to identical with functions in
 *   instructor.py. These functions can be merged and put into user.py. These functions can accept
 *   students and instructors and will operate slightly different based on that.
 *
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, \
    set_access_cookies, get_jwt, create_access_token
from sqlalchemy import extract, or_, and_, func
from .models import User, Appointment, ProgramDetails, Availability, AppointmentComment, CourseDetails, CourseMembers
from . import db
from datetime import datetime, timedelta, timezone
from .mail import send_email
from .programs import get_program_name, get_course_name
from .user import is_student, is_instructor
from ics import Calendar, Event

student = Blueprint('student', __name__)

# token generator
@student.after_request
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
    
# get all of the global programs for a instructor
def get_global_programs(instructor_id):
    try:
        if is_instructor(instructor_id):
            # get all global programs for the instructor
            all_global_programs = ProgramDetails.query.filter(
                and_(ProgramDetails.course_id == None, ProgramDetails.instructor_id == instructor_id)
            ).all()

            # global programs found
            if all_global_programs:
                all_formatted_programs = []

                for program in all_global_programs:
                    # convert attributes to a object
                    program_info = {
                        'id': program.id,
                        'name': program.name,
                        'description': program.description,
                        'duration': program.duration,
                        'physical_location': program.physical_location,
                        'meeting_url': program.meeting_url,
                        'auto_approve_appointments': program.auto_approve_appointments,
                        'max_daily_meetings': program.max_daily_meetings,
                        'max_weekly_meetings': program.max_weekly_meetings,
                        'max_monthly_meetings': program.max_monthly_meetings,
                        'isDropins': program.isDropins,
                    }

                    # append object to list
                    all_formatted_programs.append(program_info)

                return all_formatted_programs
            else: 
                # no global programs found
                return None
        else:
            # instructor not found
            return None
    except Exception as e:
        return None

# Helper function to send confirmation email to attendee and host
def send_confirmation_email(appointment):
    attendee = User.query.get(appointment.attendee_id)
    host = User.query.get(appointment.host_id)

    if attendee and host:
        attendee_email_subject = f'{appointment.availability.program_details.name} confirmation: {appointment.appointment_date} at {appointment.start_time}.'
        attendee_email_content = f'Your {appointment.availability.program_details.name} appointment with {host.name} is confirmed for {appointment.appointment_date} at {appointment.start_time}.'

        host_email_subject = f'{appointment.availability.program_details.name} confirmation: {appointment.appointment_date} at {appointment.start_time}.'
        host_email_content = f'Your {appointment.availability.program_details.name} appointment with {attendee.name} is confirmed for {appointment.appointment_date} at {appointment.start_time}.'

        # Create datetime objs for ics file
        timezone_offset = "-08:00"  # PST timezone offset
        date_obj = datetime.strptime(str(appointment.appointment_date), "%Y-%m-%d")

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
        send_email(host.email, attendee_email_subject, attendee_email_content, ics_data)
        return True
    return False

# Helper function to get the start and end dates of the week for a given date
def get_week_range(date_str):
    date = datetime.strptime(date_str, '%Y-%m-%d')
    start_of_week = date - timedelta(days=date.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    return start_of_week.strftime('%Y-%m-%d'), end_of_week.strftime('%Y-%m-%d')

# Helper function to update appointments and availabilities status
def update_appointments_status(host_id, appointment_date, scope):
    parsed_appointment_date = datetime.strptime(appointment_date, '%Y-%m-%d')
    if scope == 'daily':
        # Update appointments for the day
        appointments = Appointment.query.filter(
            Appointment.host_id == host_id,
            func.date(Appointment.appointment_date) == appointment_date,
            Appointment.status == 'posted'
        ).all()
        # Update the availability for the day
        availabilities = Availability.query.filter(
            Availability.user_id == host_id,
            func.date(Availability.date) == appointment_date
        ).all()
    elif scope == 'weekly':
        start_of_week, end_of_week = get_week_range(appointment_date)
        # Update appointments for the week
        appointments = Appointment.query.filter(
            Appointment.host_id == host_id,
            func.date(Appointment.appointment_date).between(start_of_week, end_of_week),
            Appointment.status == 'posted'
        ).all()
        # Update availabilities for the week
        availabilities = Availability.query.filter(
            Availability.user_id == host_id,
            func.date(Availability.date).between(start_of_week, end_of_week)
        ).all()
    elif scope == 'monthly':
        #Your code here
        appointments = Appointment.query.filter(
            Appointment.host_id == host_id,
            extract('month', func.date(Appointment.appointment_date)) == parsed_appointment_date.month,
            extract('year', func.date(Appointment.appointment_date)) == parsed_appointment_date.year,
            Appointment.status == 'posted'
        ).all()

        # Update availabilities for the month
        availabilities = Availability.query.filter(
            Availability.user_id == host_id,
            extract('month', func.date(Availability.date)) == parsed_appointment_date.month,
            extract('year', func.date(Availability.date)) == parsed_appointment_date.year
        ).all()
        
    # Set all fetched appointments to 'inactive'
    for appt in appointments:
        appt.status = 'inactive'

    # Set all fetched availabilities to 'inactive'
    for avail in availabilities:
        avail.status = 'inactive'
    db.session.commit()

"""""""""""""""""""""""""""""""""""""""""""""""""""""
""               Endpoint Functions                ""
"""""""""""""""""""""""""""""""""""""""""""""""""""""
    
# Get all dropins for the courses a student is in
@student.route('/course/programs/dropins/<course_id>', methods=['GET'])
@jwt_required()
def get_student_dropins(course_id):
    try:
        user_id = get_jwt_identity()

        if is_student(user_id):
            member = CourseMembers.query.filter(CourseMembers.user_id==user_id, CourseMembers.course_id==course_id).first()

            if member:
                course_information = CourseDetails.query.filter(CourseDetails.id == member.course_id).first()
                programs_in_course = ProgramDetails.query.filter(ProgramDetails.course_id == member.course_id).all()

                all_formatted_programs = []

                if programs_in_course:
                    for program in programs_in_course:
                        program_info = {
                            'id': program.id,
                            'isDropins': program.isDropins,
                        }
                        all_formatted_programs.append(program_info)
                    
                # get global programs
                global_programs = get_global_programs(course_information.instructor_id)

                # if there are global programs: append to all_formatted_programs with their id and isDropins
                if global_programs is not None:
                    global_programs = [{'id': program['id'], 'isDropins': program['isDropins']} for program in global_programs]

                    for program in global_programs:
                        all_formatted_programs.append(program)

                # then filter by isDropins == True
                all_formatted_programs = [program for program in all_formatted_programs if program.get('isDropins') == True]

                dropin_times = []

                # for each program, get the availabilities attached to it
                for program in all_formatted_programs:
                    availabilities = Availability.query.filter_by(program_id=program.get('id')).all()

                    # for each availability, get the program id, name, date, start time, and end time
                    for availability in availabilities:
                        program_name = get_program_name(availability.program_details.id)

                        # convert attributes to a object
                        availability_info = {
                            'id': availability.id,
                            'name': program_name,
                            'date': availability.date,
                            'start_time': availability.start_time,
                            'end_time': availability.end_time,
                        }

                        # append object to return list
                        dropin_times.append(availability_info)

                # when all programs have been iterated through, return the list
                return jsonify(dropin_times), 200
            else:
                return jsonify({"msg": "User not found in course"}), 404
        else:
            return jsonify({"msg": "User not found"}), 404
    except Exception as e:
        print(f"FWF: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
# fetch all appointments a student is scheduled for
@student.route('/student/appointments', methods=['GET'])
@jwt_required()
def get_student_appointments_for_course():
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404

        meeting_type = request.args.get('type', 'all')
        current_time_pst = datetime.now(timezone.utc) - timedelta(hours=8)
        current_date_str = current_time_pst.strftime('%Y-%m-%d')
        current_time_str = current_time_pst.strftime('%H:%M')

        appointments_query = Appointment.query.filter(Appointment.attendee_id == student_id)

        # filter appointments based on meeting type
        if meeting_type in ['upcoming', 'past', 'pending']:
            if meeting_type == 'upcoming':
                appointments_query = appointments_query.filter(
                    or_(
                        Appointment.appointment_date > current_date_str,
                        and_(
                            Appointment.appointment_date == current_date_str,
                            Appointment.start_time >= current_time_str
                        )
                    ),
                    Appointment.status == 'reserved'
                )
            elif meeting_type == 'past':
                appointments_query = appointments_query.filter(
                    or_(
                        Appointment.appointment_date < current_date_str,
                        and_(
                            Appointment.appointment_date == current_date_str,
                            Appointment.start_time < current_time_str
                        )
                    ),
                    Appointment.status.in_(['reserved', 'completed', 'rejected', 'missed', 'canceled'])
                )
            elif meeting_type == 'pending':
                appointments_query = appointments_query.filter(
                    or_(
                        Appointment.appointment_date > current_date_str,
                        and_(
                            Appointment.appointment_date == current_date_str,
                            Appointment.start_time >= current_time_str
                        )
                    ),
                    Appointment.status == 'pending'
                )

        student_appointments = []
        appointments = appointments_query.all()

        # iterate through appointments
        for appt in appointments:
            host = User.query.get(appt.host_id) if appt.host_id else None
            # create an object for the host's information
            host_info = {
                "name": host.name,
                "title": host.title,
                "pronouns": host.pronouns,
                "email": host.email,
            } if host else {}

            # get program name and course name
            program_name = get_program_name(appt.availability.program_details.id)
            course_name = get_course_name(appt.course_id)

            # add appointment information to student_appointments
            student_appointments.append({
                "appointment_id": appt.id,
                "program_id": appt.availability.program_details.id,
                "name": program_name,
                "course_name": course_name,
                "date": appt.appointment_date,
                "start_time": appt.start_time,
                "end_time": appt.end_time,
                'event_id': appt.event_id,
                "status": appt.status,
                "notes": appt.notes,
                "physical_location": appt.physical_location,
                "meeting_url": appt.meeting_url,
                "host": host_info
            })

        return jsonify(student_appointments=student_appointments), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500
    
# fetch all of the programs for each course a student is enrolled in
@student.route('/student/programs/descriptions', methods=['GET'])
@jwt_required()
def get_student_programs():
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404
        
        all_student_courses = CourseDetails.query.join(CourseMembers, CourseDetails.id == CourseMembers.course_id).filter_by(user_id=student_id).all()

        if all_student_courses:

            all_programs = []

            for course in all_student_courses:
                all_programs_in_course = ProgramDetails.query.filter_by(course_id=course.id).all()

                # get global programs for instructor
                global_programs = get_global_programs(course.instructor_id)

                # for each program in course
                for program in all_programs_in_course:
                    # convert attributes to a object
                    program_info = {
                        'id': program.id,
                        'name': program.name,
                        'description': program.description,
                        'duration': program.duration,
                    }

                    # append object to list
                    all_programs.append(program_info)
                    
                # if there are global programs: append to all_programs
                if global_programs is not None:
                    for global_program in global_programs:
                        all_programs.append(global_program)
            
            return jsonify(all_programs), 200
        else: 
            # no courses found for student
            return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Cancel a specific appointment by its ID if it has been booked by the student
@student.route('/student/appointments/cancel/<appointment_id>', methods=['POST'])
@jwt_required()
def cancel_appointment(appointment_id):
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404
        
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({"error": "Appointment doesn't exist"}), 404
        
        # Check if the appointment was booked by this student 
        if appointment.status == 'reserved' or appointment.status == 'pending' and appointment.attendee_id == student.id:
            current_time = datetime.now() - timedelta(hours=8)
            appointment_datetime = datetime.strptime(appointment.appointment_date + ' ' + appointment.start_time, '%Y-%m-%d %H:%M')
            
            #check if the appointment is in the future
            if appointment_datetime > current_time:
                # Make the appointment available for reservation
                appointment.status = 'posted'
                appointment.meeting_url = None
                appointment.attendee_id = None
                appointment.notes = None
                appointment.event_id = None
                db.session.commit()
                return jsonify({"message": "Appointment cancelled successfully"}), 200
            else:
                return jsonify({"error": "Past appointments cannot be cancelled"}), 400
        else:
            return jsonify({"error": "Appointment cannot be cancelled"}), 400
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Get all appointment based programs for all courses a student is enrolled in
@student.route('/student/programs/appointment-based', methods=['GET'])
@jwt_required()
def get_appointment_programs():
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404
        
        student_courses = CourseDetails.query.join(CourseMembers, CourseDetails.id == CourseMembers.course_id).filter_by(user_id=student_id).all()
        converted_courses = [{'course_id': course.id, 'course_name': course.name} for course in student_courses]

        if student_courses:

            # return list of all courses
            courses_list = []

            for entry in converted_courses:
                course_id = entry['course_id']

                programs_in_course = ProgramDetails.query.filter_by(course_id=course_id).all()

                course = CourseDetails.query.filter_by(id=course_id).first()

                global_programs = get_global_programs(course.instructor_id)

                # list of all programs in a course
                programs_in_course_list = []

                for program in programs_in_course:
                    # check if program is not a dropin
                    if program.isDropins == False:
                        # convert attributes to a object
                        program_info = {
                            'id': program.id,
                            'name': program.name,
                            'description': program.description,
                            'duration': program.duration,
                            'physical_location': program.physical_location,
                            'meeting_url': program.meeting_url,
                            'auto_approve_appointments': program.auto_approve_appointments,
                            'max_daily_meetings': program.max_daily_meetings,
                            'max_weekly_meetings': program.max_weekly_meetings,
                            'max_monthly_meetings': program.max_monthly_meetings,
                            'isDropins': program.isDropins,
                        }

                        # append object to list
                        programs_in_course_list.append(program_info)

                # if global programs found and a dropin, append to programs_in_course_list 
                if global_programs is not None:
                    for global_program in global_programs:
                        if global_program['isDropins'] == False:
                            programs_in_course_list.append(global_program)

                # format data to append to courses_list
                formatTuple = {
                    'id': course_id,
                    'course_name': entry['course_name'],
                    'programs': programs_in_course_list
                }

                # append to courses_list
                courses_list.append(formatTuple)
            
            return jsonify(courses_list), 200
        else: 
            return jsonify({"error": "no courses found for student"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Retrieve available appointments to reserve for a student
@student.route('/student/appointments/available/<program_id>/<course_id>', methods=['GET'])
@jwt_required()
def get_available_appointments(program_id, course_id):
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404
        
        now = datetime.now()

        program = ProgramDetails.query.filter_by(id=program_id).first()

        if program:
            # convert to empty to match attribute in ProgramDetails
            if program.course_id == None:
                course_id = None
            
            # get all future appointments for the program
            future_appointments = Appointment.query.join(Availability).join(ProgramDetails).filter(
                (Appointment.status == 'posted') &
                (ProgramDetails.id == program_id) &
                (ProgramDetails.course_id == course_id) &
                (Appointment.appointment_date > now.date())
            ).all()


            available_appointments = []
            for appt in future_appointments:
                # convert attributes to a object
                appointment_data = {
                    "appointment_id": appt.id,
                    "physical_location": appt.physical_location,
                    "date": appt.appointment_date,
                    "program_id": appt.availability.program_details.id,
                    "start_time": appt.start_time,
                    "end_time": appt.end_time,
                    "status": appt.status,
                    "meeting_url": appt.meeting_url
                }

                # append object to list
                available_appointments.append(appointment_data)
                    
            return jsonify({"available_appointments": available_appointments})
        else:
            return jsonify({"error": "Program not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@student.route('/student/appointments/update_event_id/<appointment_id>', methods=['POST'])
@jwt_required()
def test_update_event_id(appointment_id):
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        
        if not event_id:
            return jsonify({"error": "Event ID is required"}), 400

        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"error": "Appointment not found"}), 404

        appointment.event_id = event_id
        db.session.commit()

        return jsonify({"message": "Event ID updated successfully"}), 200

    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": str(e)}), 500

# reserve an appointment for a student
@student.route('/student/appointments/reserve/<appointment_id>/<course_id>', methods=['POST'])
@jwt_required()
def reserve_appointment(appointment_id, course_id):
    try:
        student_id = get_jwt_identity()

        student = User.query.get(student_id)
        if not student or student.account_type != 'student':
            return jsonify({"error": "Only students are allowed to book sessions!"}), 400
        
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment or appointment.status != 'posted':
            return jsonify({"error": "Appointment is not available for reservation"}), 400
        
        data = request.get_json()

        current_time = datetime.now() - timedelta(hours=8)
        appointment_datetime = datetime.strptime(appointment.appointment_date + ' ' + appointment.start_time, '%Y-%m-%d %H:%M')
        if appointment_datetime <= current_time:
            return jsonify({"error": "Cannot reserve past appointments"}), 400

        instructor_limits = ProgramDetails.query.filter_by(id=appointment.availability.program_details.id).first()

        # Calculate week range for the appointment
        start_of_week, end_of_week = get_week_range(appointment.appointment_date)

        # Count current reserved and pending appointments for the day
        daily_count = Appointment.query.filter(
            Appointment.host_id == appointment.host_id,
            func.date(Appointment.appointment_date) == appointment.appointment_date,
            Appointment.status.in_(['reserved', 'pending'])
        ).count()

        # Count current reserved and pending appointments for the week
        weekly_count = Appointment.query.filter(
            Appointment.host_id == appointment.host_id,
            func.date(Appointment.appointment_date).between(start_of_week, end_of_week),
            Appointment.status.in_(['reserved', 'pending'])
        ).count()
        
        parsed_appointment_date = datetime.strptime(appointment.appointment_date, '%Y-%m-%d')

        # Count current reserved and pending appointments for the month
        monthly_count = Appointment.query.filter(
            Appointment.host_id == appointment.host_id,
            extract('month', func.date(Appointment.appointment_date)) == parsed_appointment_date.month,
            extract('year', func.date(Appointment.appointment_date)) == parsed_appointment_date.year,
            Appointment.status.in_(['reserved', 'pending'])
        ).count()
        
        # Check against daily and weekly limits
        if (not instructor_limits) or (daily_count < instructor_limits.max_daily_meetings and \
            weekly_count < instructor_limits.max_weekly_meetings and monthly_count < instructor_limits.max_monthly_meetings):
            try:
                appointment.attendee_id = student_id
                appointment.course_id = course_id
                appointment.notes = data.get('notes', None)
                appointment.event_id = data.get('event_id')
                if instructor_limits.auto_approve_appointments:
                    appointment.status = 'reserved'
                else:
                    appointment.status = 'pending'
                appointment.course_id = course_id
                    
                # Check if this appointment hits the daily or weekly limit
                hits_daily_limit = daily_count + 1 == instructor_limits.max_daily_meetings
                hits_weekly_limit = weekly_count + 1 == instructor_limits.max_weekly_meetings
                hits_monthly_limit = monthly_count + 1 == instructor_limits.max_monthly_meetings
                db.session.commit()
                
                if hits_daily_limit:
                    update_appointments_status(appointment.host_id, appointment.appointment_date, 'daily')
                elif hits_weekly_limit:
                    update_appointments_status(appointment.host_id, appointment.appointment_date, 'weekly')
                elif hits_monthly_limit:
                    update_appointments_status(appointment.host_id, appointment.appointment_date, 'monthly')

                
                if appointment.status == 'reserved':
                    send_email_success = send_confirmation_email(appointment)
                    if send_email_success:
                        return jsonify({"message": "Appointment reserved and confirmation email sent", "status": appointment.status}), 201
                    else:
                        return jsonify({"message": "Appointment reserved but email not sent", "status": appointment.status}), 202
                else:
                    return jsonify({"message": "Appointment pending approval", "status": appointment.status}), 201
            except Exception as e:
                db.session.rollback()
                print(f"Exception: {str(e)}")
                return jsonify({"error": f"Exception: {str(e)}"}), 500
        else:
            # Update remaining slots if limits are reached
            if daily_count >= instructor_limits.max_daily_meetings:
                update_appointments_status(appointment.host_id, appointment.appointment_date, 'daily')
            elif weekly_count >= instructor_limits.max_weekly_meetings:
                update_appointments_status(appointment.host_id, appointment.appointment_date, 'weekly')
            return jsonify({"message": "Meeting limit reached"}), 409
    except Exception as e:
        print(f"ERM: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Create comments for specific appointment as a student
@student.route('/student/appointments/<appointment_id>/comment', methods=['POST'])
@jwt_required()
def create_comment(appointment_id):
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404
        
        data = request.get_json()
        
        appointment_comment = data.get('appointment_comment')
        appointment = Appointment.query.get(appointment_id)
        
        if appointment and appointment_comment:
            # create new AppointmentComment tuple
            new_comment = AppointmentComment(
                appointment_id=appointment_id,
                user_id=student_id,
                appointment_comment=appointment_comment,
                created_at=datetime.now()
            )
            db.session.add(new_comment)
            db.session.commit()
            return jsonify({"message": "comment created successfully"}), 200 
        else:
            return jsonify({"error": "appointment not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Get comments for specific appointment as a student
@student.route('/student/appointments/<appointment_id>/comment', methods=['GET'])
@jwt_required()
def get_comments(appointment_id):
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404
        
        appointment = Appointment.query.get(appointment_id)
        
        if appointment:
            comments = AppointmentComment.query.filter_by(appointment_id=appointment_id).join(User, AppointmentComment.user_id == User.id).all()
            comments_list = []
            for comment in comments:
                # convert attributes to a object
                comment_info = {
                    'id': comment.id,
                    'name': comment.user.name,
                    'pronouns': comment.user.pronouns,
                    'user_id': comment.user_id,
                    'appointment_comment': comment.appointment_comment,
                    'created_at': comment.created_at
                }
                comments_list.append(comment_info)
            return jsonify({"comments": comments_list}), 200
        else:
            return jsonify({"error": "appointment not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Delete comments for specific appointment as a student
@student.route('/student/appointments/<appointment_id>/comment/<comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(appointment_id, comment_id):
    try:
        student_id = get_jwt_identity()

        if not is_student(student_id):
            return jsonify({"error": "Student not found"}), 404
        
        appointment = Appointment.query.get(appointment_id)
        comment = AppointmentComment.query.get(comment_id)
        
        if appointment and comment:
            # if student wrote the comment, delete it
            if comment.user_id == student_id:
                db.session.delete(comment)
                db.session.commit()
                return jsonify({"message": "comment deleted successfully"}), 200
            else:
                return jsonify({"error": "unauthorized"}), 403
        else:
            return jsonify({"error": "appointment or comment not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500