import { useState } from "react"; 
import authService from "../Appwrite/auth";

function LoginPage({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await authService.login(credentials);
      onLoginSuccess(user);
    } catch (error) {
      // Format error message for user
      let errorMessage = "Login failed. Please check your credentials.";

      if (error.code === 401) {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 429) {
        errorMessage = "Too many login attempts. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Employee Management System
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Please log in with your authorized credentials to access the system.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              className="mt-1 w-full p-2 border rounded-md"
              placeholder="youremail@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              className="mt-1 w-full p-2 border rounded-md"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            This is a restricted system. Contact the administrator if you need
            access.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
