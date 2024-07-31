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

export default function DropdownMenu({ courses, handleChange, selectedCourse }) {
    return (
        <StyledFormControl variant="outlined">
            <InputLabel id="course-label">Courses</InputLabel>
            <Select
                labelId="course-label"
                value={selectedCourse || ''}
                onChange={handleChange}
                label="Courses"
            >
                {courses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                        {course.name}
                    </MenuItem>
                ))}
            </Select>
        </StyledFormControl>
    );
}
