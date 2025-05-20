const mongoose  = require ("mongoose")

const ownerSchema = new mongoose.Schema({
    ownersName: {
        type: String,
        required: true,
    },
    ownersPhone: {
        type: String,
        required: true,
    },
    ownersNationalIdentificationNumber: {
        type: String,
        required: true,
    },
    ownersEmail: {
        type: String,
        required: true,
    },
    ownersPassword: {
        type: String,
        required: true,
    },

})

module.exports=mongoose.model("Owner",ownerSchema);