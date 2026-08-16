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
    </>
  );
}

export default App;
