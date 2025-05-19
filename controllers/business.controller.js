const BusinessDetails = require("../models/businessDetails");

exports.registerBusiness = async (req, res) => {
  try {
    const {
      businessName,
      businessLocation,
      businessPhone,
      owner,
      ownerName,
      ownerNationalIdentificationNumber,
    } = req.body;
    if (
      !businessName ||
      !businessLocation ||
      !businessPhone ||
      !owner ||
      !ownerName ||
      !ownerNationalIdentificationNumber
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingBusiness = await BusinessDetails.findOne({ businessName });
    if (existingBusiness) {
      return res.status(400).json({ message: "Business already exists" });
    }
    const newBusiness = new BusinessDetails({
      businessName,
      businessLocation,
      businessPhone,
      owner,
      ownerName,
      ownerNationalIdentificationNumber,
    });
    await newBusiness.save();
    res.status(201).json({
      message: "Business registered successfully",
      business: {
        id: newBusiness._id,
        businessName: newBusiness.businessName,
        businessLocation: newBusiness.businessLocation,
        businessPhone: newBusiness.businessPhone,
        owner: newBusiness.owner,
        ownerName: newBusiness.ownerName,
        ownerNationalIdentificationNumber:
          newBusiness.ownerNationalIdentificationNumber,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
