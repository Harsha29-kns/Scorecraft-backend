const express = require("express");
const router = express.Router();
const Innov = require("../modles/innov");
const nodemailer = require("nodemailer");
const dot = require("dotenv").config();
const cors = require("cors");
const sendData = require('../sheet');

router.use(express.json());
router.use(cors({ origin: "*" }));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL,
        pass: process.env.PASS,
    },
});

// --- NEW NARUTO THEMED EMAIL TEMPLATES ---

// Template for "Payment Under Verification"
const paymentVerificationTemplate = (studentName, teamName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border: 2px solid #ff6600; border-radius: 10px; overflow: hidden; color: #e0e0e0;">
    <div style="background-color: #ff6600; color: #ffffff; padding: 20px; text-align: center;">
      <h2 style="margin: 0; font-size: 24px; font-family: 'Ninja Naruto', Arial, sans-serif;">Mission Under Review</h2>
    </div>
    <div style="padding: 30px; line-height: 1.6;">
      <p style="font-size: 16px;">Greetings <strong style="color: #ff9933;">${studentName}</strong>,</p>
      <p style="font-size: 16px;">
        Thank you for assembling your team, <strong style="color: #ff9933;">${teamName}</strong>. Your submission has been received and is now under verification by the Hokage's office.
      </p>
      <p style="font-size: 16px;">
        We will send another scroll via email once your payment is confirmed.
      </p>
      <p style="font-size: 16px; margin-top: 20px;">Stay vigilant,</p>
      <p style="font-size: 16px; font-weight: bold; color: #ff9933;">Scorecraft Team</p>
    </div>
    <div style="background: #333333; color: #aaaaaa; text-align: center; padding: 10px; font-size: 12px;">
      <p style="margin: 0;">&copy; 2025 Scorecraft. All Rights Reserved.</p>
    </div>
  </div>
`;

const registrationSuccessfulTemplate = (studentName, teamName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border: 2px solid #ff6600; border-radius: 10px; overflow: hidden; color: #e0e0e0;">
    <div style="background-color: #ff6600; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-family: 'Ninja Naruto', Arial, sans-serif;">Mission Successful!</h2>
    </div>
    <div style="padding: 30px; line-height: 1.6;">
        <p style="font-size: 16px;">Congratulations <strong style="color: #ff9933;">${studentName}</strong>,</p>
        <p style="font-size: 16px;">
            Your team, <strong style="color: #ff9933;">${teamName}</strong>, has been officially registered! Your payment has been verified.
        </p>
        <p style="font-size: 16px;">
            Proceed to the next stage by joining the official communication channel.
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://chat.whatsapp.com/IiutiJ3D7bR2NR8lVimsLJ" style="text-decoration: none; background-color: #ff6600; color: #ffffff; padding: 15px 30px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Join WhatsApp Group
            </a>
        </div>
        <p style="font-size: 16px;">Best regards,</p>
        <p style="font-size: 16px; font-weight: bold; color: #ff9933;">Scorecraft Team</p>
    </div>
    <div style="background: #333333; color: #aaaaaa; text-align: center; padding: 10px; font-size: 12px;">
      <p style="margin: 0;">&copy; 2025 Scorecraft. All Rights Reserved.</p>
    </div>
  </div>
`;



const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: process.env.MAIL,
            to,
            subject,
            html,
        });
    } catch (err) {
        console.error("Error sending email:", err);
        throw new Error("Email delivery failed");
    }
};

// --- YOUR EXISTING ROUTES ---

router.post("/team/:password", async (req, res) => {
    try {
        const { password } = req.params
        const team = await Innov.findOne({ password: password })
        if (team) {
            return res.json(team);
        }
        // ✅ CHANGED: Use 401 for failed login, which is more accurate.
        res.status(401).json({ message: "Invalid credentials" });
    }
    catch {
        res.status(500).json({ message: "Server error during login" });
    }
});

