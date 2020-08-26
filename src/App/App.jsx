import React from 'react';
import { Router, Route, Link, Switch } from 'react-router-dom';

import { history } from '@/_helpers';
import { authenticationService } from '@/_services';
import { PrivateRoute } from '@/_components';
import { HomePage } from '@/HomePage';
import { LoginPage } from '@/LoginPage';
import { PatternPage } from '@/PatternPage';
import { PlanningPage } from '@/PlanningPage';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentUser: null
        };
    }

    componentDidMount() {
        authenticationService.currentUser.subscribe(x => this.setState({ currentUser: x }));
    }

    logout() {
        authenticationService.logout();
        history.push('/login');
    }

    render() {
        const { currentUser } = this.state;
        // this.logout()
        return (
            <Router history={history}>
                <div>
                    <nav className="navbar navbar-inverse">
                        <div className="container-fluid">
                            <div className="navbar-header">
                            <Link to="/" className="navbar-brand">Knitwit</Link>
                            </div>
                            <ul className="nav navbar-nav">
                                <li>Placeholder</li>
                                <li>{currentUser && <a onClick={this.logout} className="nav-item nav-link">Logout</a>}</li>
                            </ul>
                        </div>
                    </nav>
                    <div className="jumbotron">
                        <Switch>
                            <PrivateRoute exact path="/" component={HomePage} />
                            <Route path="/login" component={LoginPage} />
                            <Route path="/planning" component={PlanningPage} />
                            {/* <Route path="/pattern" component={Pattern} /> */}
                            <Route path="/:id" component={PatternPage}/>
                        </Switch>
                    </div>
                </div>
            </Router>
        );
    }
}

export { App }; 