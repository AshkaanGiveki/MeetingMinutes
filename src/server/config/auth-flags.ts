export const authFlags = {
  otpLogin: process.env.AUTH_OTP_ENABLED !== 'false',
  passwordLogin: process.env.AUTH_PASSWORD_LOGIN_ENABLED !== 'false',
  publicRegistrationDisabled: process.env.AUTH_PUBLIC_REGISTRATION_DISABLED !== 'false',
  superAdminProvisioning: process.env.AUTH_SUPER_ADMIN_PROVISIONING !== 'false',
  projectNavigation: process.env.AUTH_PROJECT_NAVIGATION !== 'false',
  mobileRecovery: process.env.AUTH_MOBILE_RECOVERY !== 'false',
};
