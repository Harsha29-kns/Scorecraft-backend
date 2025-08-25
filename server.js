const express = require("express");
const connectDB = require("./db");
const EventRegister = require("./routes/EventRegister");
const socketio = require("socket.io");
const app = express();
const server = require("http").createServer(app);
const io = socketio(server, { cors: { origin: "*" } });
const cors = require("cors");
const Innov = require("./modles/innov");

// --- Server State Variables ---
let prev = "";
let domains = [
    { id: "1", name: "EdTech",
       slots: 10,
        description: "Innovations for enhancing learning experiences, course management, and skill development." },
    { id: "2",
       name: "Campus Automation",
        slots: 10,
         description: "Solutions for smart attendance, resource allocation." },
    { id: "3",
       name: "HealthTech",
        slots: 10,
         description: "Apps for mental health, fitness tracking, and on-campus medical assistance." },
    { id: "4",
       name: "HostelConnect",
        slots: 10,
         description: "Platforms for room allocation, maintenance requests, and complaint tracking." },
    { id: "5",
       name: "FoodieHub",
        slots: 10,
         description: "Apps for food ordering, meal pre-booking, and digital payments." },
    { id: "6",
       name: "GreenCampus",
        slots: 10,
         description: "Eco-friendly solutions for waste management and energy efficiency." },
    { id: "7",
       name: "Transport Solutions",
        slots: 10,
         description: "Smart transportation, tracking, and optimization of on-campus buses and cabs." },
    { id: "8",
       name: "Student Engagement",
        slots: 10,
        description: "Apps for student clubs, campus events, and extracurricular activities management." },
    { id: "9",
       name: "Digital Learning Platforms",
        slots: 10,
         description: "Interactive e-learning platforms, content sharing, and peer-to-peer learning." },
];
let domainStat = false;
let reminders = [];
let latestPPT = null;
let registrationLimit = 60;
let registrationOpenTime = null; // Stores the ISO timestamp for the opening time
let isForcedClosed = false;     // To handle manual closing by an admin

// --- Express Setup & Middleware ---
app.use(cors({ origin: "*" }));
app.use(express.json());

app.use(async (req, res, next) => {
    req.io = io;
    req.registrationLimit = registrationLimit;
    
    // Check the current status and attach it to the request object
    const count = await Innov.countDocuments({});
    const isBeforeOpenTime = registrationOpenTime && new Date() < new Date(registrationOpenTime);
    const isFull = count >= registrationLimit;
    
    req.isRegClosed = isFull || isForcedClosed || isBeforeOpenTime;

    next();
});

app.use("/event", EventRegister);

// --- Express Routes ---
app.get("/domains", (req, res) => {
    res.status(200).json(domains);
});

app.get("/", (req, res) => {
    res.send("hi i am server of scorecraft this is my home page.");
});

app.post("/api/admin/update-score/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { gameScore } = req.body;
        const team = await Innov.findById(id);
        if (!team) {
            return res.status(404).json({ message: "Team not found." });
        }
        team.GameScore = Number(gameScore);
        await team.save();
        const updatedLeaderboard = await Innov.find({}).sort({ GameScore: -1 });
        io.emit("leaderboard", updatedLeaderboard);
        console.log(`Score updated for ${team.teamname}. New leaderboard broadcasted.`);
        res.status(200).json({ message: "Score updated successfully.", team });
    } catch (error) {
        console.error("Error updating score:", error);
        res.status(500).json({ message: "Server error while updating score." });
    }
});

app.post("/pic", async (req, res) => {
    try {
        const { id, photo } = req.body;
        const Team = await Innov.findById(id);
        Team.GroupPic = photo;
        await Team.save();
        res.json("done");
    } catch (r) {
        console.log(r);
        res.send(r);
    }
});

app.post("/problemSta", async (req, res) => {
    try {
        const { id, PS } = req.body;
        const Team = await Innov.findById(id);
        Team.ProblemStatement = PS;
        await Team.save();
        res.json(PS);
    } catch (r) {
        console.log(r);
        res.send(r);
    }
});

// --- Core Status Function ---
const checkRegistrationStatus = async () => {
    try {
        const count = await Innov.countDocuments({});
        const isBeforeOpenTime = registrationOpenTime && new Date() < new Date(registrationOpenTime);
        const isFull = count >= registrationLimit;
        const isClosed = isFull || isForcedClosed || isBeforeOpenTime;
        
        io.emit("registrationStatus", {
            isClosed: isClosed,
            count: count,
            limit: registrationLimit,
            openTime: registrationOpenTime
        });
    } catch (error) {
        console.error("Error checking registration status:", error);
    }
};

