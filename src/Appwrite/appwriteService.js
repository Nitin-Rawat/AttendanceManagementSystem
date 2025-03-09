import { Client, Databases, Storage ,Account} from "appwrite";
import conf from "../conf/conf";

const client = new Client();
client
  .setEndpoint(conf.appwriteUrl) // Set Appwrite API Endpoint
  .setProject(conf.appwriteProjectId) // Set Project ID 

const databases = new Databases(client);
const storage = new Storage(client);
const account = new Account(client);

export { databases, storage, account };
