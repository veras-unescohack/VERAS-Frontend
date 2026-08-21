import { UserPrompt } from "./components/UserPrompt";
import { useFetch } from "./services/useFetch";

import './index.css'

export default function App() {
  const { data } = useFetch("https://jsonplaceholder.typicode.com/posts/1")

  return (
    <main className="main-container">
      <h1>VERAS</h1>
      <UserPrompt/>
    </main>
  );
}