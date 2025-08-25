const express = require("express");
const router = express.Router();
const Innov = require("../modles/innov");
const nodemailer = require("nodemailer");
const dot = require("dotenv").config();
const cors = require("cors");
const sendData = require('../sheet');
const qrcode = require('qrcode');

router.use(express.json());
router.use(cors({ origin: "*" }));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL,
        pass: process.env.PASS,
    },
});


const paymentVerificationTemplate = (studentName, teamName) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    </style>
  </head>
  <body style="font-family: 'Roboto', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(90deg, #4a00e0, #8e2de2); color: #ffffff; padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Registration Pending</h1>
      </div>
      <div style="padding: 30px 25px; color: #333333; line-height: 1.6;">
        <p style="font-size: 16px;">Hello <strong style="color: #4a00e0;">${studentName}</strong>,</p>
        <p style="font-size: 16px;">
          Thank you for submitting your registration. We've received the entry for your team,
          <strong style="color: #4a00e0;">${teamName}</strong>, and it's now in the queue for verification.
        </p>
        <div style="background-color: #f9f6ff; border-left: 4px solid #8e2de2; padding: 15px; margin: 20px 0; font-size: 15px;">
          <strong>Status:</strong> Payment Verification In Progress
          <p style="margin: 5px 0 0 0;">No further action is required from you at this moment. We'll notify you as soon as the process is complete.</p>
        </div>
        <p style="font-size: 16px;">You will receive another email from us once your payment is confirmed.</p>
        <p style="font-size: 16px; margin-top: 30px;">Best regards,<br>
          <strong style="color: #4a00e0;">The Scorecraft Team</strong>
        </p>
      </div>
      <div style="background-color: #f1f1f1; color: #888888; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">&copy; 2025 Scorecraft. All Rights Reserved.</p>
      </div>
    </div>
  </body>
  </html>
`;

const registrationSuccessfulTemplate = (studentName, teamName) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    </style>
  </head>
  <body style="font-family: 'Roboto', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(90deg, #11998e, #38ef7d); color: #ffffff; padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Registration Confirmed!</h1>
      </div>
      <div style="padding: 30px 25px; color: #333333; line-height: 1.6;">
        <p style="font-size: 16px;">Congratulations <strong style="color: #11998e;">${studentName}</strong>,</p>
        <p style="font-size: 16px;">
          Welcome aboard! Your payment has been verified, and your team,
          <strong style="color: #11998e;">${teamName}</strong>, is officially registered for the event.
        </p>
        <p style="font-size: 16px;">
          To receive all important updates, announcements, and schedules, please join our official WhatsApp group.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://chat.whatsapp.com/" style="text-decoration: none; background: linear-gradient(90deg, #11998e, #38ef7d); color: #ffffff; padding: 15px 35px; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
            Join Official Group
          </a>
        </div>
        <p style="font-size: 16px;">We're excited to see you there!</p>
        <p style="font-size: 16px; margin-top: 30px;">Best regards,<br>
          <strong style="color: #11998e;">The Scorecraft Team</strong>
        </p>
      </div>
      <div style="background-color: #f1f1f1; color: #888888; text-align: center; padding: 15px; font-size: 12px;">
        <p style="margin: 0;">&copy; 2025 Scorecraft. All Rights Reserved.</p>
      </div>
    </div>
  </body>
  </html>
`;

