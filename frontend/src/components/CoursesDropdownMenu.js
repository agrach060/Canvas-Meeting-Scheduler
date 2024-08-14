/* CoursesDropDownMenu.js
 * Last Edited: 7/26/24
 *
 * UI for courses dropdown menu
 *
 * Known Bugs:
 * -
 *
 */

import React from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { styled } from '@mui/system';

const StyledFormControl = styled(FormControl)({
    minWidth: 200,
    backgroundColor: '#4a148c',
    color: 'white',
    borderRadius: 4,
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'white',
    },
    '& .MuiSvgIcon-root': {
        color: 'white',
    },
    '& .MuiInputBase-input': {
        color: 'white',
    },
    '& .MuiInputLabel-root': {
        color: 'white',
    },
});

export default function CoursesDropdownMenu({ courses, handleChange, selectedCourse }) {
    const currentCourses = courses.filter((course) => course.term);
    return (
        <StyledFormControl variant="outlined">
            <InputLabel id="course-label">Courses</InputLabel>
            <Select
                labelId="course-label"
                value={selectedCourse || ''}
                onChange={handleChange}
                label="Courses"
            >
                {currentCourses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                        {course.name}
                    </MenuItem>
                ))}
            </Select>
        </StyledFormControl>
    );
}
