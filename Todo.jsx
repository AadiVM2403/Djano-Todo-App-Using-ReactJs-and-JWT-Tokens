import React, { useState, useEffect, useCallback } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import "semantic-ui-css/semantic.min.css";

export default function TodoList() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const navigate = useNavigate();
  const username = sessionStorage.getItem("username");

 
  const fetchTodos = useCallback(async () => {
    try {
      const res = await api.get("/todos/");
      setTodos(res.data);
    } catch (err) {
      console.error("Error fetching todos", err);
      if (err.response?.status === 401) navigate("/"); 
    }
  }, [navigate]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/profile/");
      if (res.data.profile_image) {
        const imageUrl = res.data.profile_image.startsWith("http")
          ? res.data.profile_image
          : `${window.location.origin}${res.data.profile_image}`;
        setProfilePhoto(imageUrl);
      }
    } catch (err) {
      console.error("Error loading profile", err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  
  const addTodo = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await api.post("/todos/", { title });
      setTitle("");
      fetchTodos();
    } catch (err) {
      console.error("Error adding todo", err);
    }
  };

  
  const updateTodo = async (id, currentStatus) => {
    try {
      await api.patch(`/todos/${id}/`, { complete: !currentStatus });
      fetchTodos();
    } catch (err) {
      console.error("Error updating todo", err);
    }
  };

  
  const deleteTodo = async (id) => {
    try {
      await api.delete(`/todos/${id}/`);
      fetchTodos();
    } catch (err) {
      console.error("Error deleting todo", err);
    }
  };

  
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profile_image", file);

    try {
      const res = await api.patch("/profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = res.data.profile_image.startsWith("http")
        ? res.data.profile_image
        : `${window.location.origin}${res.data.profile_image}`;

      setProfilePhoto(imageUrl);
    } catch (err) {
      console.error("Upload failed", err.response ? err.response.data : err);
      alert("Profile upload failed. Make sure your backend is running and the URL is correct.");
    }
  };

  
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="ui container" style={{ marginTop: "30px" }}>
      <div className="ui secondary menu">
        <div className="item">
          <button className="ui red button" onClick={handleLogout}>
            <i className="sign-out icon"></i> Logout
          </button>
        </div>

        <div className="right menu">
          <div
            className="item"
            style={{ display: "flex", alignItems: "center" }}
          >
            <span
              style={{ marginRight: "10px", fontWeight: "bold", fontSize: "18px" }}
            >
              {username}
            </span>

            <input
              type="file"
              id="photoInput"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />

            <img
              src={
                profilePhoto ||
                "https://semantic-ui.com/images/wireframe/square-image.png"
              }
              alt="Profile"
              className="ui circular image"
              style={{
                width: "45px",
                height: "45px",
                objectFit: "cover",
                cursor: "pointer",
              }}
              onClick={() => document.getElementById("photoInput").click()}
            />
          </div>
        </div>
      </div>

      <h1 className="ui center aligned header">Todo App</h1>
      <form className="ui form" onSubmit={addTodo}>
        <div className="field">
          <label>Todo Title</label>
          <input
            type="text"
            placeholder="Enter Todo..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <br />
          <button className="ui blue button" type="submit">
            Add
          </button>
        </div>
      </form>

      {todos.map((todo, index) => (
        <div className="ui segment" key={todo.id}>
          <p className="ui big header">
            {index + 1} | {todo.title}
          </p>

          {!todo.complete ? (
            <span className="ui gray label">Not Complete</span>
          ) : (
            <span className="ui green label">Completed</span>
          )}

          <button
            className="ui blue button"
            onClick={() => updateTodo(todo.id, todo.complete)}
          >
            Update
          </button>
          <button
            className="ui red button"
            onClick={() => deleteTodo(todo.id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
