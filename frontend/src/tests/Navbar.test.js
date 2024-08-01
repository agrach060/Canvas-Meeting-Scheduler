import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import '@testing-library/jest-dom';
import Navbar from '../components/Navbar';
import { UserContext } from '../context/UserContext';

const renderNavbar = (user) => {
  render(
    <UserContext.Provider value={{ user }}>
      <Router>
        <Navbar />
      </Router>
    </UserContext.Provider>
  );
};

describe('Navbar Component', () => {
  test('renders Navbar with no user', () => {
    renderNavbar(null);

    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });

  test('renders Navbar for admin user', () => {
    const adminUser = { account_type: 'admin' };
    renderNavbar(adminUser);

    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage Users/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage Programs/i)).toBeInTheDocument();
    expect(screen.queryByText(/Login/i)).not.toBeInTheDocument();
  });

  test('renders Navbar for student user', () => {
    const studentUser = { account_type: 'student', status: 'active' };
    renderNavbar(studentUser);

    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Meetings/i)).toBeInTheDocument();
    expect(screen.getByText(/Reserve Appointment/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  test('renders Navbar for mentor user', () => {
    const mentorUser = { account_type: 'mentor', status: 'active' };
    renderNavbar(mentorUser);

    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Meetings/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Availability/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage Availability/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });
});
