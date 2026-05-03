import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists with this googleId
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user);
        }

        // Check if email already exists (merge accounts)
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            user.googleId = profile.id;
            if (!user.avatar && profile.photos[0]) {
                user.avatar = profile.photos[0].value;
            }
            await user.save({ validateBeforeSave: false });
            return done(null, user);
        }

        // Create new user (no password for Google users)
        user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value || '',
            isVerified: true,
        });

        await user.save({ validateBeforeSave: false });

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

export default passport;