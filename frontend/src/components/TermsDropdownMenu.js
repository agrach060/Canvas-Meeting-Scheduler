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

export default function TermsDropdownMenu({ terms, handleTermChange, selectedTerm }) {
    return (
        <StyledFormControl variant="outlined">
            <InputLabel id="term-label">Terms</InputLabel>
            <Select
                labelId="term-label"
                value={selectedTerm || ''}
                onChange={handleTermChange}
                label="Terms"
            >
                {terms.map((term) => (
                    <MenuItem key={term.id} value={term.id}>
                        {term.name}
                    </MenuItem>
                ))}
            </Select>
        </StyledFormControl>
    );
}