const qrCodeEmailTemplate = (studentName, teamName, members) => {
    const memberHtml = members.map((member, index) => `
      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; text-align: left; display: flex; align-items: center; gap: 20px;">
        <img src="cid:qrcode${index}" alt="QR Code" style="width: 100px; height: 100px; border-radius: 4px;"/>
        <div>
          <h3 style="margin: 0 0 5px 0; color: #4a00e0; font-size: 18px;">
            ${member.name} ${member.isLead ? '<span style="background-color: #4a00e0; color: white; font-size: 10px; padding: 3px 8px; border-radius: 10px; vertical-align: middle; margin-left: 8px;">LEAD</span>' : ''}
          </h3>
          <p style="margin: 0; color: #555555; font-size: 14px;">Reg No: ${member.regNo}</p>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        </style>
      </head>
      <body style="font-family: 'Roboto', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(90deg, #4a00e0, #8e2de2); color: #ffffff; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Your Event Credentials</h1>
          </div>
          <div style="padding: 30px 25px; color: #333333; line-height: 1.6;">
            <p style="font-size: 16px;">Hello <strong style="color: #4a00e0;">${studentName}</strong>,</p>
            <p style="font-size: 16px;">
              Get ready! Here are the official event credentials for your team,
              <strong style="color: #4a00e0;">${teamName}</strong>.
            </p>
            <p style="font-size: 16px;">
              Please distribute the unique QR code to each team member. <strong>These are required for check-in and attendance</strong> at all rounds.
            </p>
            <p style="font-size: 16px; margin-top: 30px;">
              To receive all important updates, announcements, and schedules, please join our official WhatsApp group.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://chat.whatsapp.com/" style="text-decoration: none; background: linear-gradient(90deg, #4a00e0, #8e2de2); color: #ffffff; padding: 15px 35px; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                Join Official Group
              </a>
            </div>

            <div style="margin-top: 30px; background-color: #f9f6ff; padding: 20px; border-radius: 8px;">
              ${memberHtml}
            </div>
            
            <p style="font-size: 16px; margin-top: 30px;">Best of luck,<br>
              <strong style="color: #4a00e0;">The Scorecraft Team</strong>
            </p>
          </div>
          <div style="background-color: #f1f1f1; color: #888888; text-align: center; padding: 15px; font-size: 12px;">
            <p style="margin: 0;">&copy; 2025 Scorecraft. All Rights Reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

const sendEmail = async (to, subject, html, attachments = []) => {
    try {
        await transporter.sendMail({
            from: process.env.MAIL,
            to,
            subject,
            html,
            attachments,
        });
    } catch (err) {
        console.error("Error sending email:", err);
        throw new Error("Email delivery failed");
    }
};


router.get("/teams/count", async (req, res) => {
    try {
        // --- CHANGED: This now counts ALL teams (verified and unverified) ---
        const teamCount = await Innov.countDocuments({});
        res.status(200).json({ count: teamCount });
    } catch (error) {
        console.error("Error fetching team count:", error);
        res.status(500).json({ message: "Error fetching team count" });
    }
});


router.post("/team/:password", async (req, res) => {
    try {
        const { password } = req.params
        const team = await Innov.findOne({ password: password, verified: true })
        if (team) {
            return res.json(team);
        }
        res.status(401).json({ message: "Invalid credentials" });
    }
    catch {
        res.status(500).json({ message: "Server error during login" });
    }
});

// In your EventRegister.js file
router.post("/register", async (req, res) => {
    try {
        // --- MODIFIED: Check the comprehensive status from middleware ---
        if (req.isRegClosed) {
            return res.status(403).json({ message: "Registration is currently closed." });
        }
        
        const registrationLimit = req.registrationLimit;
        const countTeam = await Innov.countDocuments({});
        
        // This if statement is no longer needed but kept as a backup validation
        if (countTeam < registrationLimit) {
            const { name, email, teamname } = req.body;
            req.body.registrationNumber = (countTeam + 1).toString();

            if (!name || !email || !teamname) {
                return res.status(400).json({ error: "Missing required fields." });
            }
            if (!Array.isArray(req.body.teamMembers) || req.body.teamMembers.length !== 4) {
                return res.status(400).json({ error: "Team must have exactly 4 members (plus lead)" });
            }
            const data = await Innov.create(req.body);

            await sendData(req.body);

            const emailContent = paymentVerificationTemplate(name, teamname);
            sendEmail(email, `Your team ${teamname} is under verification`, emailContent);

            const newTotalCount = countTeam + 1;
            if (req.io) {
                req.io.emit("registrationStatus", {
                    isClosed: req.isRegClosed, // Use the pre-calculated status
                    count: newTotalCount,
                    limit: registrationLimit
                });
            }

            res.status(201).json({ message: "Team registered and email sent successfully", data });
        }
        else {
            // This case should now be caught by the first if block
            res.status(403).json({ message: "Registration is full. Cannot accept new teams." });
        }
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "This team name is already taken. Please choose another one." });
        }
        console.error("Error in /register:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/team/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Innov.findByIdAndDelete(id);
        
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                <div style="background:#e16254;color:#ece8e7;padding:20px;text-align:center;display:flex;justify-content: space-between;align-items: center;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Team Refund Successful</h2>
                </div>
                <div style="padding: 20px; background: #ffffff; border: 1px solid #ddd; line-height: 1.6;">
                    <p style="font-size: 16px; margin: 0 0 15px;">Hello <strong style="color: #E16254;">${team.name}</strong>,</p>
                    <p style="font-size: 16px; margin: 0 0 15px;">
                        Your team, <strong>${team.teamname}</strong>, has been successfully withdrawn.
                    </p>
                    <p style="margin-top: 20px; font-size: 16px;">Best regards,</p>
                    <p style="font-size: 16px; font-weight: bold; margin: 0;">Scorecraft Team</p>
                </div>
                <div style="background: #919294; color: #ECE8E7; text-align: center; padding: 10px; font-size: 14px;">
                    <p style="margin: 0;">&copy; 2024 Team. All rights reserved.</p>
                </div>
            </div>
        `;
        sendEmail(team.email, "Refund Successful", emailContent)
        res.status(200).json({ message: "Team refunded successfully" });
    } catch (err) {
        console.error("Error in /team/:id:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/team/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Innov.findById(id);
        if (!team) {
            return res.status(404).json({ error: "Team not found." });
        }
        res.status(200).json(team);
    } catch (err) {
        console.error("Error fetching team by id:", err);
        res.status(500).json({ error: "Internal server error" });
    }
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
});

