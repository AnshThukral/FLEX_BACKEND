const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./Routes/authRouter');
const employeeRoutes = require('./Routes/employeeRouter');
const recruiterRoutes = require('./Routes/recruiterRouter');

app.use("/api/auth",authRoutes);
app.use("/api/employee",employeeRoutes);
app.use("/api/recruiter",recruiterRoutes);


app.get("/", (req, res) => {
  res.json("Hi");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(5001, () => {
      console.log("Server Running");
    });
  })
  .catch((error) => {
    console.log("Database Error: ",error);
  });


app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});