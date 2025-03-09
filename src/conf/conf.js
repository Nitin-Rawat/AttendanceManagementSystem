const conf = {
  appwriteUrl: String(import.meta.env.VITE_APPWRITE_URL),
  appwriteApiKey: String(import.meta.env.VITE_APPWRITE_API_KEY),
  appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID),
  appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID),

  // Collections
  appwriteEmployeeCollectionId: String( 
    import.meta.env.VITE_APPWRITE_EMPLOYEE_COLLECTION_ID
  ),
  appwriteAttendanceLogsCollectionId: String(
    import.meta.env.VITE_APPWRITE_ATTENDANCE_COLLECTION_ID
  ),
  allowedUsersCollectionId: String(
    import.meta.env.VITE_APPWRITE_ALLOWED_USERS_COLLECTION_ID
  ),

  // Buckets
  appwriteQrBucketId: String(import.meta.env.VITE_APPWRITE_QR_BUCKET_ID),
  appwriteAvatarBucketId: String(
    import.meta.env.VITE_APPWRITE_AVATAR_BUCKET_ID
  ),
};

export default conf;
