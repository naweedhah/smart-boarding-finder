import { useContext, useState } from "react";
import "./login.scss";
import { Link, useNavigate } from "react-router-dom";
import apiRequest from "../../../lib/apiRequest";
import { AuthContext } from "../../../context/AuthContext";

const getDashboardPath = (role) => {
  if (role === "admin") return "/sakith/admin";
  if (role === "boardingOwner") return "/boardings";
  return "/profile";
};

const validateLoginForm = (values) => {
  const nextErrors = {};

  if (!values.username.trim()) {
    nextErrors.username = "Username is required.";
  } else if (values.username.trim().length < 3) {
    nextErrors.username = "Username must be at least 3 characters.";
  }

  if (!values.password) {
    nextErrors.password = "Password is required.";
  } else if (values.password.length < 8) {
    nextErrors.password = "Password must be at least 8 characters.";
  }

  return nextErrors;
};

function Login() {
  const [formValues, setFormValues] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const {updateUser} = useContext(AuthContext)

  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValues = {
      ...formValues,
      [name]: value,
    };

    setFormValues(nextValues);

    if (touchedFields[name]) {
      const nextErrors = validateLoginForm(nextValues);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: nextErrors[name],
      }));
    }
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    const nextErrors = validateLoginForm(formValues);

    setTouchedFields((prev) => ({
      ...prev,
      [name]: true,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [name]: nextErrors[name],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const values = formValues;

    const nextErrors = validateLoginForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setTouchedFields({
        username: true,
        password: true,
      });
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const res = await apiRequest.post("/auth/login", {
        ...values,
      });

      updateUser(res.data);

      navigate(getDashboardPath(res.data.role));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to login.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="login">
      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <label>
            <input
              name="username"
              minLength={3}
              maxLength={20}
              type="text"
              placeholder="Username"
              value={formValues.username}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {fieldErrors.username && <small>{fieldErrors.username}</small>}
          </label>
          <label>
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formValues.password}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {fieldErrors.password && <small>{fieldErrors.password}</small>}
          </label>
          <button disabled={isLoading}>Login</button>
          {error && <span className="formError">{error}</span>}
          <Link to="/register">{"Don't"} you have an account?</Link>
        </form>
      </div>
      <div className="imgContainer">
        <img src="/bg.png" alt="" />
      </div>
    </div>
  );
}

export default Login;
