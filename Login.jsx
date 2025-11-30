import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import "semantic-ui-css/semantic.min.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await api.post("/token/", { username, password });

    sessionStorage.setItem("accessToken", res.data.access);
    sessionStorage.setItem("refreshToken", res.data.refresh);
    sessionStorage.setItem("username", username); 

    navigate("/todos");
  } catch (err) {
    setError("Invalid username or password");
  }
};


  return (
    <div className="ui container" style={{ marginTop: "100px" }}>
      <h2 className="ui center aligned header">Login</h2>
      <form className="ui form" onSubmit={handleLogin} style={{ width: "300px", margin: "auto" }}>
        <div className="field">
          <label>Username</label>
          <input
            type="text"
            value={username}
            placeholder="Enter username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            placeholder="Enter password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="ui blue button" type="submit">
          Login
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}
