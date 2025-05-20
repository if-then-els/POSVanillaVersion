
const User = require('../models/user')
exports.registerOwner = async (req, res) => {
    try{
        const { ownersName, ownersPhone, ownersNationalIdentificationNumber, ownersEmail, ownersPassword } = req.body;
        if (!ownersName || !ownersPhone || !ownersNationalIdentificationNumber || !ownersEmail || !ownersPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const existingOwner = await Owner.findOne({ ownersEmail });
        if (existingOwner) {
            return res.status(400).json({ message: "Owner already exists" });
        }
        const hashedPassword = await bcrypt.hash(ownersPassword, 10);
        const newOwner = new Owner({
            ownersName,
            ownersPhone,
            ownersNationalIdentificationNumber,
            ownersEmail,
            ownersPassword: hashedPassword,
        });
        await newOwner.save();
        res.status(201).json({ message: "Owner registered successfully", owner: newOwner });
    }catch(error){
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
}

exports.logOwner = async (req,res)=>{
    try{
        const { ownersEmail, ownersPassword } = req.body;
        if (!ownersEmail || !ownersPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const owner = await Owner.findOne({ ownersEmail });
        if (!owner) {
            return res.status(400).json({ message: "Owner not found,check your credentials" });
        }
        const isMatch = await bcrypt.compare(ownersPassword, owner.ownersPassword);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }
        res.status(200).json({ message: "Login successful", owner });
    }catch(error){
        console.error(error);
        return res.status(500).json({message:"server error"});
    }
}

exports.getNormalUsers = async(req,res)=>{
    try{
        const users = await User.find();
        res.status(200).json({message:"Users fetched successfully",users});
    }catch(error){
        console.error(error);
        return res.status(500).json({message:"server error"});
    }
}

exports.manageUsers = async(req,res)=>{
    try{
        const { userName, action } = req.body;
        if (!userName || !action) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User.findById(userName);
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        if (action === 'delete') {
            await User.findByIdAndDelete(userName);
            return res.status(200).json({ message: "User deleted successfully" });
        } else if (action === 'update') {
            const{newUserName,newUserEmail,newUserPassword} = req.body;
            if(!newUserName || !newUserEmail || !newUserPassword){
                return res.status(400).json({message:"All fields are required"});
            }
            const hashedPassword = await bcrypt.hash(newUserPassword, 10);
            user.userName = newUserName;
            user.userEmail = newUserEmail;
            user.userPassword = hashedPassword;
            await user.save();
            
            return res.status(200).json({ message: "User updated successfully", user });
        } else {
            return res.status(400).json({ message: "Invalid action" });
        }
    }catch(error){
        console.error(error);
        return res.status(500).json({message:"server error"});
    }
}