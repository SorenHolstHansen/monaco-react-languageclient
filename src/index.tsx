import React from "react";
import ReactDOM from "react-dom/client";
import { ReactMonacoEditor } from "./CodeEditor";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <ReactMonacoEditor />
  </React.StrictMode>
);
