const express=require("express")
const router=express.Router()
const Certificate=require("../modles/certificate")
const cors = require("cors")
router.use(cors())
router.use(express.json())

router.post("/add-certificate", async (req, res) => {
    try {
        const { Certificate_id,
            Name,
            regNo,
            WinningDate,  
            WinningPlace,
            Image_url, } = req.body;
            console.log(req.body)
        const check=await Certificate.findOne({Certificate_id})
        console.log(check)
        if(check){
            return res.json({message:"certificate already exist"})
        }
        const certificate = await Certificate.create(req.body);
        res.status(201).json({ message: "Certificate created successfully", certificate });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create certificate" });
    }
});

router.post('/verify-certificate', async (req, res) => {
    try {
        const certID = req.body.certID;

        const certificate = await Certificate.findOne({ Certificate_id: certID });

        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found!' });
        }

        res.json({
            name: certificate.Name,
            reg_no: certificate.reg_no,
            winning_date: certificate.Winning_Date,
            winning_place: certificate.Winning_place,
            img_url: certificate.Img_url,
            CertificateID:certificate.Certificate_id
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports=router;