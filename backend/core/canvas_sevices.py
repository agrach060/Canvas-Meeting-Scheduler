import os
from canvasAPI.canvas import Canvas

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

if __name__ == "__main__":
    canvas_services.main()