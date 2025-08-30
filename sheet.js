const { google } = require('googleapis');
// Make sure this is the correct path to your key file
const keys = require('./scorecraft-mailer-f01977c38fa1.json');

// Initialize the JWT client
const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

/**
 * Sends structured team data to a Google Sheet.
 * Creates one row for the team lead and one for each member.
 * @param {object} teamData - The full team data object from the request body.
 */
async function sendData(teamData) {
    try {
        // Destructure all the necessary fields from the incoming data
        const {
            teamname,
            name,
            registrationNumber,
            year,
            department,
            section,
            email,
            type,
            room,
            teamMembers
        } = teamData;

        console.log("Received data to be sent to Google Sheet:", teamData);

        // Authorize the client
        await client.authorize();
        const sheets = google.sheets({ version: 'v4', auth: client });

        // This array will hold all the rows to be added for this registration
        const rowsToAdd = [];

        // 1. Create the row for the Team Lead
        rowsToAdd.push([
            teamname,                   // Column A: Team Name
            'Lead',                     // Column B: Role
            name,                       // Column C: Name
            registrationNumber,         // Column D: Registration No
            year,                       // Column E: Year
            department,                 // Column F: Department
            section,                    // Column G: Section
            email,                      // Column H: Team Lead Email
            type,                       // Column I: Room Type
            room || 'N/A'               // Column J: Room No (use 'N/A' if empty)
            
        ]);

        // 2. Create a row for each team member
        if (teamMembers && Array.isArray(teamMembers)) {
            teamMembers.forEach(member => {
                rowsToAdd.push([
                    teamname,                   // Column A: Team Name
                    'Member',                   // Column B: Role
                    member.name,                // Column C: Name
                    member.registrationNumber,  // Column D: Registration No
                    member.year,                // Column E: Year
                    member.department,          // Column F: Department
                    member.section,             // Column G: Section
                    email,                      // Column H: Team Lead Email (repeated for context)
                    member.type,                // Column I: Room Type
                    member.room || 'N/A'        // Column J: Room No (use 'N/A' if empty)
                ]);
            });
        }

        // 3. Append all the created rows to the sheet in a single API call
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: '1Fs22_wlmytKU0Ax31Dfx5gC7kqoq6CMpdr-tvFkhUNU',
            range: 'Sheet1!A:J', // The range now covers all 10 columns
            valueInputOption: 'RAW',
            resource: {
                values: rowsToAdd, // Pass the array of all rows
            },
        });

        console.log('Successfully added data to sheet.');
        return 'Team data successfully added to the sheet!';

    } catch (error) {
        // Log the full error for better debugging
        console.error('Error adding data to sheet:', error.message);
        return 'Error adding data';
    }
};

module.exports = sendData;
