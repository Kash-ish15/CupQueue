const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
    try {
        const { name, email, password, userType } = req.body;

        if (!email || !password || !userType) {
            return res.status(400).json({ message: 'Please provide email, password, and userType' });
        }

        // Map frontend userType ('customer' | 'office') to backend role ('user' | 'admin' | 'office')
        const role = userType === 'office' ? 'office' : 'user';

        // Only allow one office user
        if (role === 'office') {
            const officeExists = await User.findOne({ role: 'office' });
            if (officeExists) {
                return res.status(400).json({ message: 'An office account already exists' });
            }
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name: name || email.split('@')[0], // Use part of email as name if not provided
            email,
            password,
            role,
        });

        if (user) {
            res.status(201).json({
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    userType: user.role === 'office' ? 'office' : 'customer',
                    token: generateToken(user._id),
                }
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during signup' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check for user email
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    userType: user.role === 'office' ? 'office' : 'customer',
                    token: generateToken(user._id),
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

module.exports = {
    signup,
    login,
};
