const express = require('express');
const { google } = require('googleapis');
const router = express.Router;


const keys = require('./mail-integration-432404-245293fe40fe.json');

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);
async function sendData(req){
    const {payment_id,fullName,email,year,registerNumber,phone,department } = req;
    console.log(req.body)

    try {
        await client.authorize();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: '1KIwN6mxIomD7tboTAa0NLGUjcCcIGuTX6yQL3XhAkyo', // Replace with your actual spreadsheet ID
            range: 'Sheet1!A:F', 
            valueInputOption: 'RAW',
            resource: {
                values: [[fullName,email,registerNumber,year,department,phone]],
            },
        });
        console.log(response)
        return 'Data successfully added to the sheet!';
    } catch (error) {
        console.error('Error adding data to sheet:', error);
        return 'Error adding data';
    }
};
module.exports=sendData;