import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:5000/api/auth/google/callback',
  proxy: true,  // ← CRITICAL: trusts Railway's https proxy
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id })

    if (user) {
      return done(null, user)
    }

    user = await User.findOne({ email: profile.emails[0].value })

    if (user) {
      user.googleId = profile.id
      if (!user.avatar && profile.photos[0]) {
        user.avatar = profile.photos[0].value
      }
      await user.save({ validateBeforeSave: false })
      return done(null, user)
    }

    user = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0]?.value || '',
      isVerified: true,
    })

    await user.save({ validateBeforeSave: false })
    return done(null, user)
  } catch (err) {
    return done(err, null)
  }
}))

export default passport