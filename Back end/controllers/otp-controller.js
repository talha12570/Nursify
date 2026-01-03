const nodemailer = require("nodemailer");
const EmailVerificationToken = require("../modals/EmailVerificationToken");
const Signup = require("../modals/user-modals");

// Generate OTP
const generateOTP = () => {
  let OTP = "";
  for (let i = 0; i < 6; i++) {
    const randomValue = Math.round(Math.random() * 9);
    OTP += randomValue;
  }
  return OTP;
};

// Configure email transport
const getEmailTransport = () => {
  // Use environment variables to allow switching SMTP providers (Gmail, SendGrid, Mailtrap, etc.)
  const host = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 2525;
  const user = process.env.SMTP_USER || "02c0b2df6efaeb";
  const pass = process.env.SMTP_PASS || "6e297ec4cd36c6";
  const secure = process.env.SMTP_SECURE === "true" ? true : port === 465;

  console.log("[otp-controller] creating transport", { host, port, secure, user: user && (user.length > 0 ? 'set' : 'not-set') });

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      // allow self-signed certs for testing; set to true in prod to be stricter
      rejectUnauthorized: false,
    },
  });
};

// Send OTP Email
const sendOTPEmail = async (email, OTP, purpose = "verification") => {
  const transport = getEmailTransport();
  const subjects = {
    verification: "Email Verification",
    "2fa": "Two-Factor Authentication Code",
    login: "Login Verification Code",
  };

  try {
    // Verify transporter configuration (will throw if invalid)
    await transport.verify();
    console.log("[otp-controller] Email transport verified");

    const info = await transport.sendMail({
      from: "Nursify Healthcare <no-reply@nursify.com>",
      to: email,
      subject: subjects[purpose] || "Verification Code",
      html: `<p>Your verification OTP</p>
           <h1>${OTP}</h1>
           <p>This code will expire in 1 hour.</p>`,
    });

    console.log("[otp-controller] OTP email sent", { to: email, messageId: info && info.messageId });
    return info;
  } catch (err) {
    console.error("[otp-controller] Error sending OTP email", err);
    // rethrow so caller can handle and client receives error
    throw err;
  }
};

// Send OTP for Email Verification
const sendVerificationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userExist = await Signup.findOne({ email });

    if (!userExist) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userExist.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Delete any existing tokens for this user
    await EmailVerificationToken.deleteMany({ owner: userExist._id });

    // Generate new OTP
    const OTP = generateOTP();

    // Save token to database
    const emailVerificationToken = new EmailVerificationToken({
      owner: userExist._id,
      token: OTP,
    });
    await emailVerificationToken.save();

    // Send OTP via email
    await sendOTPEmail(userExist.email, OTP, "verification");

    res.status(200).json({
      message: "OTP sent successfully to your email",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    console.log('[verifyOTP] Request:', { email, otp: otp, otpType: typeof otp });

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Ensure OTP is a string and trim any whitespace
    const otpString = String(otp).trim();

    const userExist = await Signup.findOne({ email });

    if (!userExist) {
      console.log('[verifyOTP] User not found:', email);
      return res.status(404).json({ message: "User not found" });
    }

    const token = await EmailVerificationToken.findOne({ owner: userExist._id });

    if (!token) {
      console.log('[verifyOTP] No token found for user:', userExist._id);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    console.log('[verifyOTP] Comparing OTP...');
    const isValid = await token.compareToken(otpString);
    console.log('[verifyOTP] OTP valid:', isValid);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark user as verified
    userExist.isVerified = true;
    await userExist.save();

    // Delete the used token
    await EmailVerificationToken.deleteOne({ _id: token._id });

    console.log('[verifyOTP] Email verified successfully for:', email);

    // Check if user needs approval (nurse/caretaker)
    const requiresApproval = (userExist.userType === 'nurse' || userExist.userType === 'caretaker') && !userExist.isApproved;

    // Return token and basic user info so client can sign the user in
    res.status(200).json({
      message: requiresApproval ? "Email verified! Your account is pending admin approval." : "Email verified successfully",
      success: true,
      token: await userExist.generateToken(),
      requiresApproval: requiresApproval,
      user: {
        _id: userExist._id.toString(),
        fullName: userExist.fullName,
        email: userExist.email,
        phone: userExist.phone,
        userType: userExist.userType,
        isAdmin: userExist.isAdmin,
        isVerified: userExist.isVerified,
        isApproved: userExist.isApproved,
        professionalImage: userExist.professionalImage,
        licenseNumber: userExist.licenseNumber,
        specialty: userExist.specialty,
      },
    });
  } catch (error) {
    console.error('[verifyOTP] Error:', error);
    next(error);
  }
};

// Send 2FA OTP for Login
const send2FAOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userExist = await Signup.findOne({ email });

    if (!userExist) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userExist.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is not enabled for this account" });
    }

    // Delete any existing tokens for this user
    await EmailVerificationToken.deleteMany({ owner: userExist._id });

    // Generate new OTP
    const OTP = generateOTP();

    // Save token to database
    const emailVerificationToken = new EmailVerificationToken({
      owner: userExist._id,
      token: OTP,
    });
    await emailVerificationToken.save();

    // Send OTP via email
    await sendOTPEmail(userExist.email, OTP, "2fa");

    res.status(200).json({
      message: "2FA code sent successfully to your email",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// Verify 2FA OTP
const verify2FAOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const userExist = await Signup.findOne({ email });

    if (!userExist) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = await EmailVerificationToken.findOne({ owner: userExist._id });

    if (!token) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const isValid = await token.compareToken(otp);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Delete the used token
    await EmailVerificationToken.deleteOne({ _id: token._id });

    res.status(200).json({
      message: "2FA verification successful",
      success: true,
      token: await userExist.generateToken(),
      userId: userExist._id.toString(),
      user: {
        _id: userExist._id.toString(),
        fullName: userExist.fullName,
        email: userExist.email,
        phone: userExist.phone,
        userType: userExist.userType,
        isAdmin: userExist.isAdmin,
        isVerified: userExist.isVerified,
        isApproved: userExist.isApproved,
        professionalImage: userExist.professionalImage,
        licenseNumber: userExist.licenseNumber,
        specialty: userExist.specialty,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Enable 2FA for user
const enable2FA = async (req, res, next) => {
  try {
    const userId = req.user.user_id; // From auth middleware

    const user = await Signup.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({
      message: "2FA enabled successfully",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// Disable 2FA for user
const disable2FA = async (req, res, next) => {
  try {
    const userId = req.user.user_id; // From auth middleware

    const user = await Signup.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    user.twoFactorEnabled = false;
    await user.save();

    // Delete any existing tokens for this user
    await EmailVerificationToken.deleteMany({ owner: user._id });

    res.status(200).json({
      message: "2FA disabled successfully",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// Resend OTP
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userExist = await Signup.findOne({ email });

    if (!userExist) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete any existing tokens for this user
    await EmailVerificationToken.deleteMany({ owner: userExist._id });

    // Generate new OTP
    const OTP = generateOTP();

    // Save token to database
    const emailVerificationToken = new EmailVerificationToken({
      owner: userExist._id,
      token: OTP,
    });
    await emailVerificationToken.save();

    // Send OTP via email
    await sendOTPEmail(userExist.email, OTP, "verification");

    res.status(200).json({
      message: "OTP resent successfully",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendVerificationOTP,
  verifyOTP,
  send2FAOTP,
  verify2FAOTP,
  enable2FA,
  disable2FA,
  resendOTP,
};