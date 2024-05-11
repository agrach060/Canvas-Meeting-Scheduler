import React from 'react';
import { useSupabaseClient } from "@supabase/auth-helpers-react";

function GoogleSignInButton() {
    const supabase = useSupabaseClient();

    async function googleSignIn() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar'
            }
        });
        if (error) {
            alert("Error logging into Google provider with Supabase");
            console.log(error);
        }
    }

    return (
        <button onClick={googleSignIn} className="bg-purple text-white h-10 w-full hover:text-gold hover:bg-purple rounded-lg">
            Sign In With Google
        </button>
    );
}

export default GoogleSignInButton;
