import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AnimateBackground from "./components/AnimateBackground";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import ChatBoard from "./components/ChatBoard";

function App() {
  const isLoggedIn = !!localStorage.getItem("userId"); // !! makes it boolean

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden">
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isLoggedIn ? <Navigate to="/chatconvo" replace /> : (
              <>
                <AnimateBackground />
                <LoginForm />
              </>
            )
          }
        />
        <Route
          path="/signup"
          element={
            isLoggedIn ? <Navigate to="/chatconvo" replace /> : (
              <>
                <AnimateBackground />
                <SignupForm />
              </>
            )
          }
        />

        {/* Protected route */}
        <Route
          path="/chatconvo"
          element={<ChatBoard />}
        />

        {/* Catch-all → redirect to login or chat */}
        <Route path="*" element={<Navigate to={isLoggedIn ? "/chatconvo" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

export default App;