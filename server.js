const express = require("express");
const connectDB = require("./db");
const EventRegister = require("./routes/EventRegister");
const socketio = require("socket.io");
const app = express();
const server = require("http").createServer(app);
const io = socketio(server, { cors: { origin: "*" } });
const cors = require("cors");
const hackforge = require("./module/hackforge");


const Domain = require('./module/Domain');
const Reminder = require('./module/Reminder');
const PPT = require('./module/PPT');
const ServerSetting = require('./module/ServerSetting');


let settings; // This will hold the settings loaded from DB.


app.use(cors({ origin: "*" }));
app.use(express.json());

app.use(async (req, res, next) => {
    req.io = io;
    req.registrationLimit = settings.registrationLimit;

    const count = await hackforge.countDocuments({});
    const isBeforeOpenTime = settings.registrationOpenTime && new Date() < new Date(settings.registrationOpenTime);
    const isFull = count >= settings.registrationLimit;

    req.isRegClosed = isFull || settings.isForcedClosed || isBeforeOpenTime;

    next();
});

app.use("/event", EventRegister);


app.get("/domains", async (req, res) => {
    try {
        const domains = await Domain.find({});
        res.status(200).json(domains);
    } catch (error) {
        console.error("Error fetching domains:", error);
        res.status(500).json({ message: "Server error while fetching domains." });
    }
});

app.get("/", (req, res) => {
    res.send("hi i am server of scorecraft this is my home page.");
});


app.post("/api/admin/update-score/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { gameScore } = req.body;
        const team = await hackforge.findById(id);
        if (!team) {
            return res.status(404).json({ message: "Team not found." });
        }
        team.GameScore = Number(gameScore);
        await team.save();
        const updatedLeaderboard = await hackforge.find({}).sort({ GameScore: -1 });
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
        const Team = await hackforge.findById(id);
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
        const Team = await hackforge.findById(id);
        Team.ProblemStatement = PS;
        await Team.save();
        res.json(PS);
    } catch (r) {
        console.log(r);
        res.send(r);
    }
});


const checkRegistrationStatus = async () => {
    try {
        
        const count = await hackforge.countDocuments({});
        const isBeforeOpenTime = settings.registrationOpenTime && new Date() < new Date(settings.registrationOpenTime);
        const isFull = count >= settings.registrationLimit;
        const isClosed = isFull || settings.isForcedClosed || isBeforeOpenTime;

        io.emit("registrationStatus", {
            isClosed: isClosed,
            count: count,
            limit: settings.registrationLimit,
            openTime: settings.registrationOpenTime
        });
    } catch (error) {
        console.error("Error checking registration status:", error);
    }
};


