import requests

class Canvas:
    def __init__(self, base_url, headers):
        self.base_url = base_url
        self.headers = headers

    def get_course(self, course_id, **kwargs):
        url = f"{self.base_url}/courses/{course_id}"
        response = requests.get(url, headers=self.headers, params=kwargs)
        response.raise_for_status()
        return response.json()

    def get_courses(self, **kwargs):
        url = f"{self.base_url}/courses"
        response = requests.get(url, headers=self.headers, params=kwargs)
        response.raise_for_status()
        return response.json()

    def get_user(self, user_id, **kwargs):
        url = f"{self.base_url}/users/{user_id}"
        response = requests.get(url, headers=self.headers, params=kwargs)
        response.raise_for_status()
        return response.json()

    def get_favorites(self, **kwargs):
        url = f"{self.base_url}/users/self/favorites/courses"
        response = requests.get(url, headers=self.headers, params=kwargs)
        response.raise_for_status()
        return response.json()

    def get_token(self, client_id, client_secret, code, redirect_uri):
        token_url = f"{self.base_url}/login/oauth2/token"
        data = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        }
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        return response.json()

    def refresh_token(self, client_id, client_secret, refresh_token):
        token_url = f"{self.base_url}/login/oauth2/token"
        data = {
            'refresh_token': refresh_token,
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'refresh_token'
        }
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        return response.json()