// --- Socket.IO Connection Handling ---
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("check", async () => {
        checkRegistrationStatus();
    });

    // Admin Controls for Registration
    socket.on("admin:setRegLimit", (limit) => {
        const newLimit = parseInt(limit, 10);
        if (!isNaN(newLimit) && newLimit >= 0) {
            registrationLimit = newLimit;
            console.log(`Registration limit set to: ${registrationLimit}`);
            checkRegistrationStatus();
        }
    });

    socket.on("admin:setRegOpenTime", (isoTimestamp) => {
        registrationOpenTime = isoTimestamp;
        isForcedClosed = false;
        console.log(`Registration opening time set to: ${registrationOpenTime}`);
        checkRegistrationStatus();
    });

    socket.on("admin:forceCloseReg", () => {
        registrationOpenTime = null;
        isForcedClosed = true;
        console.log("Registrations have been manually closed by an admin.");
        checkRegistrationStatus();
    });
    
    socket.on("admin:forceOpenReg", () => {
        registrationOpenTime = null;
        isForcedClosed = false;
        console.log("Registrations have been manually opened by an admin.");
        checkRegistrationStatus();
    });

    // Admin Controls for Domain Selection
    socket.on("admin:setDomainTime", (isoTimestamp) => {
        domainStat = isoTimestamp;
        io.emit("domainStat", domainStat);
        console.log(`Domain opening time set to: ${isoTimestamp}`);
    });
    
    socket.on("domainOpen", () => {
        domainStat = true;
        io.emit("domainStat", true);
    });

    socket.on("admin:closeDomains", () => {
        domainStat = false;
        io.emit("domainStat", domainStat);
        console.log("Domains closed by admin.");
    });

    // General Event and Team Socket Listeners
    socket.on("client:getData", () => {
        socket.emit("server:loadData", { reminders, ppt: latestPPT });
    });

    socket.on("join", (name) => {
        console.log(name);
        socket.join(name);
    });

    socket.on("eventupdates", (text) => {
        prev = text;
        io.emit("eventupdates", text);
    });

    socket.on("prevevent", () => {
        io.emit("eventupdates", prev);
    });

    socket.on("domainStat", () => {
        io.emit("domainStat", domainStat);
    });

    socket.on("domainSelected", async (team) => {
        try {
            const { teamId, domain } = team;
            const Team = await Innov.findById(teamId);
            if (!Team) {
                console.error(`Error: Team not found with ID: ${teamId}`);
                return socket.emit("error", { message: "Team not found." });
            }
            const selectedDomain = domains.find((d) => d.id === domain);
            if (!selectedDomain || selectedDomain.slots <= 0) {
                return io.to(socket.id).emit("domaindata", "fulled");
            }
            socket.join(Team.teamname);
            io.to(Team.teamname).emit("domainSelected", selectedDomain);
            selectedDomain.slots -= 1;
            io.emit("domaindata", domains);
            Team.Domain = selectedDomain.name;
            await Team.save();
        } catch (error) {
            console.error("Error processing domain selection:", error);
            socket.emit("error", { message: "An internal server error occurred." });
        }
    });

    socket.on("domaindat", (res) => {
        io.emit("domaindata", domains);
    });

    socket.on("admin", async (team) => {
        const { name, lead, teamMembers } = team;
        socket.join(name);
        const Team = await Innov.findOne({ teamname: name });
        if (Team) {
            Team.lead = lead;
            Team.teamMembers = teamMembers;
            io.to(name).emit("team", Team);
            await Team.save();
        }
    });

    socket.on("admin:sendReminder", (data) => {
        const newReminder = { ...data, time: new Date() };
        reminders.push(newReminder);
        io.emit("admin:sendReminder", newReminder);
        console.log(`Broadcasted reminder: ${data.message}`);
    });

    socket.on("admin:sendPPT", (data) => {
        latestPPT = data;
        io.emit("client:receivePPT", data);
        console.log(`Broadcasted PPT template: ${data.fileName}`);
    });

    socket.on("leaderboard", async (team) => {
        const { teamname, GameScore } = team;
        const Team = await Innov.findOne({ teamname: teamname });
        if (Team) {
            Team.GameScore = (Team.GameScore || 0) + GameScore;
            await Team.save();
        }
        let teams = await Innov.find({}).sort((a, b) => (b.GameScore || 0) - (a.GameScore || 0));
        io.emit("leaderboard", teams);
    });
});

// --- Periodic Registration Status Check ---
setInterval(checkRegistrationStatus, 10000);

server.listen(3001, async () => {
    await connectDB();
    console.log(`Server running at http://localhost:3001`);
});