import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import View from "./pages/View";
import "./index.css";

function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/:code">
          {(params) => <View params={params} />}
        </Route>
      </Switch>
      <footer style={{
        textAlign: "center",
        marginTop: "3rem",
        color: "var(--text-secondary)",
        fontSize: "0.875rem",
        opacity: 0.7
      }}>
        Developed with <span style={{ color: "var(--accent-color)" }}>♥</span> by <a style={{ color: "var(--text-secondary)", textDecoration: "none" }} href="https://anikesh.dev">Anikesh</a>
      </footer>
    </>
  );
}

export default App;