router.post("/register", async (req, res) => {
    try {
        const count = await Innov.countDocuments({});
        req.body.registrationNumber = (count + 1).toString(); // Assign unique registration number

        const { name, email, members, upi, txn, url, teamname } = req.body;
        console.log(req.body)
        const countTeam = (await Innov.find({})).length
        console.log(countTeam)
        if (countTeam < 90) {
            if (!name || !email || !teamname) {
                console.log("eroor in required")
                return res.status(400).json({ error: "Missing required fields." });
            }
            if (!Array.isArray(req.body.teamMembers) || req.body.teamMembers.length !== 4) {
                return res.status(400).json({ error: "Team must have exactly 4 members (plus lead)" });
            }
            const data = await Innov.create(req.body);

            // Send registration data to Google Sheet
            await sendData({
                fullName: req.body.name,
                email: req.body.email,
                registerNumber: req.body.registrationNumber,
                year: req.body.year,
                department: req.body.department,
                phone: req.body.phone
            });

            // *** USE THE NEW THEMED EMAIL TEMPLATE HERE ***
            const emailContent = paymentVerificationTemplate(name, teamname);

            sendEmail(email, `Your team ${teamname} is under verification`, emailContent);
            res.status(201).json({ message: "Team registered and email sent successfully", data });
            return
        }
        else {
            console.log("haaa")
            res.status(401).json({ message: "Restration team got filled!" })
            return
        }
    } catch (err) {
        console.error("Error in /register:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/team/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body
        console.log(email)
        const team = await Innov.findByIdAndDelete(id);
        console.log(team)
        // This email can also be themed if needed
        const emailContent = `
     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
   <div style="background:#e16254;color:#ece8e7;padding:20px;text-align:center;display:flex;justify-content: space-between;align-items: center;">
       <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Team Refund Successfull</h2>
   </div>
   <div style="padding: 20px; background: #ffffff; border: 1px solid #ddd; line-height: 1.6;">
     <p style="font-size: 16px; margin: 0 0 15px;">Hello <strong style="color: #E16254;">${team.name}</strong>,</p>
     <p style="font-size: 16px; margin: 0 0 15px;">
         Your team, <strong>${team.teamName}</strong>, has been successfully withdrawed.
     </p>
     <p style="margin-top: 20px; font-size: 16px;">Best regards,</p>
     <p style="font-size: 16px; font-weight: bold; margin: 0;">Scorecraft Team</p>
   </div>
   <div style="background: #919294; color: #ECE8E7; text-align: center; padding: 10px; font-size: 14px;">
     <p style="margin: 0;">&copy; 2024 Team. All rights reserved.</p>
   </div>
</div>
     `;
        sendEmail(team.email, "Refund Succesfull", emailContent)
        res.status(200).json({ message: "Team refunded successfully" });
    } catch (err) {
        console.error("Error in /team/:id:", err);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.get("/team/:id", async (req, res) => {
    console.log("local")
    const { id } = req.params;
    const team = await Innov.findById(id);
    let allm = team.teamMembers.map((i) => { return i.registrationNumber + "@klu.ac.in" })
    allm.push(team.email)
    if (!team) {
        return res.status(404).json({ error: "Team not found." });
    }

    if (!team || !team.email) {
        return res.status(400).json({ error: "Lead email is missing." });
    }

    team.verified = true;
    await team.save();

    // *** USE THE NEW THEMED EMAIL TEMPLATE HERE ***
    const emailContent = registrationSuccessfulTemplate(team.name, team.teamname);

    await team.save()
    await sendEmail(allm, `Your Team ${team.teamname} is Verified`, emailContent);
    res.status(200).json({ message: "Team verified successfully" });
});

router.get("/students", async (req, res) => {
    try {
        const teams = await Innov.find();
        res.status(200).json(teams);
    } catch (err) {
        console.error("Error in /students:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.post("/team/score/:id", async (req, res) => {
    try {
        console.log("local")
        const { id } = req.params;
        const { SecoundReview, score } = req.body
        let Team = await Innov.findById(id);
        Team.SecoundReview = SecoundReview
        Team.SecoundReviewScore = score
        Team.FinalScore = Team.FirstReviewScore + Team.SecoundReviewScore
        await Team.save()
        res.json("done")
    }
    catch (e) {
        console.log(e)
        res.status(420).json("Don't act smart")
    }
});
router.post("/team/score1/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { FirstReview, score } = req.body;
        let Team = await Innov.findById(id);
        Team.FirstReview = FirstReview;
        Team.FirstReviewScore = score;
        // We don't calculate FinalScore here, as the second review isn't done yet
        await Team.save();
        res.json("done");
    } catch (e) {
        console.log(e);
        res.status(500).json("Server error");
    }
});
router.post("/pro/:id", async (req, res) => {
    const { id } = req.params;
    const { projectId } = req.body;
    const team = await Innov.findById(id);
    team.ProblemID = projectId;
    await team.save();
    res.json("done")
})

router.post("/feedback/:id", async (req, res) => {
    const { id } = req.params;
    const { feedback } = req.body;
    const team = await Innov.findById(id);
    team.FeedBack = feedback;
    await team.save();
    res.json("done")
})
{/*
router.post("/codebrake/register", async (req, res) => {
    const { body } = req;
    const count = (await codebrack.find({})).length
    console.log(count)
    if (count < 345) {
        console.log("gihwe")
        const student = await codebrack.create(body);
        const emailContent = paymentVerificationTemplate(student.name);
        sendEmail(student.email, "Your Payment under Verification", emailContent);
        res.json("done");
    }
    else {
        res.status(401).json("all done")
    }
});

router.get("/codebrake/student/:id", async (req, res) => {
    const { id } = req.params;
    const student = await codebrack.findById(id);
    student.verifyed = true;
    await student.save();

    const emailContent = registrationSuccessfulTemplate(student.name);
    sendEmail(student.email, "Registration Successful", emailContent);

    res.json("done");
});

router.get("/codebrake/students", async (req, res) => {
    const students = await codebrack.find({})
    res.json(students)
})
*/}
router.post("/event/verify/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Innov.findById(id);
        if (!team) return res.status(404).json({ error: "Team not found." });

        // --- PASSWORD GENERATION LOGIC ---
        // 1. Generate a 6-digit number password
        const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Update the team document
        team.verified = true;
        team.password = generatedPassword; // Save the plain number password
        await team.save();
        // --- END OF NEW LOGIC ---

        // Send verification email to lead
        const emailContent = registrationSuccessfulTemplate(team.name, team.teamname);
        await sendEmail(team.email, `Your Team ${team.teamname} is Verified`, emailContent);

        // Respond to the admin dashboard with the plain-text password
        res.status(200).json({
            message: "Team verified and email sent",
            password: generatedPassword // This lets the admin see the new password
        });

    } catch (err) {
        console.error("Error verifying team:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/sector/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { Sector } = req.body;
        const team = await Innov.findById(id);
        if (!team) return res.status(404).json({ error: "Team not found." });
        team.Sector = Sector;
        await team.save();
        res.json({ message: "Sector updated", team });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// --- NEW ROUTES FOR ISSUE TRACKING ---

// 1. Submit an issue from Team Panel
router.post("/issue/:teamId", async (req, res) => {
    try {
        const { teamId } = req.params;
        const { issueText } = req.body;
        if (!issueText) return res.status(400).json({ error: "Issue text is required." });

        const team = await Innov.findById(teamId);
        if (!team) return res.status(404).json({ error: "Team not found." });

        team.issues.push({ text: issueText });
        await team.save();
        res.status(200).json(team);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 2. Get all teams with issues for Admin Panel
router.get("/issues", async (req, res) => {
    try {
        const teamsWithIssues = await Innov.find({ 'issues.0': { $exists: true } });
        res.status(200).json(teamsWithIssues);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 3. Resolve an issue from Admin Panel
router.post("/issue/resolve/:teamId/:issueId", async (req, res) => {
    try {
        const { teamId, issueId } = req.params;
        const team = await Innov.findById(teamId);
        if (!team) return res.status(404).json({ error: "Team not found." });

        const issue = team.issues.id(issueId);
        if (issue) {
            issue.status = 'Resolved';
            await team.save();
        }
        res.status(200).json(team);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;
