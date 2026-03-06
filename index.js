const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const session = require('express-session');
const flash = require('connect-flash');

const connectDB = require('./config/db');
const authRouter = require('./routers/authRoutes');

dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.static('public'))


app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net", // Allows Bootstrap & other JS from jsDelivr
          "https://cdn.tailwindcss.com",
          "https://connect.facebook.net",
          "https://www.facebook.com"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net" // Added: Allows Bootstrap CSS
        ],

        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net" // Added: Allows Bootstrap Icons/Fonts
        ],

        imgSrc: ["'self'", "data:", "https://www.svgrepo.com"],

        frameSrc: ["'self'", "https://www.facebook.com"],

        connectSrc: ["'self'", "https://accounts.google.com", "https://graph.facebook.com"],
      },
    },
  })
);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(flash());

// Make flash available in all EJS views
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.get('/', (req, res) => {
  res.render('home');
});

app.use('/', authRouter);
const tenantRouter = require('./routers/tenantRoutes');
app.use('/tenant', tenantRouter);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
