const Innov = require("./modles/innov")
const connectDB = require("./db")
const sectors = ["Naruto", "Sasuke", "Itachi"]
const generateTeamPassword = async () => {
    try {
        await connectDB()
        const teams = await Innov.find({})
        
        console.log("\n=== Team Sectors ===\n")
        
        for (let i = 0; i < teams.length; i++) {
            const team = teams[i]
            const sectorIndex = Math.floor(i / 15)
            const sector = sectors[sectorIndex] 
            team.Sector = sector
            await team.save()
            console.log(`S.no ${i+1} Sector ${sector} | Team: ${team.teamname.padEnd(20)}`)
        }
        console.log("\n=== End of Passwords and Sectors ===\n")
    } catch (error) {
        console.error("Error generating  sectors:", error)
    } finally {
        process.exit()
    }
}

generateTeamPassword()