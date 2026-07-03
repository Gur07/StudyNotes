const { Router } = require('express');
const  authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authRouter = Router();

authRouter.post('/register',authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/getme', authMiddleware.authUser, authController.getMe);
authRouter.get('/logout', authController.logout);

module.exports = authRouter;