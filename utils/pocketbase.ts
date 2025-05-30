import PocketBase from 'pocketbase';

const pocketbaseUrl = process.env.POCKETBASE_URL || 'https://trackit.pockethost.io/';

let pb: PocketBase;

if (typeof window !== 'undefined') {
  // Client-side initialization
  pb = new PocketBase(pocketbaseUrl);
  pb.autoCancellation(false);

  // Load auth state from cookies
  const loadAuthFromCookies = () => {
    pb.authStore.loadFromCookie(document.cookie);
  };

  // Save auth state to cookies
  const saveAuthToCookies = () => {
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false, secure: true });
  };

  // Initial load
  loadAuthFromCookies();

  // Set up auth state change listener
  pb.authStore.onChange(() => {
    saveAuthToCookies();
  });
} else {
  // Server-side initialization
  pb = new PocketBase(pocketbaseUrl);
}

export const authRefresh = async () => {
  try {
    const authData = await pb.collection('users').authRefresh();
    return authData;
  } catch (error) {
    console.error('Auth refresh failed:', error);
    return null;
  }
};

export const sendPasswordResetEmail = async (email: string) => {
  try {
    await pb.collection('users').requestPasswordReset(email);
    console.log(`Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    return false;
  }
};

export const registerUser = async (email: string, password: string, username: string) => {
  try {
    const record = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      username,
    });
    await pb.collection('users').requestVerification(email);
    return record;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw new Error('Registration failed. Please ensure the details are correct and try again.');
  }
};

export const sendVerificationEmail = async (email: string) => {
  try {
    await pb.collection('users').requestVerification(email);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
};

export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default pb;