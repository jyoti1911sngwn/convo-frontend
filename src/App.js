import React from "react";
import AnimateBackground from "./components/AnimateBackground";
import LoginForm from "./components/LoginForm";
import ChatBoard from "./components/ChatBoard";
import { Route, Routes } from "react-router-dom";
import SignupForm from "./components/SignupForm";

function App() {
  const isLoggedIn = localStorage.getItem("userId");
  return (
    <div className="h-screen w-screen relative bg-black">
      {/* <div className="absolute inset-0 overflow-hidden">
  <div className="absolute w-72 h-72 bg-green-500/20 rounded-full blur-3xl top-10 left-10 animate-float" />
  <div className="absolute w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl bottom-20 right-10 animate-float-delayed" />
</div>
<div className="
  absolute w-96 h-96 
  bg-green-500/25 
  rounded-full 
  blur-3xl 
  animate-float 
  animate-glow 
  animate-rotate-slow
"/> */}
      <Routes>
        <Route
          path="/login"
          element={
            <>
              <AnimateBackground />
              <LoginForm />
            </>
          }
        />
        <Route
          path="/signup"
          element={
            <>
              <AnimateBackground />
              <SignupForm />
            </>
          }
        />
        {isLoggedIn ? <Route path="/chatconvo" element={<ChatBoard />} /> : <Route
          path="/login"
          element={
            <>
              <AnimateBackground />
              <LoginForm />
            </>
          }
        />}
      </Routes>
    </div>
  );
}

export default App;
