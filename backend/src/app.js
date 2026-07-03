const express    = require('express');
const authRouter  = require('./routes/auth.route');
const notesRouter = require('./routes/notes.route');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:      process.env.FRONTEND_URL,
    credentials: true,   // needed for cookies
}));


app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);

module.exports = app;