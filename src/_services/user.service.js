import config from 'config';
import { authHeader, handleResponse } from '@/_helpers';
import { authenticationService } from '@/_services';

export const userService = {
    getAll,
    getUserPatterns,
    newPattern,
    getPattern,
    savePattern,
    uploadImage,
    makeImagePattern,
    pixelizeImage
};

function getAll() {
    // const requestOptions = { method: 'GET', headers: authHeader() };
    const currentUser = authenticationService.currentUserValue;
    const requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({'id': `${currentUser.id}`, 'token': `${currentUser.token}` })};
    return fetch(`${config.apiUrl}/users`, requestOptions).then(handleResponse);
}

function getUserPatterns() {
    const currentUser = authenticationService.currentUserValue;
    const requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({'id': `${currentUser.id}`, 'token': `${currentUser.token}` })};
    return fetch(`${config.apiUrl}/patterns`, requestOptions).then(handleResponse);
}

function newPattern(name, document) {
    const currentUser = authenticationService.currentUserValue;
    const formData = new FormData()
    formData.append('file', document[0])
    formData.append('name', name)
    formData.append('id', `${currentUser.id}`)
    formData.append('token', `${currentUser.token}`)
    const requestOptions = { method: 'POST', body: formData};
    console.log('newPattern', formData)
    return fetch(`${config.apiUrl}/patterns/new`, requestOptions).then(handleResponse);
}

function uploadImage(document, patternId) {
    const currentUser = authenticationService.currentUserValue;
    const formData = new FormData()
    formData.append('file', document[0])
    formData.append('id', `${currentUser.id}`)
    formData.append('token', `${currentUser.token}`)
    const requestOptions = { method: 'POST', body: formData};
    return fetch(`${config.apiUrl}/uploadimg/${patternId}`, requestOptions).then(handleResponse);
}

function getPattern(id) {
    const currentUser = authenticationService.currentUserValue;
    const requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({'id': `${currentUser.id}`, 'patternId': id, 'token': `${currentUser.token}` })};
    return fetch(`${config.apiUrl}/pattern`, requestOptions).then(handleResponse);
}


function savePattern(id, pattern) {
    const currentUser = authenticationService.currentUserValue;
    const requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({'id': `${currentUser.id}`, 'patternId': id, 'pattern':pattern, 'token': `${currentUser.token}` })};
    return fetch(`${config.apiUrl}/savePattern`, requestOptions).then(handleResponse);
}

function makeImagePattern(id) {
    const currentUser = authenticationService.currentUserValue;
    const requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({'id': `${currentUser.id}`, 'patternId': id, 'token': `${currentUser.token}` })};
    return fetch(`${config.apiUrl}/makeImagePattern`, requestOptions).then(handleResponse);
}

function pixelizeImage(id, width, height, nColors) {
    const currentUser = authenticationService.currentUserValue;
    const requestOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({'id': `${currentUser.id}`, 'patternId': id, 'token': `${currentUser.token}`, 'width':width, 'height':height, 'nColors':nColors })};
    return fetch(`${config.apiUrl}/pixelize`, requestOptions).then(handleResponse);
}