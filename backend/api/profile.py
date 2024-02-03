from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, \
    set_access_cookies, get_jwt, create_access_token
from datetime import datetime, timedelta, timezone
from .models import User
from . import db

profile = Blueprint('profile', __name__)

@profile.after_request
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

@profile.route('/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user:
        return jsonify({
            'id': user.id,
            'name': user.first_name,
            'email': user.email,
            'account_type': user.account_type,
            'status': user.status,
            'linkedin_url': user.linkedin_url,
            'about': user.about,
            'meeting_url': user.meeting_url,
            'auto_approve_appointments': user.auto_approve_appointments,
        }), 200
    else:
        return jsonify({'error': 'User does not exist'}), 404


def get_user_data(user_id):
    user = User.query.get(user_id)
    
    if user:
        return {
            'id': user.id,
            'name': user.first_name,
            'email': user.email,
            'account_type': user.account_type,
            'status': user.status,
            'linkedin_url': user.linkedin_url,
            'about': user.about,
            'meeting_url': user.meeting_url,
            'auto_approve_appointments': user.auto_approve_appointments,
        }
    else:
        return {'error': 'User does not exist'}
    

@profile.route('/profile/update', methods=['POST'])
@jwt_required()
def update_profile():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        user = User.query.filter_by(id=user_id).first()

        if not user:
            return jsonify({"error": "User doesn't exist"}), 404

        # Update fields if they are provided in the request
        if 'name' in data:
            user.first_name = data['name']
        if 'linkedin_url' in data:
            user.linkedin_url = data['linkedin_url']
        if 'about' in data:
            user.about = data['about']
        if 'meeting_url' in data:
            user.meeting_url = data['meeting_url']
        if 'auto_approve_appointments' in data:
            user.auto_approve_appointments = data['auto_approve_appointments']

        db.session.commit()
        response = get_user_data(user_id)
        return jsonify(response), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500