import React from "react"; import ReactDOM from "react-dom/client"; import "./i18n"; import "./index.css"; import App from "./App"; import {seedDatabase} from "./db/database";
seedDatabase().catch(console.error);
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);