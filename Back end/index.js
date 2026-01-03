require('dotenv').config();
const express = require("express");
const os = require("os");
const app = express();
const authRoute=require("./router/auth-router");
const ConnectDb =require("./db");
const errorMiddleware=require("./middleware/error-middleware");
const cors = require("cors");
const adminRoute = require("./router/admin-router");
const otpRoute = require("./router/otp-router");
const patientRoute = require("./router/patient-router");
const caregiverRoute = require("./router/caregiver-router");


app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(express.json());

app.use("/api/auth",authRoute);
app.use("/api/admin",adminRoute);
app.use("/api/otp",otpRoute);
app.use("/api/patient",patientRoute);
app.use("/api/caregiver",caregiverRoute);
app.use(errorMiddleware);

const port = process.env.PORT || 5000;

function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

ConnectDb().then(() => {
    // Bind to 0.0.0.0 so the server is reachable from other devices on the LAN
    const listenHost = '0.0.0.0';
    const localIp = process.env.SERVER_IP || getLocalIp();
    app.listen(port, listenHost, () => {
        console.log(`Server running at http://${localIp}:${port} (bound to ${listenHost})`);
        console.log(`API available at: http://${localIp}:${port}/api`);
    });
});