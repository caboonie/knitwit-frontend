import React from 'react';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import { userService, authenticationService,  } from '@/_services';

import { Link } from 'react-router-dom';
import config from 'config';

class HomePage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentUser: authenticationService.currentUserValue,
            patterns: null
        };
    }

    componentDidMount() {
        userService.getUserPatterns().then(patterns => this.setState({ patterns }));
    }

    render() {
        const { currentUser, patterns } = this.state;
        console.log("patterns",patterns)
        // todo - show pattern preview - perhaps in python convert the colorGrid into 
        return (
            <div>
                <h1>Hi {currentUser.username}!</h1>
                <h3>Your patterns:</h3>
                {patterns &&
                    <ul>
                        {patterns.map(pattern =>
                            <li key={pattern.id}>
                                <Link to={"/"+pattern.id}>
                                    {pattern.name}
                                    <img style={{width:100}} src={`${config.apiUrl}/get_image/${pattern.id}?${pattern.timestamp}`} alt=""></img>
                                </Link>
                            </li>
                        )}
                    </ul>
                }
                {!patterns  && <p>No patterns yet!</p>}
                <h3>Make new pattern!</h3>
                <Formik
                    initialValues={{
                        title: '',
                        document: ''
                    }}
                    // validationSchema={Yup.object().shape({
                    //     title: Yup.string().required('Title is required')
                    // })}
                    onSubmit={({ title, document }, { setStatus, setSubmitting }) => {
                        console.log("document",document)
                        setStatus();
                        userService.newPattern(title, document)
                            .then(
                                response => {
                                    
                                    // if there is a document then upload that as well with a changed name
                                    if (document) {
                                        console.log("redirect to planning")
                                        localStorage.setItem('patternId', response.id)
                                        localStorage.setItem('imageWidth', response.imageWidth)
                                        localStorage.setItem('imageHeight', response.imageHeight)
                                        const {from } = this.props.location.state || { from: { pathname: "/planning" } };
                                        //     userService.uploadImg(document, pattern.id)
                                        this.props.history.push(from);
                                    } else {
                                        const { from } = this.props.location.state || { from: { pathname: "/"+response.id } };
                                        this.props.history.push(from);
                                    }
                                    
                                },
                                error => {
                                    setSubmitting(false);
                                    setStatus(error);
                                }
                            );
                    }}
                    render={({ errors, status, touched, isSubmitting, values, setValues }) => (
                        <Form>
                            <div className="form-group">
                                <label htmlFor="title">Title</label>
                                <Field name="title" type="text" className={'form-control' + (errors.username && touched.username ? ' is-invalid' : '')} />
                                <ErrorMessage name="title" component="div" className="invalid-feedback" />
                            </div>
                            <div className="form-group">
                                <input name="document" type="file" onChange={(event) => {
                                    const newValues = { ...values }; // copy the original object
                                    // console.log("target files", event.currentTarget.files)
                                    newValues[event.currentTarget.name] = event.currentTarget.files;
                                    setValues(newValues);
                                    }} />
                            </div>
                            <div className="form-group">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Make Pattern</button>
                                {isSubmitting &&
                                    <img src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==" />
                                }
                            </div>
                            {status &&
                                <div className={'alert alert-danger'}>{status}</div>
                            }
                        </Form>
                    )}
                />
            </div>
        );
    }
}

export { HomePage };