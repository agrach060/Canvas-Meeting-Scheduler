import os
from canvasAPI.canvas import Canvas
import requests
from flask import current_app


class canvas_services:
    """
    The main class to be instantiated to perform Canvas operations and to 
    provide access to Canvas's API.
    """
    def __init__(self, base_url, canvas_headers):
        """
        :param base_url: The base URL of the Canvas instance's API.
        :type base_url: str
        :param access_token: The API key to authenticate requests with.
        :type access_token: json
        """
        self.canvasapi = Canvas(base_url, canvas_headers)

    def get_canvas_user_profile(user_id):
        headers = {
            'Authorization': f'Bearer {current_app.config["CANVAS_API_KEY"]}'
        }
        response = requests.get("https://canvas.uw.edu/api/v1/users/self/profile", headers=headers)
        print("CANVAS USER PROFILE RESPONSE: " , response)
        if response.status_code == 200:
            return response.json()
        else:
            response.raise_for_status()

if __name__ == "__main__":
    canvas_services.main()