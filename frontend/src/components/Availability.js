import React, { useState } from 'react';

const Availability = () => {
    const [selectedDate, setSelectedDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleStartTimeChange = (e) => {
        setStartTime(e.target.value);
    };

    const handleEndTimeChange = (e) => {
        setEndTime(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const availability = {
            user_id: 1,
            date: selectedDate,
            start_time: startTime,
            end_time: endTime,
        };

        try {
            const response = await fetch('/api/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(availability),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Availability added successfully:', result);
                window.alert("Availability added successfully!");
            } else {
                window.alert("Availability already exist!");
            }
        } catch (error) {
            console.error('Error adding availability:', error);
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Select Your Availability</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                    <label htmlFor="date" style={styles.label}>Select Date:</label>
                    <input
                        type="date"
                        id="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="startTime" style={styles.label}>Start Time:</label>
                    <input
                        type="time"
                        id="startTime"
                        value={startTime}
                        onChange={handleStartTimeChange}
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="endTime" style={styles.label}>End Time:</label>
                    <input
                        type="time"
                        id="endTime"
                        value={endTime}
                        onChange={handleEndTimeChange}
                        style={styles.input}
                    />
                </div>
                <button type="submit" style={styles.button}>Submit Availability</button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
    },
    title: {
        fontSize: '24px',
        marginBottom: '20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
    },
    input: {
        width: '100%',
        padding: '8px',
        fontSize: '16px',
    },
    button: {
        padding: '10px 20px',
        fontSize: '16px',
        color: '#fff',
        backgroundColor: '#4b2e83',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};

export default Availability;
