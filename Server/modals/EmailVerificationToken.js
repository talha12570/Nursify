const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const EmailVerificationTokenSchema = mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: 3600, // Expires in 1 hour (3600 seconds)
    default: Date.now, // Fixed: removed () so it's called when document is created
  },
});

EmailVerificationTokenSchema.pre("save", async function () {
  if (this.isModified("token")) {
    this.token = await bcrypt.hash(this.token, 10);
  }
});

EmailVerificationTokenSchema.methods.compareToken = async function (token) {
  console.log('[EmailVerificationToken] Comparing token:', { 
    inputToken: token, 
    inputType: typeof token, 
    inputLength: token ? token.length : 0,
    storedTokenHash: this.token.substring(0, 20) + '...'
  });
  const result = await bcrypt.compare(String(token), this.token);
  console.log('[EmailVerificationToken] Comparison result:', result);
  return result;
};
module.exports = mongoose.model(
  "EmailVerificationToken",
  EmailVerificationTokenSchema
);