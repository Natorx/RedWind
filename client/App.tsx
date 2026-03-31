import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import './styles/main.css'
function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      hello1
    </main>
  );
}

export default App;
