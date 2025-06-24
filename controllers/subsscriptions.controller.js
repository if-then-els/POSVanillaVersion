exports.createSubscription = async(req,res) => {
    try{
        const { user, plan, startDate, endDate, status, autoRenew, paymentMethod, lastPaymentDate, nextBillingDate } = req.body;

        const newSubscription = new Subscription({
            user,
            plan,
            startDate: startDate || Date.now(),
            endDate,
            status: status || "inactive",
            autoRenew: autoRenew || false,
            paymentMethod,
            lastPaymentDate,
            nextBillingDate
        });

        await newSubscription.save();
        res.status(201).json({ message: "Subscription created successfully", subscription: newSubscription });
    }
}