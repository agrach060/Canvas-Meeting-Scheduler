import React, { useState, useEffect } from 'react';

function LoginButton({ isLoggedIn, setIsLoggedIn, onLogout, setRoles }) {
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    fetch('/api/get-client-id')
      .then(response => response.json())
      .then(data => {
        setClientId(data.client_id);
      })
      .catch(error => {
        console.error("Failed to fetch client_id:", error);
      });
  }, []);

  const handleClick = () => {
    const scopes = [
      'url:GET|/api/v1/courses',
      'url:GET|/api/v1/users/:user_id/courses',
      'url:GET|/api/v1/courses/:course_id/groups',
      'url:GET|/api/v1/courses/:course_id/settings',
      'url:GET|/api/v1/group_categories/:group_category_id',
      'url:GET|/api/v1/courses/:course_id/search_users',
      'url:GET|/api/v1/groups/:group_id',
      'url:GET|/api/v1/courses/:course_id/group_categories',
      'url:GET|/api/v1/group_categories/:group_category_id/groups',
      // 'url:GET|/api/v1/users/:user_id/enrollments'
    ];

    const redirect_uri = window.location.origin;
    const scopeParam = scopes.join(' ');
    const client_id = clientId;
    const response_type = 'code';
    const state = 'YYY';
    const authUrl = `https://canvas.uw.edu/login/oauth2/auth?client_id=${client_id}&response_type=${response_type}&redirect_uri=${redirect_uri}&state=${state}&scope=${scopeParam}`;
    window.location.href = authUrl;
  };

  useEffect(() => {
    const handleAuthCallback = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      if (code) {
        fetch('/api/authorization-code', {
          method: 'POST',
          body: JSON.stringify({ code: code, currentUrl: window.location.origin }),
          headers: { 'Content-Type': 'application/json' },
        })
          .then(response => {
            if (response.status === 200) {
              setIsLoggedIn(true);
              fetchRoles();
            }
          })
          .catch(error => {
            console.log(error);
          });
      } else {
        fetch('/api/check-login')
          .then(response => response.json())
          .then(data => {
            setIsLoggedIn(data.isLoggedIn);
            if (data.isLoggedIn) {
              console.log('setting the roles');
              setRoles(data.roles || []);
            }
          })
          .catch(error => {
            console.log(error);
            setIsLoggedIn(false);
          });
      }
    };

    const fetchRoles = () => {
      fetch('/api/check-login')
        .then(response => response.json())
        .then(data => {
          if (data.isLoggedIn) {
            setRoles(data.roles || []);
          }
        })
        .catch(error => {
          console.log(error);
        });
    };

    window.addEventListener('load', handleAuthCallback);
    return () => {
      window.removeEventListener('load', handleAuthCallback);
    };
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    if (onLogout) {
      onLogout();
    }
    setRoles([]);
    sessionStorage.removeItem('authorizationCode');
    fetch('/api/access_token', {
      method: 'DELETE',
    })
      .catch(error => {
        console.log(error);
      });
  };

  return (
    <div>
      {isLoggedIn ? (
        <button onClick={handleLogout}>LOGOUT</button>
      ) : (
        <button onClick={handleClick}>LOGIN WITH CANVAS</button>
      )}
    </div>
  );
}

export default LoginButton;
