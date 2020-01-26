const userSchema = {
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String
    },
    contactNo: {
        type: String
    },
    status: {
        type: String,
        enum: [
            'CREATED',
            'ACTIVE',
            'DISABLED',
            'DELETED'
        ]
    },
    level: {
        type: String,
        enum: [
            'ADMIN',
            'MANAGER',
            'LOCAL'
        ]
    }
};

module.exports = userSchema;