router.post("/feedback/:id", async (req, res) => {
    const { id } = req.params;
    const { feedback } = req.body;
    const team = await Innov.findById(id);
    team.FeedBack = feedback;
    await team.save();
    res.json("done")
});

router.post("/event/verify/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Innov.findById(id);
        if (!team) return res.status(404).json({ error: "Team not found." });

        const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
        team.verified = true;
        team.password = generatedPassword;

        const emailAttachments = [];
        const emailMemberList = [];

        
        const leadQrData = JSON.stringify({ teamId: team._id, registrationNumber: team.registrationNumber });
        if (!team.lead) team.lead = {};
        team.lead.qrCode = await qrcode.toDataURL(leadQrData);
        emailAttachments.push({
            filename: `${team.name}_qrcode.png`,
            content: team.lead.qrCode.split("base64,")[1],
            encoding: 'base64',
            cid: 'qrcode0'
        });
        emailMemberList.push({ name: team.name, regNo: team.registrationNumber, isLead: true });

        // 2. Generate for Team Members
        for (let i = 0; i < team.teamMembers.length; i++) {
            const member = team.teamMembers[i];
            const memberQrData = JSON.stringify({ teamId: team._id, registrationNumber: member.registrationNumber });
            member.qrCode = await qrcode.toDataURL(memberQrData);
            
            emailAttachments.push({
                filename: `${member.name}_qrcode.png`,
                content: member.qrCode.split("base64,")[1],
                encoding: 'base64',
                cid: `qrcode${i + 1}`
            });
            emailMemberList.push({ name: member.name, regNo: member.registrationNumber, isLead: false });
        }
        
        await team.save();
        
        
        if (req.io) {
            const verifiedTeamCount = await Innov.countDocuments({ verified: true });
            req.io.emit("updateTeamCount", verifiedTeamCount);
        }

        const emailContent = qrCodeEmailTemplate(team.name, team.teamname, emailMemberList);
        await sendEmail(team.email, `Your Team ${team.teamname} is Verified - QR Codes Attached`, emailContent, emailAttachments);

        res.status(200).json({
            message: "Team verified and QR codes sent successfully",
            password: generatedPassword
        });

    } catch (err) {
        console.error("Error verifying team:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/attendance/submit", async (req, res) => {
    try {
        const { teamId, roundNumber, attendanceData } = req.body;

        if (!teamId || !roundNumber || !attendanceData) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const team = await Innov.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: "Team not found." });
        }

        if (!team.lead) team.lead = {};
        if (!team.lead.attendance) team.lead.attendance = [];

        const leadStatus = attendanceData[team.registrationNumber];
        if (leadStatus) {
            const roundIndex = team.lead.attendance.findIndex(a => a.round == roundNumber);
            if (roundIndex > -1) {
                team.lead.attendance[roundIndex].status = leadStatus;
            } else {
                team.lead.attendance.push({ round: roundNumber, status: leadStatus });
            }
        }

        for (const member of team.teamMembers) {
            if (!member.attendance) member.attendance = [];
            const memberStatus = attendanceData[member.registrationNumber];
            if (memberStatus) {
                const roundIndex = member.attendance.findIndex(a => a.round == roundNumber);
                if (roundIndex > -1) {
                    member.attendance[roundIndex].status = memberStatus;
                } else {
                    member.attendance.push({ round: roundNumber, status: memberStatus });
                }
            }
        }
        
        await team.save();
        res.status(200).json({ message: `Attendance for Round ${roundNumber} for team ${team.teamname} submitted successfully.` });

    } catch (err) {
        console.error("Error submitting attendance:", err);
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

router.post("/issue/:teamId", async (req, res) => {
    try {
        const { teamId } = req.params;
        const { issueText } = req.body;
        if (!issueText) return res.status(400).json({ error: "Issue text is required." });

        const team = await Innov.findById(teamId);
        if (!team) return res.status(404).json({ error: "Team not found." });

        team.issues.push({ text: issueText,timestamp:new Date() });
        await team.save();
        res.status(200).json(team);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});



router.post("/updateDomain", async (req, res) => {
  try {
    const { teamId, domain } = req.body;

    if (!teamId || !domain) {
      return res.status(400).send("Team ID and domain are required.");
    }

    
    const updatedTeam = await Innov.findByIdAndUpdate(
      teamId,
      { Domain: domain },
      { new: true } 
    );

    if (!updatedTeam) {
      return res.status(404).send("Team not found.");
    }

    // Send a success response back to the admin panel
    res.status(200).json({ message: "Domain updated successfully", team: updatedTeam });

  } catch (error) {
    console.error("Error updating domain:", error);
    res.status(500).send("Server error while updating domain.");
  }
});

router.get("/issues", async (req, res) => {
    try {
        const teamsWithIssues = await Innov.find({ 'issues.0': { $exists: true } });
        res.status(200).json(teamsWithIssues);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

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