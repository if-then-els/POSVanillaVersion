const businessRegistrationNumberRegex = /^[A-Z]{2,3}-[A-Z0-9]+$/;
const validateBusinessRegistration = (req, res, next) => {
  const { businessRegistrationNumber } = req.body;

  // Check if the business registration number matches the regex
  if (
    !businessRegistrationNumber ||
    !businessRegistrationNumberRegex.test(businessRegistrationNumber)
  ) {
    return res.status(400).json({
      error:
        "Invalid business registration number format. It should be in the format of 'XX-123456' or 'XXX-123456'.",
    });
  }

  next();
};

module.exports = validateBusinessRegistration;
