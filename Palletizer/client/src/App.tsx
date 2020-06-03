import React, {Component} from 'react';
import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';


//Components
import Header from "./parts/Header";
import NavBar from "./parts/NavBar";

// Main Components
import General from "./parts/General";
import Configuration from "./parts/Configuration";
// Styles
import './App.scss';


// interface
interface AppProps {
  
}
interface AppState {
  selected_index: number;
}

class App extends Component<AppProps, AppState> {
  constructor(props : any) {
      super(props);
      this.state = {"selected_index": 0};
  }

  render() {
    let {selected_index} = this.state;
    // Routes must reflect this..
    let tab_options = ['General', 'Configuration'];
    let tab_copy = tab_options.slice();
    let config_index = 1;
    let general_index = 0;
    // let selected = 'G';
    return (
      <Router>
        <div className="App">
            <Header />
            <Switch>
              <Route path="/Configuration">
                <NavBar tabs={tab_options} selected_index={config_index}/>
                <Configuration />
              </Route>
              <Route path="/">
                <NavBar tabs={tab_options} selected_index={general_index}/>
                <General />
              </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}


export default App;
