import requests as rq
import pandas as pd
from typing import Dict, List

def get_data() -> List[Dict]:
    response = rq.get("http://localhost:3001/event/students")
    return response.json()

def create_team_record(team: Dict) -> Dict:
    record = {
        "Team Name": team.get("teamname", ""),
        "Problem Statement": team.get("ProblemStatement", ""),
        "Domain": team.get("Domain", ""),
        "Score": team.get("Score", 0),
        "Second Review Score": team.get("SecoundReviewScore", 0),
        "Third Review Score": team.get("ThirdReviewScore", 0),
        "Final Score": team.get("FinalScore", 0),
        "Room": team.get("room", ""),
        "UPI ID": team.get("upiId", ""),
        "Transaction ID": team.get("transtationId", ""),
        "Verification Status": "Verified" if team.get("verified", False) else "Pending"
    }
    
    # Add review data if available
    for review_type in ["FirstReview", "SecoundReview", "ThirdReview"]:
        if review_type in team:
            for key, value in team[review_type].items():
                record[f"{review_type}_{key}"] = value
    
    return record

def generate_excel():
    data = get_data()
    records = []
    
    for team in data:
        team_record = create_team_record(team)
        
        # Add team lead info
        lead_record = team_record.copy()
        lead_record.update({
            "Name": team.get("name", ""),
            "Email": team.get("email", ""),
            "Hostel":team.get("type",""),
            "Registration Number": team.get("registrationNumber", ""),
            "Role": "Team Lead",
            "Sector":team.get("Sector","")

        })
        records.append(lead_record)
        
        # Add team members info
        for member in team.get("teamMembers", []):
            member_record = team_record.copy()
            member_record.update({
                "Name": member.get("name", ""),
                "Email":member.get("registrationNumber", "")+"@klu.ac.in",
                "Registration Number": member.get("registrationNumber", ""),
                "Hostel":member.get("type",''),
                "Role": "Team Member",
                "Sector":team.get("Sector","")
            })
            records.append(member_record)

    # Create and save Excel file
    df = pd.DataFrame(records)
    df.to_excel("innovation_teams.xlsx", index=False)
    print("Excel file generated successfully!")

if __name__ == "__main__":
    generate_excel()
