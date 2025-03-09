import conf from "../conf/conf";
import { Client, Account } from "appwrite";

export class AuthService {
  client = new Client();
  account;

  constructor() {
    this.client
      .setEndpoint(conf.appwriteUrl)
      .setProject(conf.appwriteProjectId);
    this.account = new Account(this.client);
  }

  async login({ email, password }) {
    try {
      // Create a session with Appwrite
      const session = await this.account.createEmailPasswordSession(
        email,
        password
      );
      console.log("Login successful:: ", session);

      // Get user details
      const user = await this.account.get();
      return user;
    } catch (error) {
      console.error("Login error:: ", error.message);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      return await this.account.get();
    } catch (error) {
      console.log("Not logged in");
      return null;
    }
  }

  async logout() {
    try {
      await this.account.deleteSessions();
      console.log("Logout successful");
    } catch (error) {
      console.log("Logout error:", error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
