import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("")
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const login = await fetch("https://convo-backend-6nfw.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });
    
    const res= await login.json();
    localStorage.setItem("userId" , res.id);
    localStorage.setItem("userName" , res.name);
    localStorage.setItem("description", res.description)
    if (res.compare) {
      navigate("/chatconvo");
    } else {
      setMessage("error occured , try again")
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="
          w-full max-w-md
          rounded-2xl
          bg-black/70
          backdrop-blur-xl
          border border-green-500/20
          shadow-[0_0_40px_rgba(0,255,128,0.15)]
          p-8 space-y-6
        "
      >
        <h1 className="text-3xl font-semibold text-center tracking-wide text-green-400">
          Welcome to <span className="font-extrabold">CONVO</span>
        </h1>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="
              w-full
              px-4 py-3
              rounded-lg
              bg-gray-900
              text-white
              placeholder-gray-400
              border border-gray-700
              focus:outline-none
              focus:border-green-400
              focus:ring-2 focus:ring-green-400/40
              transition
            "
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="
              w-full
              px-4 py-3
              rounded-lg
              bg-gray-900
              text-white
              placeholder-gray-400
              border border-gray-700
              focus:outline-none
              focus:border-green-400
              focus:ring-2 focus:ring-green-400/40
              transition
            "
            required
          />
        </div>

        <button
          type="submit"
          className="
            w-full
            py-3
            rounded-lg
            font-semibold
            text-black
            bg-green-400
            hover:bg-green-500
            active:scale-95
            transition-all
            shadow-[0_0_20px_rgba(0,255,128,0.4)]
          "
          // onClick={() => navigate("/chatconvo")}
        >
          Login
        </button>
        {message && <div style={{color: "red"}}>{message}</div>}

        <p className="text-center text-sm text-gray-400">
          Don’t have an account?{" "}
          <span className="text-green-400 hover:underline cursor-pointer" onClick={() => navigate("/chatconvo")}>
            Sign up
          </span>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
