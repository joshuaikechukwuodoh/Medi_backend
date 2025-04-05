const mongoose = require("mongoose");
const User = require("./User");

const PatientSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    medicalHistory: [{ type: String }],
    allergies: [{ type: String }],
});

module.exports = mongoose.model("Patient", PatientSchema);