io.on("connection", (socket) => {
    console.log("A user connected");

    
    socket.on("check", checkRegistrationStatus);
    io.emit("domainStat", settings.domainStat);


    // Admin Controls for Registration - NOW UPDATES DATABASE
    socket.on("admin:setRegLimit", async (limit) => {
        const newLimit = parseInt(limit, 10);
        if (!isNaN(newLimit) && newLimit >= 0) {
            settings.registrationLimit = newLimit;
            await settings.save();
            console.log(`Registration limit updated in DB: ${settings.registrationLimit}`);
            checkRegistrationStatus();
        }
    });

    socket.on("admin:setRegOpenTime", async (isoTimestamp) => {
        settings.registrationOpenTime = isoTimestamp;
        settings.isForcedClosed = false;
        await settings.save();
        console.log(`Registration opening time updated in DB: ${settings.registrationOpenTime}`);
        checkRegistrationStatus();
    });

    socket.on("admin:forceCloseReg", async () => {
        settings.registrationOpenTime = null;
        settings.isForcedClosed = true;
        await settings.save();
        console.log("Registrations manually closed in DB.");
        checkRegistrationStatus();
    });

    socket.on("admin:forceOpenReg", async () => {
        settings.registrationOpenTime = null;
        settings.isForcedClosed = false;
        await settings.save();
        console.log("Registrations manually opened in DB.");
        checkRegistrationStatus();
    });

    // Admin Controls for Domain Selection - NOW UPDATES DATABASE
    socket.on("domainOpen", async () => {
        settings.domainStat = true;
        await settings.save();
        io.emit("domainStat", true);
        console.log("Domains opened in DB.");
    });

    socket.on("admin:closeDomains", async () => {
        settings.domainStat = false;
        await settings.save();
        io.emit("domainStat", false);
        console.log("Domains closed in DB.");
    });

    // General Event and Team Socket Listeners
    socket.on("client:getData", async () => {
        const reminders = await Reminder.find({}).sort({ time: -1 }).limit(10);
        const latestPPT = await PPT.findOne({}).sort({ uploadedAt: -1 });
        socket.emit("server:loadData", { reminders, ppt: latestPPT });
    });

    socket.on("join", (name) => {
        console.log(name);
        socket.join(name);
    });

    socket.on("eventupdates", async (text) => {
        settings.latestEventUpdate = text;
        await settings.save();
        io.emit("eventupdates", text);
    });

    socket.on("prevevent", () => {
        io.emit("eventupdates", settings.latestEventUpdate);
    });

    socket.on("domainStat", () => {
        io.emit("domainStat", settings.domainStat);
    });

    
    socket.on("domainSelected", async (team) => {
        try {
            const { teamId, domain: domainId } = team;
            const Team = await hackforge.findById(teamId);

            if (!Team) {
                console.error(`Error: Team not found with ID: ${teamId}`);
                return io.to(socket.id).emit("domainSelected", { error: "Team not found." });
            }
            if (Team.Domain) {
                return io.to(socket.id).emit("domainSelected", { error: "You have already selected a domain." });
            }

            // The core atomic operation
            const updatedDomain = await Domain.findOneAndUpdate(
                { id: domainId, slots: { $gt: 0 } },
                { $inc: { slots: -1 } },
                { new: true }
            );

            if (!updatedDomain) {
                // This is the "fulled" case.
                const domains = await Domain.find({});
                // Let the client know their attempt failed and send the updated list.
                return io.to(socket.id).emit("domaindata", { domains, error: "fulled" });
            }
            
            // --- Success Path ---
            Team.Domain = updatedDomain.name;
            await Team.save();
            
            // Let the client know their selection was successful
            io.to(socket.id).emit("domainSelected", { success: true, domain: updatedDomain });

            // Broadcast the new state of all domains to every client
            const allDomains = await Domain.find({});
            io.emit("domaindata", allDomains);

        } catch (error) {
            console.error("Error processing domain selection:", error);
            io.to(socket.id).emit("domainSelected", { error: "An internal server error occurred." });
        }
    });
    
    socket.on("domaindat", async () => {
        const domains = await Domain.find({});
        io.emit("domaindata", domains);
    });

    socket.on("admin", async (team) => {
        const { name, lead, teamMembers } = team;
        socket.join(name);
        const Team = await hackforge.findOne({ teamname: name });
        if (Team) {
            Team.lead = lead;
            Team.teamMembers = teamMembers;
            io.to(name).emit("team", Team);
            await Team.save();
        }
    });

    socket.on("admin:sendReminder", async (data) => {
        const newReminder = new Reminder({ message: data.message });
        await newReminder.save();
        io.emit("admin:sendReminder", newReminder);
        console.log(`Broadcasted reminder: ${data.message}`);
    });

    socket.on("admin:sendPPT", async (data) => {
        const newPPT = new PPT({ fileName: data.fileName, fileUrl: data.fileUrl });
        await newPPT.save();
        io.emit("client:receivePPT", newPPT);
        console.log(`Broadcasted PPT template: ${data.fileName}`);
    });

    socket.on("leaderboard", async (team) => {
        const { teamname, GameScore } = team;
        const Team = await hackforge.findOne({ teamname: teamname });
        if (Team) {
            Team.GameScore = (Team.GameScore || 0) + GameScore;
            await Team.save();
        }
        let teams = await hackforge.find({}).sort((a, b) => (b.GameScore || 0) - (a.GameScore || 0));
        io.emit("leaderboard", teams);
    });

});


setInterval(checkRegistrationStatus, 10000);


const initializeDomains = async () => {
    try {
        const count = await Domain.countDocuments();
        if (count === 0) {
            console.log("No domains found in DB. Initializing...");
            const initialDomains = [
                 { id: "1", name: "EdTech", slots: 10, description: "Innovations for enhancing learning experiences, course management, and skill development." },
                { id: "2", name: "Campus Automation", slots: 10, description: "Solutions for smart attendance, resource allocation." },
                { id: "3", name: "HealthTech", slots: 10, description: "Apps for mental health, fitness tracking, and on-campus medical assistance." },
                { id: "4", name: "HostelConnect", slots: 10, description: "Platforms for room allocation, maintenance requests, and complaint tracking." },
                { id: "5", name: "FoodieHub", slots: 10, description: "Apps for food ordering, meal pre-booking, and digital payments." },
                { id: "6", name: "GreenCampus", slots: 10, description: "Eco-friendly solutions for waste management and energy efficiency." },
                { id: "7", name: "Transport Solutions", slots: 10, description: "Smart transportation, tracking, and optimization of on-campus buses and cabs." },
                { id: "8", name: "Student Engagement", slots: 10, description: "Apps for student clubs, campus events, and extracurricular activities management." },
                { id: "9", name: "Digital Learning Platforms", slots: 10, description: "Interactive e-learning platforms, content sharing, and peer-to-peer learning." },
            ];
            await Domain.insertMany(initialDomains);
            console.log("Domains have been successfully initialized in the database.");
        }
    } catch (error) {
        console.error("Error initializing domains:", error);
    }
};

const initializeSettings = async () => {
    try {
        const existingSettings = await ServerSetting.findOne({ singleton: 'main' });
        if (!existingSettings) {
            console.log("No server settings found. Creating default settings document...");
            settings = new ServerSetting();
            await settings.save();
            console.log("Default settings created in the database.");
        } else {
            settings = existingSettings;
            console.log("Server settings loaded from the database.");
        }
    } catch (error) {
        console.error("Error initializing server settings:", error);
        process.exit(1); // Exit if settings can't be loaded/created
    }
};


// --- Server Startup ---
const startServer = async () => {
    await connectDB();
    await initializeDomains();
    await initializeSettings(); // Load or create settings before listening
    server.listen(3001, () => {
        console.log(`Server running at http://localhost:3001`);
    });
};

startServer();