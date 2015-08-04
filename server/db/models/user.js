'use strict';
var crypto = require('crypto');
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
    email: {
        type: String,
        // required: true,
        // unique: true
    },
    password: {
        type: String
        // required: true
    },
    salt: {
        type: String
    },
    twitter: {
        id: String,
        username: String,
        token: String,
        tokenSecret: String
    },
    facebook: {
        id: String,
        accessToken: String,
        refreshToken: String
    },
    google: {
        id: String,
        accessToken: String,
        refreshToken: String
    },
    name: {
        first: {
            type: String,
            required: true
        },
        last: {
            type: String,
            required: true
        }
    },
    photo: String,
    roles: [{
        type: String,
        enum: ['User', 'Admin', 'Merchant'],
        default: 'User'
    }],
    storeName: String,
    storeDesc: String,
    storeURL: String

});

// generateSalt, encryptPassword and the pre 'save' and 'correctPassword' operations
// are all used for local authentication security.
var generateSalt = function() {
    return crypto.randomBytes(16).toString('base64');
};

var encryptPassword = function(plainText, salt) {
    var hash = crypto.createHash('sha1');
    hash.update(plainText);
    hash.update(salt);
    return hash.digest('hex');
};

schema.pre('save', function(next) {

    if (this.isModified('password')) {
        this.salt = this.constructor.generateSalt();
        this.password = this.constructor.encryptPassword(this.password, this.salt);
    }

    next();

});

schema.virtual("full_name").get(function() {
    return this.name.first + " " + this.name.last;
});

schema.virtual("reset_link").get(function() {
    var link = "http://localhost/reset/key/?email" + encodeURI(this.email) + "&expirationTime=" + (Date.now() + 48 * 60 * 60) + "&token=" + encryptPassword(this.password, this.salt);
    return link;
});

schema.statics.resetPass = function (query) {
    this.find({email: query.email}).exec().then(function(user){
        if(Date.now() < query.expirationTime && encryptPassword(user.password, user.salt)) {
            user.password = query.newPassword;
            return user.save();
        }
        throw new Error("Invalid reset attempt!!!");
    });
}

schema.statics.generateSalt = generateSalt;
schema.statics.encryptPassword = encryptPassword;

schema.method('correctPassword', function(candidatePassword) {
    return encryptPassword(candidatePassword, this.salt) === this.password;
});

mongoose.model('User', schema);
