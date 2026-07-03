const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const tokenBlacklistModel = require("../models/blacklist.model")

const AUTH_COOKIE_NAME = "token";
const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/"
};

async function register(req, res) {
    const { username, email, password } = req.body;

    if(!username || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        })
    }
    const existingUser = await userModel.findOne({ $or: [{ username }, { email }] });

    if(existingUser) {
        return res.status(400).json({
            success: false,
            message: "User already exists"
        })
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userModel.create({ username, email, password: hashedPassword });
        const token = JWT.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "User registration failed",
            error: error.message
        })
    }
}

async function login(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if(!user) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password"
        })
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password"
        })
    }

    const token = JWT.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    res.status(200).json({
        success: true,
        message: "User logged in successfully",
        user
    })

}

async function getMe(req, res) {
    const user = await userModel.findById(req.user.userId)
    res.status(200).json({
        success: true,
        user
    })
}

async function logout(req, res) {
    const token = req.cookies?.[AUTH_COOKIE_NAME]

    if (token) {
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS)

    res.status(200).json({
        message: "User logged out successfully"
    })
}

module.exports = {
    register,
    login,
    getMe,
    logout
}
