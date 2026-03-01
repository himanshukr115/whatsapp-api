const express = require('express')
const app = express()
app.set('view engine', 'ejs')

const port = 3000
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB(); // Must be called here

app.get('/', (req, res) => {
  res.render('home')
})

const authRouter = require('./routers/authRoutes');
console.log('authRouter:', typeof authRouter);
app.use('/', authRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})