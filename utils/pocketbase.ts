import PocketBase from 'pocketbase';

// const pocketbaseUrl = 'http://127.0.0.1:8090';
const pocketbaseUrl = 'https://trackit.pockethost.io/';

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
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
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

export const sendVerificationEmail = async (email: string) => {
  try {
    await pb.collection('users').requestVerification(email);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
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
    throw error;
  }
};

export default pb;