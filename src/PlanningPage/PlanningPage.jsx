import React from 'react';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import { userService, authenticationService,  } from '@/_services';

import { Link } from 'react-router-dom';
import config from 'config';

// planning page for uploaded image to pattern
//  need to be able to specify which image we are working on - maybe store pattern id in the local_storage on make-pattern and use that
//  inst
const maxStitchWidth = 200;
const maxStitchHeight = 200;
const maxColors = 20;
const initWidth = 50

class PlanningPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentUser: authenticationService.currentUserValue,
            patternId: localStorage.getItem('patternId'),
            imageWidth: localStorage.getItem('imageWidth'),
            imageHeight: localStorage.getItem('imageHeight'),
            lastUpload: new Date(),
            lastPixelated: new Date(),
            width: initWidth,
            height: initWidth*localStorage.getItem('imageHeight')/localStorage.getItem('imageWidth'),
            nColors: 10,
            displayWidth: initWidth,
            displayHeight: initWidth*localStorage.getItem('imageHeight')/localStorage.getItem('imageWidth'),
            displayNColors: 10,
        };

        this.callPixelize = this.callPixelize.bind(this);
    }

    componentDidMount() {
        if (this.state.currentPattern === null) {
            authenticationService.logout();
            location.reload(true);
        }
        console.log("calling pixelize init")
        this.callPixelize();
        
    }

    callPixelize() {
        userService.pixelizeImage(this.state.patternId, this.state.width, this.state.height, this.state.nColors).then(response => {
            this.setState({lastPixelated: new Date()})
            console.log("setting lastPixelated nColors", this.state.nColors)
            this.setState({width: this.state.width})
        });
    }

    render() {
        const { currentUser, patternId } = this.state;
        console.log("lastPixelated",this.state.lastPixelated)
        // todo - show pattern preview - perhaps in python convert the colorGrid into 
        return (
            <div>
                <Formik
                    render={({ errors, status, touched, isSubmitting, values, setValues }) => (
                    <Form>
                        <div className="form-group">
                            <label>Change Image: </label>
                            <input name="document" type="file" onChange={(event) => {
                                userService.uploadImage(event.currentTarget.files, this.state.patternId).then(response => {
                                        this.setState({lastUpload: new Date()})
                                        }
                                    )
                                }} />
                        </div>
                    </Form>
                    )}
                />
                <h4>Original Image</h4>
                <img style={{width:100}} src={`${config.apiUrl}/get_upload_image/${patternId}?${this.state.lastUpload}`} alt=""></img>
                <Formik
                    render={({ errors, status, touched, isSubmitting, values, setValues }) => (
                    <Form>
                        <div className="form-group">
                            <label>Width: </label>
                            <input name="width" type="number" value={this.state.displayWidth} onChange={(event) => {
                                const width = Math.max(Math.min(maxStitchWidth,parseInt(event.target.value) || 1),1)
                                const height = width*this.state.imageHeight/this.state.imageWidth;
                                this.state.width = width
                                this.state.height = height
                                this.setState({width: width, height: height, displayWidth: Math.min(event.target.value,maxStitchWidth), displayHeight: height})
                                this.callPixelize()
                            }} />
                        </div>
                        <div className="form-group">
                            <label>Height: </label>
                            <input name="height" type="number" value={this.state.displayHeight} onChange={(event) => {
                                const height = Math.max(Math.min(maxStitchHeight,parseInt(event.target.value) || 1),1)
                                const width = height*this.state.imageWidth/this.state.imageHeight;
                                this.state.width = width
                                this.state.height = height
                                this.setState({width: width, height: height, displayWidth: width, displayHeight: Math.min(event.target.value,maxStitchHeight)})
                                this.callPixelize()
                            }} />
                        </div>
                        <div className="form-group">
                            <label>Colors: </label>
                            <input name="nColors" type="number" value={this.state.displayNColors} onChange={(event) => {
                                const nColors = Math.max(Math.min(maxColors,parseInt(event.target.value) || 2),2)
                                this.state.nColors = nColors;
                                this.setState({nColors: nColors, displayNColors: Math.min(event.target.value, maxColors)})
                                this.callPixelize()
                            }} />
                        </div>
                    </Form>
                    )}
                />
                <img style={{width:100}} src={`${config.apiUrl}/get_pixelated_image/${patternId}?${this.state.lastPixelated}`} alt=""></img>

                <Formik
                    initialValues={{
                    }}
                    onSubmit={({ }, { setStatus, setSubmitting }) => {
                        setStatus();
                        userService.makeImagePattern(this.state.patternId)
                            .then(
                                response => {
                                    // if there is a document then upload that as well with a changed name
                                    // if (document) {
                                    //     console.log("should send image too")
                                    //     userService.uploadImg(document, pattern.id)
                                    // }
                                    const { from } = this.props.location.state || { from: { pathname: "/"+response.id } };
                                    this.props.history.push(from);
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

export { PlanningPage };